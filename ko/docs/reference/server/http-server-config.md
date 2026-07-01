---
layout: docs
lang: ko
path_key: "/docs/reference/server/http-server-config.html"
nav_active: docs
permalink: /ko/docs/reference/server/http-server-config.html
page_title: "TrueAsync\\HttpServerConfig"
description: "HttpServerConfig 전체 레퍼런스: 리스너, 워커, TLS, 타임아웃, backpressure, drain, 압축, HTTP/3 knob, 본문 스트리밍, 로깅."
---

# TrueAsync\HttpServerConfig

(PHP 8.6+, true_async_server 0.6+)

서버 구성. 모든 메서드는 fluent (`static` 반환). 객체를 `new HttpServer($config)`에 전달한 후
구성은 **고정**됩니다: 모든 setter가 `HttpServerRuntimeException`을 던집니다. 확인:
`isLocked()`.

[구성](/ko/docs/server/configuration.html) 단계별 가이드도 참고하세요.

## 생성자

### __construct

```php
public HttpServerConfig::__construct(?string $host = null, int $port = 8080)
```

선택적 매개변수 — single-listener 단축. 보통은 인수 없이 + `addListener()`를 사용합니다.

## 리스너

### addListener

```php
public HttpServerConfig::addListener(string $host, int $port, bool $tls = false): static
```

HTTP/1.1과 HTTP/2(plaintext에서 preface 감지로 h2c, TLS에서 ALPN으로 h2)를 받는 TCP 리스너.

### addHttp1Listener

```php
public HttpServerConfig::addHttp1Listener(string $host, int $port, bool $tls = false): static
```

HTTP/1.1 전용 TCP 리스너. HTTP/2 preface 연결은 llhttp로 전달되어 compliant한 400 Bad Request 후
닫힙니다.

### addHttp2Listener

```php
public HttpServerConfig::addHttp2Listener(string $host, int $port, bool $tls = false): static
```

HTTP/2 전용 리스너.

- `$tls=false`: h2c (cleartext H2). 리스너는 RFC 7540 §3.5 preface를 요구함. 그 외는
  nghttp2의 `BAD_CLIENT_MAGIC`으로 가서 compliant한 `GOAWAY(PROTOCOL_ERROR)`를 받습니다.
- `$tls=true`: 서버가 ALPN으로 `h2`만 광고합니다.

### addUnixListener

```php
public HttpServerConfig::addUnixListener(string $path): static
```

Unix 소켓 리스너 (H1 + H2, h2c 스타일).

### addHttp3Listener

```php
public HttpServerConfig::addHttp3Listener(string $host, int $port): static
```

UDP 위의 HTTP/3 / QUIC. TLS 1.3 필수 — 서버 인증서가 사용되며 별도 `$tls` 플래그는 없습니다.
확장이 `--enable-http3`로 빌드되어야 하며, 그렇지 않으면 `start()`가 예외를 던집니다.

### getListeners

```php
public HttpServerConfig::getListeners(): array
```

등록된 모든 리스너의 배열.

## 연결 한도

### setBacklog / getBacklog

```php
public HttpServerConfig::setBacklog(int $backlog): static
public HttpServerConfig::getBacklog(): int
```

소켓 backlog. 기본 128.

### setWorkers / getWorkers

```php
public HttpServerConfig::setWorkers(int $workers): static
public HttpServerConfig::getWorkers(): int
```

내장 worker pool의 크기 (issue #11).

- `1` (기본) — 단일 스레드.
- `> 1` — `start()`가 지정된 크기의 `Async\ThreadPool`을 spawn하고, config와 handler-set이
  `transfer_obj`로 복제되며, 부모는 모든 워커의 종료를 기다립니다. 각 워커는 리스너를 다시
  바인드하고 커널이 `SO_REUSEPORT`(Linux/BSD)로 accept를 분산합니다.

### setBootloader / getBootloader

```php
public HttpServerConfig::setBootloader(?\Closure $bootloader): static
public HttpServerConfig::getBootloader(): ?\Closure
```

Per-worker 시작 훅. 풀이 클로저를 한 번 deep-copy하고 task-loop 전에 각 워커에서 실행합니다 —
autoload, 커넥션 풀 워밍, opcache 사전 컴파일에 이상적입니다.

`setWorkers() > 1`일 때만 적용됩니다. bootloader의 예외는 전체 풀을 실패시킵니다.
TrueAsync ABI v0.15+ 필요.

### setMaxConnections / getMaxConnections

```php
public HttpServerConfig::setMaxConnections(int $maxConnections): static
public HttpServerConfig::getMaxConnections(): int
```

동시 연결 수의 하드 리미트. `0`은 제한 없음.

### setMaxInflightRequests / getMaxInflightRequests

```php
public HttpServerConfig::setMaxInflightRequests(int $n): static
public HttpServerConfig::getMaxInflightRequests(): int
```

Admission control: 한도에 도달하면 새 요청은 즉시 거절됩니다 — H1 → 503 + `Retry-After: 1`,
H2 → `RST_STREAM REFUSED_STREAM` (RFC 7540 §8.1.4에 따라 retry-safe). `0`은 disabled (기본).
`start()`에서 `0`이 남아 있으면 한도가 `max_connections × 10`으로 산출됩니다.

## 타임아웃

| 메서드 | 타임아웃 대상 |
|-------|----------------|
| `setReadTimeout(int)` / `getReadTimeout(): int` | 요청 수신 |
| `setWriteTimeout(int)` / `getWriteTimeout(): int` | 응답 전송 |
| `setKeepAliveTimeout(int)` / `getKeepAliveTimeout(): int` | 요청 간 idle; `0`은 keep-alive 비활성 |
| `setShutdownTimeout(int)` / `getShutdownTimeout(): int` | graceful shutdown 시 활성 요청 대기 시간 |

값은 초. `0`(적용 가능한 곳)은 비활성.

## Backpressure (CoDel)

### setBackpressureTargetMs / getBackpressureTargetMs

```php
public HttpServerConfig::setBackpressureTargetMs(int $ms): static
public HttpServerConfig::getBackpressureTargetMs(): int
```

CoDel target sojourn. per-request queue-wait가 100 ms 연속으로 임계값을 초과하면 listen 소켓이
일시 정지됩니다. 범위 0..10_000, 기본 5. `0`은 CoDel을 끕니다.

가이드:
- 빠른 핸들러(<5 ms) — 기본 5
- 일반 web — 10..20
- 느린 핸들러(DB, IO) — 50..100

## Graceful drain (Step 8)

### setMaxConnectionAgeMs / getMaxConnectionAgeMs

```php
public HttpServerConfig::setMaxConnectionAgeMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeMs(): int
```

`(age ± 10% jitter)` 수명 이후 — H1은 다음 응답에 `Connection: close`, H2는 `GOAWAY`.
gRPC `MAX_CONNECTION_AGE`와 유사. 기본 `0`(off). L4 LB 뒤 프로덕션 권장 600_000 (10 min).
`0` 또는 ≥ 1000이어야 합니다.

### setMaxConnectionAgeGraceMs / getMaxConnectionAgeGraceMs

```php
public HttpServerConfig::setMaxConnectionAgeGraceMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeGraceMs(): int
```

`Connection: close`/`GOAWAY` 이후 hard-close. `0`은 force-close 타이머 없음. non-zero ≥ 1000.

### setDrainSpreadMs / getDrainSpreadMs

```php
public HttpServerConfig::setDrainSpreadMs(int $ms): static
public HttpServerConfig::getDrainSpreadMs(): int
```

CoDel-trip / hard-cap 시 per-connection drain의 균등 분산 윈도우 (anti-thundering-herd).
HAProxy `close-spread-time`와 유사. 기본 5000, ≥ 100.

### setDrainCooldownMs / getDrainCooldownMs

```php
public HttpServerConfig::setDrainCooldownMs(int $ms): static
public HttpServerConfig::getDrainCooldownMs(): int
```

반응형 drain 트리거 사이의 최소 간격. cooldown 내의 트리거는 telemetry 카운터를 증가시킵니다.
기본 10_000, ≥ 1000.

## HTTP/2 streaming

### setStreamWriteBufferBytes / getStreamWriteBufferBytes

```php
public HttpServerConfig::setStreamWriteBufferBytes(int $bytes): static
public HttpServerConfig::getStreamWriteBufferBytes(): int
```

`HttpResponse::send()`의 backpressure에 대한 per-stream chunk-queue 한도. HTTP/2 전용.
HTTP/1 chunked는 커널 송신 버퍼를 사용합니다.

기본 262_144 (256 KiB). 범위 4_096..67_108_864 (64 MiB).

업계 기준: gRPC-Go 64 KiB, Envoy 1 MiB, Node.js 16 KiB.

### setH2StaticBudgetMax / getH2StaticBudgetMax

```php
public HttpServerConfig::setH2StaticBudgetMax(int $bytes): static
public HttpServerConfig::getH2StaticBudgetMax(): int
```

HTTP/2 static-file 본문 버퍼(read-ahead chunks + ring queue)에 대한 per-worker 한도. `0`은 auto
(`memory_limit / 8`). 명시 값은 static budget이 `memory_limit`에서 작은 여유분을 뺀 값을 넘지
않도록 clamp됩니다.

## 본문 한도

### setMaxBodySize / getMaxBodySize

```php
public HttpServerConfig::setMaxBodySize(int $bytes): static
public HttpServerConfig::getMaxBodySize(): int
```

요청 본문 최대치 (H1, H2). H1 — 413 + close; H2 — `RST_STREAM(INTERNAL_ERROR)` (연결은 다른
stream을 위해 유지).

기본 10_485_760 (10 MiB). 범위 1_024..17_179_869_184 (16 GiB).

## WebSocket {#websocket}

(true_async_server 0.9+). 가이드: [WebSocket](/ko/docs/server/websocket.html).

### setWsMaxMessageSize / getWsMaxMessageSize

```php
public HttpServerConfig::setWsMaxMessageSize(int $bytes): static
public HttpServerConfig::getWsMaxMessageSize(): int
```

재조립된 WebSocket 메시지의 최대 크기. 합산된 payload가 한도를 초과하는 프레임 집합은
RFC 6455 §7.4.1의 `1009 Message Too Big`으로 연결을 닫습니다.

기본 1_048_576 (1 MiB). 범위 128..268_435_456 (256 MiB).

### setWsMaxFrameSize / getWsMaxFrameSize

```php
public HttpServerConfig::setWsMaxFrameSize(int $bytes): static
public HttpServerConfig::getWsMaxFrameSize(): int
```

단일 프레임의 최대 payload. 클라이언트가 수백만 개의 작은 조각을 보내는 fragment-flood
공격을 방어합니다.

기본 1_048_576 (1 MiB). `setWsMaxMessageSize`와 같은 범위.

### setWsPingIntervalMs / getWsPingIntervalMs

```php
public HttpServerConfig::setWsPingIntervalMs(int $ms): static
public HttpServerConfig::getWsPingIntervalMs(): int
```

서버가 그 외에는 idle 상태인 연결에 ping을 보내는 주기. 상대는 `WsPongTimeoutMs` 내에
PONG으로 응답해야 하며, 그렇지 않으면 연결이 코드 `1001 GoingAway`로 닫힙니다.

기본 30_000 (30초). `0`은 자동 ping을 비활성화합니다.

### setWsPongTimeoutMs / getWsPongTimeoutMs

```php
public HttpServerConfig::setWsPongTimeoutMs(int $ms): static
public HttpServerConfig::getWsPongTimeoutMs(): int
```

PONG 데드라인: PING 이후 서버가 연결을 죽었다고 선언하기까지 얼마나 기다리는지.

기본 60_000 (60초). `0`은 타임아웃을 비활성화합니다.

### setWsPermessageDeflate / getWsPermessageDeflate

```php
public HttpServerConfig::setWsPermessageDeflate(bool $enabled): static
public HttpServerConfig::getWsPermessageDeflate(): bool
```

RFC 7692 permessage-deflate(메시지 단위 압축)를 활성화합니다. 기본값은 off입니다: 압축은
CPU 비용이 들고 압축 폭탄 공격 표면을 넓히기 때문에 opt-in입니다. 클라이언트가 이 확장을
제안할 때만 협상되며, 재조립된 메시지 한도는 inflate 전후 모두 확인됩니다. zlib이 포함된
빌드가 필요합니다(HTTP 압축).

## HTTP/3 knob

### setHttp3IdleTimeoutMs / getHttp3IdleTimeoutMs

```php
public HttpServerConfig::setHttp3IdleTimeoutMs(int $ms): static
public HttpServerConfig::getHttp3IdleTimeoutMs(): int
```

QUIC `max_idle_timeout` (RFC 9000 §10.1). 기본 30_000 (30 s). 범위 0..UINT32_MAX (~49일);
`0`은 "no idle timeout"을 광고합니다. 레거시 env `PHP_HTTP3_IDLE_TIMEOUT_MS`는 ops escape hatch로
여전히 동작합니다.

### setHttp3StreamWindowBytes / getHttp3StreamWindowBytes

```php
public HttpServerConfig::setHttp3StreamWindowBytes(int $bytes): static
public HttpServerConfig::getHttp3StreamWindowBytes(): int
```

Per-stream QUIC flow-control window. 셋 모두 설정: `initial_max_stream_data_bidi_local`,
`_bidi_remote`, `_uni` (h2o `http3-input-window-size` 스타일). Connection-level `initial_max_data`는
`window × max_concurrent_streams`로 산출됩니다 (nginx 패턴).

기본 262_144 (256 KiB). 범위 1_024..1_073_741_824 (1 GiB).

### setHttp3MaxConcurrentStreams / getHttp3MaxConcurrentStreams

```php
public HttpServerConfig::setHttp3MaxConcurrentStreams(int $n): static
public HttpServerConfig::getHttp3MaxConcurrentStreams(): int
```

QUIC `initial_max_streams_bidi`. nginx `http3_max_concurrent_streams`와 유사. 기본 100,
범위 1..1_000_000.

### setHttp3PeerConnectionBudget / getHttp3PeerConnectionBudget

```php
public HttpServerConfig::setHttp3PeerConnectionBudget(int $n): static
public HttpServerConfig::getHttp3PeerConnectionBudget(): int
```

per-source-IP의 동시 QUIC 연결 한도. handshake slow-loris와 amplification 방어. 기본 16,
범위 1..4_096. 레거시 env `PHP_HTTP3_PEER_BUDGET`은 listener spawn 시 여전히 override됩니다.

### setHttp3AltSvcEnabled / isHttp3AltSvcEnabled

```php
public HttpServerConfig::setHttp3AltSvcEnabled(bool $enable): static
public HttpServerConfig::isHttp3AltSvcEnabled(): bool
```

H3 listener가 켜져 있을 때 H1/H2 응답의 RFC 7838 `Alt-Svc: h3=":<port>"; ma=86400`. 기본 `true`.
phased H3 rollout에서 끄세요. 레거시 env `PHP_HTTP3_DISABLE_ALT_SVC`는 `start()`에서 honor됩니다.

## 압축

### setCompressionEnabled / isCompressionEnabled

```php
public HttpServerConfig::setCompressionEnabled(bool $enable): static
public HttpServerConfig::isCompressionEnabled(): bool
```

마스터 스위치. 기본 `true`. 확장이 `--enable-http-compression` 없이 빌드되었다면 `false`만
받아들이고, `true`는 던집니다.

### setCompressionLevel / getCompressionLevel

```php
public HttpServerConfig::setCompressionLevel(int $level): static
public HttpServerConfig::getCompressionLevel(): int
```

gzip 레벨. zlib 시맨틱: 1은 가장 빠르고 약함, 9는 느리고 강함. 기본 6.

### setBrotliLevel / getBrotliLevel

```php
public HttpServerConfig::setBrotliLevel(int $level): static
public HttpServerConfig::getBrotliLevel(): int
```

Brotli quality. 범위 0..11. 기본 4 (프로덕션 일반값; quality 11은 quality 4보다 약 50배 느리며
ratio 이득이 미미함).

확장이 `--enable-brotli` 없이 빌드되면 inert — `HAVE_HTTP_BROTLI`가 없으면 응답 파이프라인은
Brotli를 선택하지 않습니다.

### setZstdLevel / getZstdLevel

```php
public HttpServerConfig::setZstdLevel(int $level): static
public HttpServerConfig::getZstdLevel(): int
```

zstd 레벨. 범위 1..22. 기본 3 — zstd 팀의 프로덕션 기본값 (gzip-6보다 ratio가 좋고 throughput이
높음).

### setCompressionMinSize / getCompressionMinSize

```php
public HttpServerConfig::setCompressionMinSize(int $bytes): static
public HttpServerConfig::getCompressionMinSize(): int
```

본문 크기 임계값 — 이보다 작으면 압축하지 않습니다. 기본 1024 (1 KiB). 범위 0..16 MiB.

### setCompressionMimeTypes / getCompressionMimeTypes

```php
public HttpServerConfig::setCompressionMimeTypes(array $types): static
public HttpServerConfig::getCompressionMimeTypes(): array
```

압축 MIME 화이트리스트. 기본값을 **완전히 교체** (nginx `gzip_types` 시맨틱). 항목은 setter 시점에
정규화됩니다: 매개변수(`; charset=...`)는 제거, 공백 trim, 모두 소문자.

기본: `["application/javascript", "application/json", "application/xml", "image/svg+xml",
"text/css", "text/html", "text/javascript", "text/plain", "text/xml"]`.

### setRequestMaxDecompressedSize / getRequestMaxDecompressedSize

```php
public HttpServerConfig::setRequestMaxDecompressedSize(int $bytes): static
public HttpServerConfig::getRequestMaxDecompressedSize(): int
```

수신 압축 본문(`Content-Encoding: gzip/br/zstd`)의 디코딩 후 크기에 대한 anti-zip-bomb 한도.
초과 시 413. `0`은 한도 해제(명시적 — 암묵적 무한은 없음). 기본 10_485_760 (10 MiB).

### getSupportedEncodings (static)

```php
public static HttpServerConfig::getSupportedEncodings(): array
```

이 빌드에 컴파일된 코덱 목록, 서버 선호 순서. 항상 `"identity"` 포함. `--enable-http-compression`이
성공하면 `"gzip"`. configure 시점에 해당 라이브러리가 있으면 `"br"` / `"zstd"`.

## 버퍼

### setWriteBufferSize / getWriteBufferSize

```php
public HttpServerConfig::setWriteBufferSize(int $size): static
public HttpServerConfig::getWriteBufferSize(): int
```

쓰기 버퍼 크기.

## 프로토콜 옵션

| 메서드 | 용도 |
|-------|------------|
| `enableHttp2(bool)` / `isHttp2Enabled(): bool` | HTTP/2 toggle (TODO) |
| `enableWebSocket(bool)` / `isWebSocketEnabled(): bool` | WS toggle (TODO) |
| `enableProtocolDetection(bool)` / `isProtocolDetectionEnabled(): bool` | 리스너 프로토콜 자동 감지 |

> `enableWebSocket()`은 아직 구현되지 않은 별도의 toggle입니다. WebSocket 자체는 이미
> [`addWebSocketHandler()`](/ko/docs/reference/server/http-server.html#addwebsockethandler)와
> 위의 [WebSocket 섹션](#websocket)의 설정을 통해 완전히 동작합니다. 두 플래그는 서로
> 무관합니다.

## TLS

| 메서드 | 용도 |
|-------|------------|
| `enableTls(bool)` / `isTlsEnabled(): bool` | 기본 리스너의 TLS toggle |
| `setCertificate(string)` / `getCertificate(): ?string` | PEM 인증서 경로 |
| `setPrivateKey(string)` / `getPrivateKey(): ?string` | PEM 키 경로 |

## 본문 처리

### setAutoAwaitBody / isAutoAwaitBodyEnabled

```php
public HttpServerConfig::setAutoAwaitBody(bool $enable): static
public HttpServerConfig::isAutoAwaitBodyEnabled(): bool
```

`true`이면 non-multipart 요청이 핸들러 호출 전에 전체 본문을 기다립니다. multipart는 항상 스트림.
기본 `true`.

### setBodyStreamingEnabled / isBodyStreamingEnabled

```php
public HttpServerConfig::setBodyStreamingEnabled(bool $enabled): static
public HttpServerConfig::isBodyStreamingEnabled(): bool
```

`req->body`에 축적하는 대신 요청 본문을 per-request 큐로 스트림합니다 (issue #26). 핸들러는
[`HttpRequest::readBody()`](/ko/docs/reference/server/http-request.html#readbody)로 읽어야 합니다.
`getBody()`는 던집니다.

## JSON

### setJsonEncodeFlags / getJsonEncodeFlags

```php
public HttpServerConfig::setJsonEncodeFlags(int $flags): static
public HttpServerConfig::getJsonEncodeFlags(): int
```

per-call `$flags=0`(또는 생략) 시
[`HttpResponse::json()`](/ko/docs/reference/server/http-response.html#json)의 기본 `JSON_*` 플래그.

기본: `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`.

`JSON_THROW_ON_ERROR`는 조용히 제거됩니다 — encode 오류는 500 JSON 오류를 반환하며 예외는
전파되지 않습니다.

## 로깅 / 텔레메트리

### setLogSeverity / getLogSeverity

```php
public HttpServerConfig::setLogSeverity(\TrueAsync\LogSeverity $level): static
public HttpServerConfig::getLogSeverity(): \TrueAsync\LogSeverity
```

로거 severity. 기본 `OFF`. severity는 시작 시 고정 — 런타임 변경은 지원되지 않습니다
(단일 스레드 lock-free 모델). [`LogSeverity`](/ko/docs/reference/server/log-severity.html) 참고.

### setLogStream / getLogStream

```php
public HttpServerConfig::setLogStream(mixed $stream): static
public HttpServerConfig::getLogStream(): mixed
```

로거 sink. 임의의 `php_stream` (파일, `php://stderr`, `php://memory`, user wrapper). non-OFF
severity **와** stream이 **모두** 설정될 때까지 logger는 꺼져 있습니다.

### setTelemetryEnabled / isTelemetryEnabled

```php
public HttpServerConfig::setTelemetryEnabled(bool $enabled): static
public HttpServerConfig::isTelemetryEnabled(): bool
```

W3C Trace Context 파싱 — 수신된 `traceparent` / `tracestate`가 요청에 첨부되고
[`HttpRequest::getTraceParent/getTraceId/...`](/ko/docs/reference/server/http-request.html)로
접근 가능합니다.

## 상태

### isLocked

```php
public HttpServerConfig::isLocked(): bool
```

config를 `new HttpServer()`에 전달한 후 `true`. locked config는 모든 setter를
`HttpServerRuntimeException`으로 거부합니다.

## 참고

- [구성](/ko/docs/server/configuration.html) — 단계별 가이드
- [`TrueAsync\HttpServer`](/ko/docs/reference/server/http-server.html)
- [`TrueAsync\WebSocket`](/ko/docs/reference/server/websocket.html)
- [`TrueAsync\LogSeverity`](/ko/docs/reference/server/log-severity.html)
