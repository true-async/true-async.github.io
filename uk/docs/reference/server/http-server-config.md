---
layout: docs
lang: uk
path_key: "/docs/reference/server/http-server-config.html"
nav_active: docs
permalink: /uk/docs/reference/server/http-server-config.html
page_title: "TrueAsync\\HttpServerConfig"
description: "Повний довідник HttpServerConfig: listeners, workers, TLS, таймаути, backpressure, drain, стиснення, HTTP/3 knobs, body streaming, logging."
---

# TrueAsync\HttpServerConfig

(PHP 8.6+, true_async_server 0.6+)

Конфігурація сервера. Усі методи — fluent (повертають `static`). Після передачі об'єкта в
`new HttpServer($config)` конфіг **заморожується**: будь-який сетер кидає
`HttpServerRuntimeException`. Перевірити — `isLocked()`.

Див. також [Конфігурація](/uk/docs/server/configuration.html) — покроковий гайд.

## Конструктор

### __construct

```php
public HttpServerConfig::__construct(?string $host = null, int $port = 8080)
```

Необов'язкові параметри — shortcut на single-listener. Частіше використовується без аргументів плюс
`addListener()`.

## Listeners

### addListener

```php
public HttpServerConfig::addListener(string $host, int $port, bool $tls = false): static
```

TCP-listener, що приймає HTTP/1.1 і HTTP/2 (h2c через preface detection на plaintext, h2 через ALPN
на TLS).

### addHttp1Listener

```php
public HttpServerConfig::addHttp1Listener(string $host, int $port, bool $tls = false): static
```

HTTP/1.1-only TCP-listener. З'єднання з HTTP/2 preface віддається в llhttp, який емітує compliant
400 Bad Request і закривається.

### addHttp2Listener

```php
public HttpServerConfig::addHttp2Listener(string $host, int $port, bool $tls = false): static
```

HTTP/2-only listener.

- `$tls=false`: h2c (cleartext H2). Listener вимагає RFC 7540 §3.5 preface; усе інше потрапляє в
  `BAD_CLIENT_MAGIC` nghttp2 і отримує compliant `GOAWAY(PROTOCOL_ERROR)`.
- `$tls=true`: сервер анонсує через ALPN лише `h2`.

### addUnixListener

```php
public HttpServerConfig::addUnixListener(string $path): static
```

Unix-socket listener (H1 + H2, стиль h2c).

### addHttp3Listener

```php
public HttpServerConfig::addHttp3Listener(string $host, int $port): static
```

HTTP/3 / QUIC over UDP. TLS 1.3 обов'язковий — береться сертифікат сервера, окремого `$tls`-прапорця немає.
Розширення має бути зібрано з `--enable-http3`, інакше `start()` кине виняток.

### getListeners

```php
public HttpServerConfig::getListeners(): array
```

Масив усіх зареєстрованих listeners.

## Connection limits

### setBacklog / getBacklog

```php
public HttpServerConfig::setBacklog(int $backlog): static
public HttpServerConfig::getBacklog(): int
```

Socket backlog. Дефолт 128.

### setWorkers / getWorkers

```php
public HttpServerConfig::setWorkers(int $workers): static
public HttpServerConfig::getWorkers(): int
```

Розмір вбудованого worker-pool'а (issue #11).

- `1` (дефолт) — single-threaded.
- `> 1` — `start()` спавнить `Async\ThreadPool` указаного розміру, конфіг + handler-set реплікуються
  через `transfer_obj`, батько чекає завершення всіх воркерів. Кожен воркер re-bind'ить listeners;
  ядро балансує accept через `SO_REUSEPORT` (Linux/BSD).

### setBootloader / getBootloader

```php
public HttpServerConfig::setBootloader(?\Closure $bootloader): static
public HttpServerConfig::getBootloader(): ?\Closure
```

Per-worker startup hook. Пул deep-copy'ить замикання один раз і запускає в кожному воркері перед
task-loop'ом — ідеальне місце для autoload, прогріву пулів з'єднань, прекомпіляції opcache.

Застосовується лише при `setWorkers() > 1`. Виняток з bootloader фейлить увесь пул.
Потребує TrueAsync ABI v0.15+.

### setMaxConnections / getMaxConnections

```php
public HttpServerConfig::setMaxConnections(int $maxConnections): static
public HttpServerConfig::getMaxConnections(): int
```

Жорстка межа concurrent connections. `0` — без обмежень.

### setMaxInflightRequests / getMaxInflightRequests

```php
public HttpServerConfig::setMaxInflightRequests(int $n): static
public HttpServerConfig::getMaxInflightRequests(): int
```

Admission control: при досягненні ліміту нові запити отримують швидку відмову — H1 → 503 +
`Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM` (retry-safe за RFC 7540 §8.1.4). `0` — disabled
(default); якщо `0` лишається на `start()`, ліміт виводиться як `max_connections × 10`.

## Таймаути

| Метод | Що таймаутить |
|-------|---------------|
| `setReadTimeout(int)` / `getReadTimeout(): int` | приймання запиту |
| `setWriteTimeout(int)` / `getWriteTimeout(): int` | надсилання відповіді |
| `setKeepAliveTimeout(int)` / `getKeepAliveTimeout(): int` | idle між запитами; `0` — вимкнути keep-alive |
| `setShutdownTimeout(int)` / `getShutdownTimeout(): int` | скільки чекати активні запити при graceful shutdown |

Значення в секундах. `0` (де застосовно) — вимкнення.

## Backpressure (CoDel)

### setBackpressureTargetMs / getBackpressureTargetMs

```php
public HttpServerConfig::setBackpressureTargetMs(int $ms): static
public HttpServerConfig::getBackpressureTargetMs(): int
```

Target sojourn для CoDel. Коли per-request queue-wait тримається вище порогу 100 ms поспіль,
listen-сокет ставиться на паузу. Діапазон 0..10_000, дефолт 5. `0` — вимкнути CoDel.

Guidance:
- швидкі обробники (<5 ms) — дефолт 5
- типовий web — 10..20
- повільні (БД, IO) — 50..100

## Graceful drain (Step 8)

### setMaxConnectionAgeMs / getMaxConnectionAgeMs

```php
public HttpServerConfig::setMaxConnectionAgeMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeMs(): int
```

Після `(age ± 10% jitter)` lifetime — H1 наступна відповідь з `Connection: close`, H2 — `GOAWAY`.
Аналог gRPC `MAX_CONNECTION_AGE`. Дефолт `0` (off); production-рекомендація 600_000 (10 хв)
за L4 LB. Має бути `0` або ≥ 1000.

### setMaxConnectionAgeGraceMs / getMaxConnectionAgeGraceMs

```php
public HttpServerConfig::setMaxConnectionAgeGraceMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeGraceMs(): int
```

Hard-close після `Connection: close`/`GOAWAY`. `0` — без force-close таймера; non-zero ≥ 1000.

### setDrainSpreadMs / getDrainSpreadMs

```php
public HttpServerConfig::setDrainSpreadMs(int $ms): static
public HttpServerConfig::getDrainSpreadMs(): int
```

Вікно рівномірного спреду per-connection drain при CoDel-trip / hard-cap (анти-thundering-herd).
Аналог HAProxy `close-spread-time`. Дефолт 5000, ≥ 100.

### setDrainCooldownMs / getDrainCooldownMs

```php
public HttpServerConfig::setDrainCooldownMs(int $ms): static
public HttpServerConfig::getDrainCooldownMs(): int
```

Мінімальний gap між реактивними drain-тригерами. Тригери всередині cooldown інкрементять telemetry
counter. Дефолт 10_000, ≥ 1000.

## HTTP/2 streaming

### setStreamWriteBufferBytes / getStreamWriteBufferBytes

```php
public HttpServerConfig::setStreamWriteBufferBytes(int $bytes): static
public HttpServerConfig::getStreamWriteBufferBytes(): int
```

Per-stream chunk-queue cap для backpressure'а `HttpResponse::send()`. HTTP/2 only; HTTP/1 chunked
використовує kernel send-buffer.

Дефолт 262_144 (256 KiB). Діапазон 4_096..67_108_864 (64 MiB).

Industry baseline: gRPC-Go 64 KiB, Envoy 1 MiB, Node.js 16 KiB.

### setH2StaticBudgetMax / getH2StaticBudgetMax

```php
public HttpServerConfig::setH2StaticBudgetMax(int $bytes): static
public HttpServerConfig::getH2StaticBudgetMax(): int
```

Per-worker cap для HTTP/2 static-file body buffers (read-ahead chunks + ring queues). `0` — auto
(`memory_limit / 8`). Будь-яке явне значення clamps так, щоб static budget не перевищував
`memory_limit` мінус невеликий резерв.

## Body limits

### setMaxBodySize / getMaxBodySize

```php
public HttpServerConfig::setMaxBodySize(int $bytes): static
public HttpServerConfig::getMaxBodySize(): int
```

Максимум на тіло запиту (H1 і H2). H1 — 413 + close; H2 — `RST_STREAM(INTERNAL_ERROR)` (connection
лишається для інших streams).

Дефолт 10_485_760 (10 MiB). Діапазон 1_024..17_179_869_184 (16 GiB).

## WebSocket {#websocket}

(true_async_server 0.9+). Керівництво: [WebSocket](/uk/docs/server/websocket.html).

### setWsMaxMessageSize / getWsMaxMessageSize

```php
public HttpServerConfig::setWsMaxMessageSize(int $bytes): static
public HttpServerConfig::getWsMaxMessageSize(): int
```

Максимум на пересібране WebSocket-повідомлення. Фрейм(и), чий сумарний payload перевищує ліміт,
закривають з'єднання за RFC 6455 §7.4.1 `1009 Message Too Big`.

Дефолт 1_048_576 (1 MiB). Діапазон 128..268_435_456 (256 MiB).

### setWsMaxFrameSize / getWsMaxFrameSize

```php
public HttpServerConfig::setWsMaxFrameSize(int $bytes): static
public HttpServerConfig::getWsMaxFrameSize(): int
```

Максимум payload на один фрейм. Захист від fragment-flood атак, коли клієнт шле мільйони крихітних
фрагментів.

Дефолт 1_048_576 (1 MiB). Той самий діапазон, що у `setWsMaxMessageSize`.

### setWsPingIntervalMs / getWsPingIntervalMs

```php
public HttpServerConfig::setWsPingIntervalMs(int $ms): static
public HttpServerConfig::getWsPingIntervalMs(): int
```

Частота серверного PING на з'єднаннях, що простоюють. Клієнт зобов'язаний відповісти PONG протягом
`WsPongTimeoutMs`, інакше з'єднання рветься кодом `1001 GoingAway`.

Дефолт 30_000 (30 с). `0` вимикає автоматичний ping.

### setWsPongTimeoutMs / getWsPongTimeoutMs

```php
public HttpServerConfig::setWsPongTimeoutMs(int $ms): static
public HttpServerConfig::getWsPongTimeoutMs(): int
```

Дедлайн на PONG: скільки сервер чекає після PING, перш ніж вважати з'єднання мертвим.

Дефолт 60_000 (60 с). `0` вимикає таймаут.

### setWsPermessageDeflate / getWsPermessageDeflate

```php
public HttpServerConfig::setWsPermessageDeflate(bool $enabled): static
public HttpServerConfig::getWsPermessageDeflate(): bool
```

Вмикає RFC 7692 permessage-deflate (стиснення на рівні повідомлень). Вимкнено за замовчуванням,
це свідомий opt-in, бо стиснення коштує CPU і розширює поверхню атак decompression-bomb.
Узгоджується лише коли клієнт сам пропонує розширення; ліміт на пересібране повідомлення
перевіряється і до, і після inflate. Потребує збірки з zlib (HTTP-компресія).

## HTTP/3 knobs

### setHttp3IdleTimeoutMs / getHttp3IdleTimeoutMs

```php
public HttpServerConfig::setHttp3IdleTimeoutMs(int $ms): static
public HttpServerConfig::getHttp3IdleTimeoutMs(): int
```

QUIC `max_idle_timeout` (RFC 9000 §10.1). Дефолт 30_000 (30 с). Діапазон 0..UINT32_MAX (~49 днів);
`0` анонсує "no idle timeout". Legacy env `PHP_HTTP3_IDLE_TIMEOUT_MS` усе ще працює як ops
escape hatch.

### setHttp3StreamWindowBytes / getHttp3StreamWindowBytes

```php
public HttpServerConfig::setHttp3StreamWindowBytes(int $bytes): static
public HttpServerConfig::getHttp3StreamWindowBytes(): int
```

Per-stream QUIC flow-control window. Виставляє всі три: `initial_max_stream_data_bidi_local`,
`_bidi_remote`, `_uni` (стиль h2o `http3-input-window-size`). Connection-level `initial_max_data`
виводиться як `window × max_concurrent_streams` (патерн nginx).

Дефолт 262_144 (256 KiB). Діапазон 1_024..1_073_741_824 (1 GiB).

### setHttp3MaxConcurrentStreams / getHttp3MaxConcurrentStreams

```php
public HttpServerConfig::setHttp3MaxConcurrentStreams(int $n): static
public HttpServerConfig::getHttp3MaxConcurrentStreams(): int
```

QUIC `initial_max_streams_bidi`. Аналог nginx `http3_max_concurrent_streams`. Дефолт 100,
діапазон 1..1_000_000.

### setHttp3PeerConnectionBudget / getHttp3PeerConnectionBudget

```php
public HttpServerConfig::setHttp3PeerConnectionBudget(int $n): static
public HttpServerConfig::getHttp3PeerConnectionBudget(): int
```

Per-source-IP cap на concurrent QUIC connections. Захист від handshake slow-loris і amplification.
Дефолт 16, діапазон 1..4_096. Legacy env `PHP_HTTP3_PEER_BUDGET` усе ще override'ить на listener spawn.

### setHttp3AltSvcEnabled / isHttp3AltSvcEnabled

```php
public HttpServerConfig::setHttp3AltSvcEnabled(bool $enable): static
public HttpServerConfig::isHttp3AltSvcEnabled(): bool
```

RFC 7838 `Alt-Svc: h3=":<port>"; ma=86400` на H1/H2 відповідях при піднятому H3 listener. Дефолт `true`.
Вимикайте на phased H3 rollout. Legacy env `PHP_HTTP3_DISABLE_ALT_SVC` honor'иться на `start()`.

## Стиснення

### setCompressionEnabled / isCompressionEnabled

```php
public HttpServerConfig::setCompressionEnabled(bool $enable): static
public HttpServerConfig::isCompressionEnabled(): bool
```

Master switch. Дефолт `true`. Якщо розширення зібрано без `--enable-http-compression`, приймається
лише `false` — `true` кидає.

### setCompressionLevel / getCompressionLevel

```php
public HttpServerConfig::setCompressionLevel(int $level): static
public HttpServerConfig::getCompressionLevel(): int
```

gzip level. zlib-семантика: 1 — найшвидший/слабший, 9 — повільний/сильний. Дефолт 6.

### setBrotliLevel / getBrotliLevel

```php
public HttpServerConfig::setBrotliLevel(int $level): static
public HttpServerConfig::getBrotliLevel(): int
```

Brotli quality. Діапазон 0..11. Дефолт 4 (production-typical; quality 11 ≈ 50× повільніше за quality 4
з маргінальним виграшем по ratio).

Inert, якщо розширення зібрано без `--enable-brotli` — пайплайн відповіді ніколи не обере Brotli
без `HAVE_HTTP_BROTLI`, що б сюди не передали.

### setZstdLevel / getZstdLevel

```php
public HttpServerConfig::setZstdLevel(int $level): static
public HttpServerConfig::getZstdLevel(): int
```

zstd level. Діапазон 1..22. Дефолт 3 — production-default команди zstd (краще ratio за gzip-6 на
більшій throughput).

### setCompressionMinSize / getCompressionMinSize

```php
public HttpServerConfig::setCompressionMinSize(int $bytes): static
public HttpServerConfig::getCompressionMinSize(): int
```

Body-size threshold — нижче цього не стискаємо. Дефолт 1024 (1 KiB). Діапазон 0..16 MiB.

### setCompressionMimeTypes / getCompressionMimeTypes

```php
public HttpServerConfig::setCompressionMimeTypes(array $types): static
public HttpServerConfig::getCompressionMimeTypes(): array
```

MIME-whitelist для стиснення. **Повністю замінює** дефолт (nginx `gzip_types`-семантика).
Записи нормалізуються на setter: параметри (`; charset=...`) обрізаються, пробіли trim'ляться,
все в lowercase.

Дефолт: `["application/javascript", "application/json", "application/xml", "image/svg+xml",
"text/css", "text/html", "text/javascript", "text/plain", "text/xml"]`.

### setRequestMaxDecompressedSize / getRequestMaxDecompressedSize

```php
public HttpServerConfig::setRequestMaxDecompressedSize(int $bytes): static
public HttpServerConfig::getRequestMaxDecompressedSize(): int
```

Anti-zip-bomb cap на декодовані тіла (`Content-Encoding: gzip/br/zstd` inbound). При перевищенні —
413. `0` вимикає cap (явно — implicit-unlimited не передбачено). Дефолт 10_485_760 (10 MiB).

### getSupportedEncodings (static)

```php
public static HttpServerConfig::getSupportedEncodings(): array
```

Список кодеків, вкомпільованих у цю збірку, в порядку переваги сервера. Завжди містить
`"identity"`; `"gzip"` — при успішному `--enable-http-compression`; `"br"` / `"zstd"` — за наявності
відповідної бібліотеки на configure-time.

## Buffers

### setWriteBufferSize / getWriteBufferSize

```php
public HttpServerConfig::setWriteBufferSize(int $size): static
public HttpServerConfig::getWriteBufferSize(): int
```

Розмір write-buffer'а.

## Protocol options

| Метод | Призначення |
|-------|-------------|
| `enableHttp2(bool)` / `isHttp2Enabled(): bool` | toggle HTTP/2 (TODO) |
| `enableWebSocket(bool)` / `isWebSocketEnabled(): bool` | toggle WS (TODO) |
| `enableProtocolDetection(bool)` / `isProtocolDetectionEnabled(): bool` | автодетект протоколу на listener'і |

> `enableWebSocket()`: це окремий, поки не реалізований toggle. Сам WebSocket уже повністю працює
> через [`addWebSocketHandler()`](/uk/docs/reference/server/http-server.html#addwebsockethandler)
> і параметри з [розділу WebSocket](#websocket) вище, ці два прапорці один від одного не залежать.

## TLS

| Метод | Призначення |
|-------|-------------|
| `enableTls(bool)` / `isTlsEnabled(): bool` | toggle TLS на дефолтному listener'і |
| `setCertificate(string)` / `getCertificate(): ?string` | шлях до PEM-сертифіката |
| `setPrivateKey(string)` / `getPrivateKey(): ?string` | шлях до PEM-ключа |

## Body handling

### setAutoAwaitBody / isAutoAwaitBodyEnabled

```php
public HttpServerConfig::setAutoAwaitBody(bool $enable): static
public HttpServerConfig::isAutoAwaitBodyEnabled(): bool
```

Коли `true`, non-multipart запити чекають повного тіла до виклику обробника. Multipart завжди
стрім. Дефолт `true`.

### setBodyStreamingEnabled / isBodyStreamingEnabled

```php
public HttpServerConfig::setBodyStreamingEnabled(bool $enabled): static
public HttpServerConfig::isBodyStreamingEnabled(): bool
```

Стрім тіл запитів у per-request queue (issue #26) замість акумуляції в `req->body`. Обробники
мають читати через [`HttpRequest::readBody()`](/uk/docs/reference/server/http-request.html#readbody);
`getBody()` кидає.

## JSON

### setJsonEncodeFlags / getJsonEncodeFlags

```php
public HttpServerConfig::setJsonEncodeFlags(int $flags): static
public HttpServerConfig::getJsonEncodeFlags(): int
```

Дефолтні `JSON_*`-прапорці для [`HttpResponse::json()`](/uk/docs/reference/server/http-response.html#json),
коли per-call `$flags=0` (або omit).

Дефолт: `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`.

`JSON_THROW_ON_ERROR` мовчки стрипається — помилка encode дає 500 JSON-помилки, виняток не
пробрасується.

## Logging / telemetry

### setLogSeverity / getLogSeverity

```php
public HttpServerConfig::setLogSeverity(\TrueAsync\LogSeverity $level): static
public HttpServerConfig::getLogSeverity(): \TrueAsync\LogSeverity
```

Severity логера. Дефолт `OFF`. Severity фіксується на старті — runtime-зміни не підтримуються
(single-threaded lock-free модель). Див. [`LogSeverity`](/uk/docs/reference/server/log-severity.html).

### setLogStream / getLogStream

```php
public HttpServerConfig::setLogStream(mixed $stream): static
public HttpServerConfig::getLogStream(): mixed
```

Sink логера. Будь-який `php_stream` (файл, `php://stderr`, `php://memory`, user wrapper). Логер
вимкнено, поки не виставлені **обидва**: non-OFF severity І stream.

### setTelemetryEnabled / isTelemetryEnabled

```php
public HttpServerConfig::setTelemetryEnabled(bool $enabled): static
public HttpServerConfig::isTelemetryEnabled(): bool
```

Парсинг W3C Trace Context — вхідні `traceparent` / `tracestate` прикріплюються до request'у,
доступні через [`HttpRequest::getTraceParent/getTraceId/...`](/uk/docs/reference/server/http-request.html).

## State

### isLocked

```php
public HttpServerConfig::isLocked(): bool
```

`true` після передачі конфіга в `new HttpServer()`. Locked-конфіг відкидає всі сетери з
`HttpServerRuntimeException`.

## Див. також

- [Конфігурація](/uk/docs/server/configuration.html) — покроковий гайд
- [`TrueAsync\HttpServer`](/uk/docs/reference/server/http-server.html)
- [`TrueAsync\WebSocket`](/uk/docs/reference/server/websocket.html)
- [`TrueAsync\LogSeverity`](/uk/docs/reference/server/log-severity.html)
