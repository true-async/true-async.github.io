---
layout: docs
lang: ko
path_key: "/docs/server/configuration.html"
nav_active: docs
permalink: /ko/docs/server/configuration.html
page_title: "TrueAsync Server: 구성"
description: "HttpServerConfig: 리스너, TLS, 타임아웃, backpressure, 본문 한도, 본문 스트리밍, JSON 플래그, 로깅, HTTP/3."
---

# TrueAsync Server 구성

(PHP 8.6+, true_async_server 0.6+)

서버의 모든 구성은 `new HttpServer($config)` 호출 전에
[`TrueAsync\HttpServerConfig`](/ko/docs/reference/server/http-server-config.html) 객체를 통해
정의합니다. `HttpServer`가 생성된 후 구성은 **고정**됩니다: 이후의 모든 setter는
`HttpServerRuntimeException`을 던집니다.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->addListener('0.0.0.0', 8443, tls: true)
    ->addHttp3Listener('0.0.0.0', 8443)
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key')
    ->setWorkers(4)
    ->setKeepAliveTimeout(60)
    ->setMaxBodySize(50 * 1024 * 1024)
    ->setCompressionEnabled(true)
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);

$server = new HttpServer($config);
```

setter는 `static`을 반환하므로 체인으로 구성할 수 있습니다.

## 리스너

서버는 임의 개수의 TCP/Unix 소켓과 UDP 포트(HTTP/3용)를 동시에 수신할 수 있습니다.

| 메서드 | 동작 |
|-------|------------|
| `addListener($host, $port, $tls = false)` | TCP, HTTP/1.1 + HTTP/2 (plaintext에서 preface로 h2c, TLS에서 ALPN으로 h2) |
| `addHttp1Listener($host, $port, $tls = false)` | TCP, HTTP/1.1만. HTTP/2 preface 클라이언트는 400을 받음 |
| `addHttp2Listener($host, $port, $tls = false)` | TCP, HTTP/2만. TLS 없이는 preface가 필수인 h2c |
| `addHttp3Listener($host, $port)` | UDP, HTTP/3 / QUIC. TLS 1.3이 자동 활성화되고 서버 인증서가 사용됨 |
| `addUnixListener($path)` | Unix 소켓, HTTP/1.1 + HTTP/2 (h2c 스타일) |

```php
$config
    ->addListener('0.0.0.0', 80)              // H1 + H2c
    ->addListener('0.0.0.0', 443, tls: true)  // H1 + H2 over TLS
    ->addHttp3Listener('0.0.0.0', 443);       // 같은 포트의 H3 / QUIC
```

HTTP/3의 phased rollout을 위해 `Alt-Svc` 광고를 잠시 끌 수 있습니다.

```php
$config->setHttp3AltSvcEnabled(false);
```

## TLS

```php
$config
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key');
```

인증서와 키는 모든 TLS 리스너(HTTP/3 포함)에 공통입니다. TLS 1.2/1.3, ALPN, 약한 cipher 비활성화,
stateless session tickets, safe renegotiation은 꺼져 있습니다.

## Workers와 bootloader

`setWorkers(1)`(기본값)은 단일 스레드 모드를 활성화합니다: `start()`가 호출 스레드에서
event-loop를 돌립니다.

`setWorkers(N > 1)`은 `Async\ThreadPool`을 통해 N개의 스레드로 구성된 내장 풀을 띄웁니다.
각 워커는 같은 리스너에 다시 바인드되며, 커널(Linux/BSD)이 `SO_REUSEPORT`로 accept를 분산합니다.
부모의 `start()`는 모든 워커가 끝날 때까지 대기합니다.

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // task loop 전에 각 워커에서 한 번 실행
        require __DIR__ . '/vendor/autoload.php';
        Database::warmupPool();
        OpcacheWarm::compile();
    });
```

자세한 내용: [Multi-worker](/ko/docs/server/workers.html).

## 타임아웃

| 메서드 | 기본값 | 타임아웃 대상 |
|-------|--------------|----------------|
| `setReadTimeout($sec)` | — | 요청 전체 수신 |
| `setWriteTimeout($sec)` | — | 응답 전송 |
| `setKeepAliveTimeout($sec)` | — | 요청 간 idle; `0`은 keep-alive 비활성화 |
| `setShutdownTimeout($sec)` | — | graceful shutdown: 활성 요청을 얼마나 기다릴지 |

## 한도와 backpressure

```php
$config
    ->setBacklog(1024)
    ->setMaxConnections(50_000)
    ->setMaxInflightRequests(10_000)
    ->setMaxBodySize(10 * 1024 * 1024)
    ->setBackpressureTargetMs(10);
```

- **`setMaxConnections($n)`** — TCP 연결 수의 하드 리미트. `0`은 제한 해제.
- **`setMaxInflightRequests($n)`** — admission control: 활성 핸들러 수가 이 값을 넘으면 새 요청은
  빠르게 거절됩니다. H1 → 503 + `Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM`
  (RFC 7540 §8.1.4에 따라 retry-safe). H2에서는 연결 수에 대한 하드 리미트가 도움이 되지 않는데,
  이미 받아들인 연결에 새 stream이 도착하기 때문입니다. `0`은 `max_connections × 10`을 가져옵니다.
- **`setMaxBodySize($bytes)`** — 요청 본문 최대치. 기본 10 MiB, 범위 1 KiB..16 GiB.
  H1은 413을 반환하고 연결을 닫음. H2는 `RST_STREAM(INTERNAL_ERROR)`를 보냄.
- **`setBackpressureTargetMs($ms)`** — accept-side backpressure를 위한 CoDel sojourn 임계값.
  per-request queue-wait가 100 ms 연속으로 임계값을 초과하면 listen 소켓이 일시 정지됩니다.
  `0`은 CoDel을 끕니다. 기본 5 ms; 일반 web은 10–20 ms; 느린 핸들러(DB, IO)는 50–100 ms.

### Graceful drain (Step 8)

L4 밸런서 뒤에서 부하 마이그레이션 제어:

| 메서드 | 기본 | 용도 |
|-------|--------|------------|
| `setMaxConnectionAgeMs($ms)` | 0 (off) | 한도 ±10% jitter 이후 연결에 Connection: close (H1) 또는 GOAWAY (H2)를 부여. gRPC `MAX_CONNECTION_AGE`와 유사. 프로덕션: 600_000 (10 min). |
| `setMaxConnectionAgeGraceMs($ms)` | 0 | `Connection: close`/GOAWAY 이후 hard-close. `0`은 force-close 타이머를 끔. |
| `setDrainSpreadMs($ms)` | 5000 | CoDel trip / hard-cap 시 per-connection drain을 균등하게 분산하는 윈도우 (thundering herd 방지). |
| `setDrainCooldownMs($ms)` | 10_000 | 반응형 drain 트리거 사이의 최소 간격. |

## HTTP/2 streaming 한도

```php
$config
    ->setStreamWriteBufferBytes(256 * 1024)  // per stream 256 KiB, 4 KiB .. 64 MiB
    ->setH2StaticBudgetMax(0);               // 0 = auto (memory_limit / 8)
```

`HttpResponse::send($chunk)`는 backpressure 상태에서 **만** 핸들러 코루틴을 블로킹합니다:
per-stream staging buffer가 가득 찼을 때입니다. 기본 256 KiB (참고: gRPC-Go 64 KiB, Envoy 1 MiB,
Node.js 16 KiB).

## HTTP/3 production knobs

```php
$config
    ->setHttp3IdleTimeoutMs(30_000)           // RFC 9000 §10.1
    ->setHttp3StreamWindowBytes(256 * 1024)   // per-stream flow control
    ->setHttp3MaxConcurrentStreams(100)       // initial_max_streams_bidi
    ->setHttp3PeerConnectionBudget(16)        // per-source-IP cap, slow-loris 방어
    ->setHttp3AltSvcEnabled(true);            // RFC 7838 Alt-Svc 광고
```

Connection-level `initial_max_data`는 `window × max_concurrent_streams`로 산출됩니다 (nginx 패턴).

## WebSocket

```php
$config
    ->setWsMaxMessageSize(1024 * 1024)   // 1 MiB, 128 .. 256 MiB
    ->setWsMaxFrameSize(1024 * 1024)     // 1 MiB, 같은 범위
    ->setWsPingIntervalMs(30_000)        // idle 상태의 keepalive PING
    ->setWsPongTimeoutMs(60_000)         // PONG 응답 데드라인
    ->setWsPermessageDeflate(false);     // RFC 7692, 기본값 off
```

- **`setWsMaxMessageSize($bytes)`** — 재조립된 메시지의 최대 크기. 초과하면
  `1009 Message Too Big`이 발생하고 연결이 닫힙니다(RFC 6455 §7.4.1).
- **`setWsMaxFrameSize($bytes)`** — 단일 프레임의 최대 크기. 클라이언트가 수백만 개의 작은
  조각을 보내는 fragment-flood를 방어합니다.
- **`setWsPingIntervalMs($ms)`** — 서버가 idle 연결에 자체적으로 ping을 보내는 주기. `0`은
  자동 ping을 비활성화합니다.
- **`setWsPongTimeoutMs($ms)`** — PING 이후 PONG을 얼마나 기다릴지, 그 이후에는 연결을
  죽었다고 판단하고 코드 `1001 GoingAway`로 닫습니다. `0`은 타임아웃을 비활성화합니다.
- **`setWsPermessageDeflate($bool)`** — RFC 7692, 메시지 단위 압축. 기본값은 off입니다:
  압축은 CPU 비용이 들고 압축 폭탄 공격 표면을 넓히기 때문에 의도적인 opt-in입니다.
  클라이언트가 이 확장을 직접 제안할 때만 협상되며, zlib이 포함된 빌드가 필요합니다.

연결 API 자체는 [WebSocket 가이드](/ko/docs/server/websocket.html)와
[레퍼런스](/ko/docs/reference/server/websocket.html)를 참고하세요.

## Body streaming

요청 본문의 pull 기반 스트림을 활성화합니다 (issue #26): H1/H2 파서가 chunk를 큐에 넣고,
핸들러는 [`HttpRequest::readBody()`](/ko/docs/reference/server/http-request.html#readbody)로
이를 읽으며 전체 본문을 RAM에 보관하지 않습니다.

```php
$config->setBodyStreamingEnabled(true);

$server->addHttpHandler(function ($req, $res) {
    while (($chunk = $req->readBody()) !== null) {
        // chunk 처리 (예: 디스크로 스트리밍 기록, 파싱)
    }
    $res->setStatusCode(204);
});
```

`setBodyStreamingEnabled(true)` 없이는 핸들러가 `getBody()`로 이미 완전히 읽힌 본문을 받습니다.
이 모드에서는 `readBody()`를 사용할 수 없습니다.

50개의 동시 20 MiB POST 비교 (h2load, WSL2): peak RSS가 1170 MiB → **197 MiB**로 떨어지고(×6),
처리량은 36 req/s → **100 req/s** (×2.7) — 핸들러 dispatch가 더 이상 전체 본문을 기다리지
않기 때문입니다.

[스트리밍](/ko/docs/server/streaming.html)도 참고.

## Auto-await body

```php
$config->setAutoAwaitBody(true);   // 기본: true
```

활성화되면 non-multipart 요청은 핸들러 호출 전에 전체 본문을 기다립니다(multipart는 항상 스트림).
본문을 통째로 처리하는 고전적 방식에 유용합니다.

## JSON

```php
$config->setJsonEncodeFlags(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

이 플래그는 호출자가 `$flags`를 명시하지 않은 경우
[`HttpResponse::json()`](/ko/docs/reference/server/http-response.html#json)에 적용됩니다.
`JSON_THROW_ON_ERROR`는 조용히 제거됩니다. 인코딩 오류는 JSON 본문이 있는 500을 반환하며,
예외가 핸들러로 전파되지 않습니다.

## 로깅

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);   // 임의의 php_stream: 파일, php://stderr, php://memory, 사용자 wrapper
```

로거는 기본적으로 꺼져 있습니다 (`LogSeverity::OFF`). severity는 시작 시 고정되며 런타임
변경은 지원되지 않습니다 (단일 스레드 lock-free 모델).

레벨 (OpenTelemetry SeverityNumber):

| 레벨 | 무엇이 기록되는가 |
|---------|--------------|
| `OFF` (0) | 없음 |
| `DEBUG` (5) | H3 패킷 등의 트레이싱 |
| `INFO` (9) | 서버 lifecycle (start/stop), bind retries |
| `WARN` (13) | TLS handshake 실패, peer reset, 흡수된 예외 |
| `ERROR` (17) | listener bind 실패, 하드한 프로토콜 오류 |

`FATAL`은 의도적으로 없습니다: 이미 프로세스를 종료시키는 `zend_error_noreturn(E_ERROR)`로
처리됩니다.

## 텔레메트리 (W3C Trace Context)

```php
$config->setTelemetryEnabled(true);
```

활성화되면 들어오는 `traceparent` / `tracestate`가 파싱되어 요청에 첨부됩니다.
핸들러에서 다음에 접근할 수 있습니다.

```php
$req->getTraceParent();   // raw header
$req->getTraceState();
$req->getTraceId();       // 32 lower-hex chars
$req->getSpanId();        // 16 lower-hex chars
$req->getTraceFlags();    // int (0x01 = sampled)
```

## 전체 레퍼런스

[`TrueAsync\HttpServerConfig`](/ko/docs/reference/server/http-server-config.html) 참고:
60개 이상의 모든 메서드와 상세 설명, 유효한 값 범위.
