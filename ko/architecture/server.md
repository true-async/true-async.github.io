---
layout: architecture
lang: ko
path_key: "/architecture/server.html"
nav_active: architecture
permalink: /ko/architecture/server.html
page_title: "TrueAsync Server 아키텍처"
description: "TrueAsync Server 내부: 단일 스레드 event loop, zero-copy, CoDel, bailout 방화벽, SO_REUSEPORT를 통한 multi-worker."
---

# TrueAsync Server 아키텍처

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server는 PHP 프로세스의 주소 공간 안에서 직접 HTTP 서버를 돌리는 네이티브 PHP 확장(C)입니다.
아키텍처상 **단일 스레드 event loop**이며, 동일 프로세스 내 수평 확장을 위한 선택적
**복제된 worker pool**을 갖춥니다.

## 큰 그림

```
            ┌────────────────────────────────────────────────────────────┐
            │                       PHP 프로세스                         │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop 스레드 #0                  │ │
            │   │                                                      │ │
            │   │   libuv ──► accept ──► parse ──► dispatch ──► send   │ │
            │   │     ▲                                ▼                │ │
            │   │     │     ┌──── PHP 핸들러 (코루틴) ────────┐         │ │
            │   │     │     │  user code, DB, HTTP-클라이언트, … │       │ │
            │   │     │     └─────────────┬───────────────────┘        │ │
            │   │     └──────── yield ────┘                            │ │
            │   └──────────────────────────────────────────────────────┘ │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop 스레드 #1 …N-1             │ │
            │   │   (setWorkers(N>1) 시, SO_REUSEPORT)                 │ │
            │   └──────────────────────────────────────────────────────┘ │
            └────────────────────────────────────────────────────────────┘
```

하나의 스레드가 accept부터 최종 send까지 연결과 요청을 모두 소유합니다. accept→worker handoff
없음, per-request fork/cleanup 없음, 전역 락 없음. 핸들러가 I/O(DB, HTTP, 파일)를 기다려야 하면
코루틴이 event-loop에 양보하고, event-loop는 즉시 다음 준비된 이벤트를 처리합니다.

## 레이어

### 1. Reactor: libuv

기본 I/O 레이어: [TrueAsync ABI](/ko/architecture/zend-async-api.html)를 통한 libuv.
TCP accept, UDP recvmmsg, 파일 연산, 타이머, sigwait — 모두 동일한 `zend_async_event_t`
인터페이스를 통해 동작합니다. reactor가 epoll/kqueue/IOCP를 알고, 서버는 모릅니다.

핵심 확장 API:

- `zend_async_io_*` — 소켓과 파일의 non-blocking read/write.
- `zend_async_io_sendfile_t` — `uv_fs_sendfile` (Linux/BSD `sendfile`, Windows `TransmitFile`).
- `zend_async_fs_open_t` — libuv thread pool을 통한 비동기 `open(2)`.
- HTTP/3 / QUIC을 위한 `udp_bind`.

### 2. 프로토콜 파서

- **HTTP/1.1**: vendored [`llhttp`](https://github.com/nodejs/llhttp) 9.3.0 (Node.js와 동일한 파서).
- **HTTP/2**: `libnghttp2` ≥ 1.57 (CVE-2023-44487 rapid-reset 대응 floor).
- **HTTP/3 / QUIC**: `libngtcp2` + `libnghttp3`, OpenSSL 3.5 QUIC TLS API (백엔드 `libngtcp2_crypto_ossl`).

단일 TCP 소켓 위에서의 프로토콜 감지:

- plaintext: preface `PRI * HTTP/2.0\r\n...\r\n` → HTTP/2 (h2c), 아니면 → llhttp.
- TLS: handshake에서 ALPN 협상.

`HttpServer::addListener()`는 multi-protocol 리스너를 띄웁니다. 프로토콜 제한이 있는 포트에는
`addHttp1Listener` / `addHttp2Listener` / `addHttp3Listener`를 사용하세요.

### 3. Connection arena

`http_connection_t` — per-connection 상태 (768 B). slab pool에 저장됩니다:
`CONN_ARENA_CHUNK_SLOTS`(256)개 단위의 청크. live/free는 bitmap으로 추적됩니다. 청크는 절대
shrink되지 않아 할당 없이 hot arena hit를 제공합니다.

[`HttpServer::getRuntimeStats()`](/ko/docs/reference/server/http-server.html#getruntimestats)로
볼 수 있습니다: `conn_arena_live`, `conn_arena_slots`, `conn_arena_chunks`, `conn_arena_bytes`.

### 4. Body pool

큰 request-body 버퍼(≥ 1 MB)를 위한 per-thread LIFO. 이 클래스의 본문은 `zend_mm`으로
할당되지만, 할당자가 아니라 per-size-class LIFO에 **반환**됩니다. 같은 size class의 다음 요청은
슬롯을 재사용하며 `mmap`/`munmap` 트래픽이 없고, upload-heavy 부하에서 multi-worker scaling을
잠식하던 `mmap_lock` 경쟁도 없습니다.

벤치 (W=8, c=128, 2 MiB POST body): 1500 RPS / 370% CPU → **3300 RPS / 720% CPU** (×2.2 throughput;
이제 CPU가 워커와 함께 실제로 스케일됨).

`HttpServer::stop()`과 RSHUTDOWN에서 드레인됩니다. debug 빌드에서는 zend_mm leak detector가
모듈 unload 시 clean slate를 봅니다.

### 5. 코루틴 통합

수신된 각 요청은 `ZEND_ASYNC_NEW_COROUTINE`을 통해 새 코루틴을 spawn합니다.
코루틴은 서버 scope의 자식인 **요청별 scope**에서 실행됩니다. 두 가지 효과가 있습니다.

- `Async\request_context()`는 요청의 코루틴 서브트리 전체에 공유되는 컨텍스트로 resolve됩니다.
- `Async\current_context()`는 여전히 per-coroutine.

요청 cancel(핸들러 코루틴 cancel → 4xx 파서 한도, 스트림의 peer reset, drain 타임아웃)은 일반적인
`AsyncCancellation` 체인을 통해 전파됩니다. `TrueAsync\HttpException extends AsyncCancellation`이
HTTP 상태를 운반하여 dispatcher가 클라이언트에 무엇을 응답할지 알 수 있게 합니다.

### 6. Multi-worker (선택)

`HttpServerConfig::setWorkers(N > 1)`:

1. 부모가 크기 N의 `Async\ThreadPool`을 spawn합니다.
2. 구성과 handler set이 `transfer_obj`로 각 워커에 복사됩니다 (클로저 op_array를 포함한 전체 그래프
   deep copy; [Thread snapshot](/ko/architecture/zend-async-api.html) 참고).
3. 워커가 `SO_REUSEPORT`로 같은 리스너에 re-bind합니다.
4. 커널(Linux/BSD)이 같은 reuse-port 그룹의 소켓에 accept를 균등 분산합니다.
5. 부모의 `start()`는 모든 워커의 종료를 기다립니다.

각 워커는 독립적인 event-loop, opcache, allocator를 가집니다. 공유 상태 없음, 락 없음.
Bootloader(지정되었다면)는 task-loop 전에 각 워커에서 한 번 실행됩니다.

## CoDel backpressure

서버는 [CoDel](https://datatracker.ietf.org/doc/html/rfc8289), sojourn 시간 기반 적응형
backpressure를 구현합니다.

- 각 요청은 enqueue → dequeue 타임스탬프로 표시됩니다.
- sojourn(queue-wait)이 **연속 100 ms 동안** `setBackpressureTargetMs()`(기본 5 ms) 위로 유지되면
  listen 소켓이 일시 정지됩니다.
- sojourn이 다시 떨어지면 listen이 재개됩니다.

엄격한 `max_connections`와 달리 CoDel은 단순한 동시 연결 수가 아니라 **파이프라인의 실제 부하**를
추적합니다. 하나의 연결이 임의의 stream을 갖는 HTTP/2에서 특히 중요합니다.

CoDel은 opt-in 워크로드를 위해 기본 비활성입니다: 0.3.0 이후 짧은 빠른 stream이 연결을
"overloaded"로 밀어 무관한 long-lived stream을 멈추게 했던 잘못된 muxed-h2 트리거 상황 때문에
보수적인 기본값이 선택되었습니다.

## Bailout 방화벽

user handler의 PHP fatal 오류(E_ERROR, OOM, shutdown 시의 잡히지 않은 예외)는 **서버를 죽이지
않습니다**. 각 프로토콜 entry point(H1, H2, H3)는 핸들러 호출을 bailout-fence로 감싸며:

1. 실패한 코루틴을 드레인합니다.
2. 클라이언트에 500을 emit합니다 (헤더가 아직 전송되지 않은 경우).
3. 리스너에 제어를 반환하면 — accept가 계속됩니다.

진단: 실패 경로에서 서버가 C 스택(`<execinfo.h>`이 있는 경우; `HAVE_EXECINFO_H`로 gate됨)과
PHP 수준 `zend_error`를 로깅합니다. musl / Windows에서는 C-frame dump가 조용히 생략됩니다.

Tracing-JIT에서 발생한 초기 bailout 버그 중 하나의 사례는 저장소의
[`docs/118-tracing-jit-stale-fp-spill.md`](https://github.com/true-async/server/tree/main/docs)를
참고하세요.

## Connection draining (Step 8)

서버는 두 가지 drain 모델을 구현합니다.

### Proactive: `setMaxConnectionAgeMs()`

`(age ± 10% jitter)` 수명 후 연결이 신호를 받습니다.

- H1: 다음 응답에 `Connection: close`.
- H2: `GOAWAY` emit.

gRPC `MAX_CONNECTION_AGE`와 유사. L4 LB 뒤에서 한 워커에 "달라붙은" long-lived 연결로부터
보호합니다.

### Reactive: CoDel trip / hard-cap transition

서버가 과부하에 들어가면(CoDel paused 또는 `max_connections` 도달), per-connection drain effect가
`setDrainSpreadMs()` 윈도우에 분산됩니다(HAProxy `close-spread-time` 유사). 클라이언트가 thundering
herd로 재연결하지 않도록 하기 위함입니다.

트리거 사이의 최소 간격은 `setDrainCooldownMs()`(기본 10 s)로 설정됩니다.

## Zero-copy hot path

- **H2 over TLS hybrid emit** (0.6.2): 작은 응답은 DRAIN 경로(mem_send + `BIO_write`,
  gather 할당 없음)로, 2 KiB 초과 본문 또는 스트리밍은 GATHER 경로(NO_COPY ref + 하나의
  `SSL_write_ex`)로 갑니다. 벤치: h2load 매트릭스의 best-of-three.
- **정적 small-file fast path** (≤ 64 KiB): 파일을 `zend_string`으로 slurp하고 단일
  `writev(headers + body)`로 전송. 64 KiB 초과 파일은 sendfile 사용.
- 정적 파일을 위한 **인라인 `open`/`fstat`**: warm dentry cache에서 libuv thread pool을 통한
  futex 왕복 없음.

## 메모리 모델

서버는 RAM footprint를 의도적으로 최소화합니다.

- **비대칭 TLS BIO ring 크기** (0.6.0): CT-in 17 KiB, PT-app back-channel 17 KiB, 나머지는 변경
  없음. TLS 연결당 약 62 KiB 절약.
- **Body pool** (위 참고): 큰 본문 재사용.
- **스트리밍 요청 본문**: 50 동시 20 MiB POST의 peak RSS가 1170 MiB → **197 MiB**.
- **정적 TSRMLS 캐시** (ext/async 0.7.0): `-DZEND_ENABLE_STATIC_TSRMLS_CACHE=1`이 `EG()` / `ASYNC_G()`를
  `pthread_getspecific` 대신 단일 `__thread` 로드로 만듭니다. 최소 HTTP 핸들러에서 +32% RPS.

## RFC 준수

- HTTP/1.1: 완전 RFC 9112 (0.6.3부터 `Connection: close` → reply mirror per §9.6).
- HTTP/2: RFC 9113, CVE-2023-44487에 대한 rapid-reset mitigation.
- HTTP/3: RFC 9114, connection ID 회전과 amplification limits를 포함한 QUIC RFC 9000.
- TLS: TLS 1.2/1.3만, OpenSSL 3.x. HTTP/3에는 OpenSSL 3.5+ 필요.
- WebSocket / SSE / gRPC: 예정.

## 참고

- [TrueAsync ABI](/ko/architecture/zend-async-api.html)
- [Scheduler와 Reactor](/ko/architecture/scheduler-reactor.html)
- [서버 구성](/ko/docs/server/configuration.html)
- [Multi-worker](/ko/docs/server/workers.html)
