---
layout: docs
lang: ru
path_key: "/docs/reference/server/http-server-config.html"
nav_active: docs
permalink: /ru/docs/reference/server/http-server-config.html
page_title: "TrueAsync\\HttpServerConfig"
description: "Полный справочник HttpServerConfig: listeners, workers, TLS, таймауты, backpressure, drain, компрессия, HTTP/3 knobs, body streaming, logging."
---

# TrueAsync\HttpServerConfig

(PHP 8.6+, true_async_server 0.6+)

Конфигурация сервера. Все методы — fluent (возвращают `static`). После передачи объекта в
`new HttpServer($config)` конфиг **замораживается**: любой сеттер бросает
`HttpServerRuntimeException`. Проверить — `isLocked()`.

См. также [Конфигурация](/ru/docs/server/configuration.html) — пошаговый гид.

## Конструктор

### __construct

```php
public HttpServerConfig::__construct(?string $host = null, int $port = 8080)
```

Опциональные параметры — shortcut на single-listener. Чаще используется без аргументов плюс
`addListener()`.

## Listeners

### addListener

```php
public HttpServerConfig::addListener(string $host, int $port, bool $tls = false): static
```

TCP-listener, принимающий HTTP/1.1 и HTTP/2 (h2c через preface detection на plaintext, h2 через ALPN
на TLS).

### addHttp1Listener

```php
public HttpServerConfig::addHttp1Listener(string $host, int $port, bool $tls = false): static
```

HTTP/1.1-only TCP-listener. Соединение с HTTP/2 preface отдаётся в llhttp, который эмитит compliant
400 Bad Request и закрывается.

### addHttp2Listener

```php
public HttpServerConfig::addHttp2Listener(string $host, int $port, bool $tls = false): static
```

HTTP/2-only listener.

- `$tls=false`: h2c (cleartext H2). Listener требует RFC 7540 §3.5 preface; всё остальное идёт в
  `BAD_CLIENT_MAGIC` nghttp2 и получает compliant `GOAWAY(PROTOCOL_ERROR)`.
- `$tls=true`: сервер анонсирует через ALPN только `h2`.

### addUnixListener

```php
public HttpServerConfig::addUnixListener(string $path): static
```

Unix-socket listener (H1 + H2, стиль h2c).

### addHttp3Listener

```php
public HttpServerConfig::addHttp3Listener(string $host, int $port): static
```

HTTP/3 / QUIC over UDP. TLS 1.3 обязателен — берётся сертификат сервера, отдельного `$tls`-флага нет.
Расширение должно быть собрано с `--enable-http3`, иначе `start()` бросит исключение.

### getListeners

```php
public HttpServerConfig::getListeners(): array
```

Массив всех зарегистрированных listeners.

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

Размер встроенного worker-pool'а (issue #11).

- `1` (дефолт) — single-threaded.
- `> 1` — `start()` спавнит `Async\ThreadPool` указанного размера, конфиг + handler-set реплицируются
  через `transfer_obj`, родитель ждёт завершения всех воркеров. Каждый воркер re-bind'ит listeners;
  ядро балансирует accept через `SO_REUSEPORT` (Linux/BSD).

### setBootloader / getBootloader

```php
public HttpServerConfig::setBootloader(?\Closure $bootloader): static
public HttpServerConfig::getBootloader(): ?\Closure
```

Per-worker startup hook. Пул deep-copy'ит замыкание один раз и запускает на каждом воркере перед
task-loop'ом — идеальное место для autoload, прогрева пулов соединений, прекомпиляции opcache.

Применяется только при `setWorkers() > 1`. Исключение из bootloader фейлит весь пул.
Требует TrueAsync ABI v0.15+.

### setMaxConnections / getMaxConnections

```php
public HttpServerConfig::setMaxConnections(int $maxConnections): static
public HttpServerConfig::getMaxConnections(): int
```

Жёсткий предел concurrent connections. `0` — без ограничения.

### setMaxInflightRequests / getMaxInflightRequests

```php
public HttpServerConfig::setMaxInflightRequests(int $n): static
public HttpServerConfig::getMaxInflightRequests(): int
```

Admission control: при достижении лимита новые запросы получают быстрый отказ — H1 → 503 +
`Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM` (retry-safe по RFC 7540 §8.1.4). `0` — disabled
(default); если `0` остаётся на `start()`, лимит выводится как `max_connections × 10`.

## Таймауты

| Метод | Что таймаутит |
|-------|----------------|
| `setReadTimeout(int)` / `getReadTimeout(): int` | приём запроса |
| `setWriteTimeout(int)` / `getWriteTimeout(): int` | отправка ответа |
| `setKeepAliveTimeout(int)` / `getKeepAliveTimeout(): int` | idle между запросами; `0` — выключить keep-alive |
| `setShutdownTimeout(int)` / `getShutdownTimeout(): int` | сколько ждать активные запросы при graceful shutdown |

Значения в секундах. `0` (где применимо) — отключение.

## Backpressure (CoDel)

### setBackpressureTargetMs / getBackpressureTargetMs

```php
public HttpServerConfig::setBackpressureTargetMs(int $ms): static
public HttpServerConfig::getBackpressureTargetMs(): int
```

Target sojourn для CoDel. Когда per-request queue-wait держится выше порога 100 ms подряд,
listen-сокет ставится на паузу. Диапазон 0..10_000, дефолт 5. `0` — выключить CoDel.

Guidance:
- быстрые обработчики (<5 ms) — дефолт 5
- типичный web — 10..20
- медленные (БД, IO) — 50..100

## Graceful drain (Step 8)

### setMaxConnectionAgeMs / getMaxConnectionAgeMs

```php
public HttpServerConfig::setMaxConnectionAgeMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeMs(): int
```

После `(age ± 10% jitter)` lifetime — H1 следующий ответ с `Connection: close`, H2 — `GOAWAY`.
Аналог gRPC `MAX_CONNECTION_AGE`. Дефолт `0` (off); production-рекомендация 600_000 (10 min)
за L4 LB. Должно быть `0` или ≥ 1000.

### setMaxConnectionAgeGraceMs / getMaxConnectionAgeGraceMs

```php
public HttpServerConfig::setMaxConnectionAgeGraceMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeGraceMs(): int
```

Hard-close после `Connection: close`/`GOAWAY`. `0` — без force-close таймера; non-zero ≥ 1000.

### setDrainSpreadMs / getDrainSpreadMs

```php
public HttpServerConfig::setDrainSpreadMs(int $ms): static
public HttpServerConfig::getDrainSpreadMs(): int
```

Окно равномерного спреда per-connection drain при CoDel-trip / hard-cap (анти-thundering-herd).
Аналог HAProxy `close-spread-time`. Дефолт 5000, ≥ 100.

### setDrainCooldownMs / getDrainCooldownMs

```php
public HttpServerConfig::setDrainCooldownMs(int $ms): static
public HttpServerConfig::getDrainCooldownMs(): int
```

Минимальный gap между реактивными drain-триггерами. Триггеры внутри cooldown инкрементят telemetry
counter. Дефолт 10_000, ≥ 1000.

## HTTP/2 streaming

### setStreamWriteBufferBytes / getStreamWriteBufferBytes

```php
public HttpServerConfig::setStreamWriteBufferBytes(int $bytes): static
public HttpServerConfig::getStreamWriteBufferBytes(): int
```

Per-stream chunk-queue cap для backpressure'а `HttpResponse::send()`. HTTP/2 only; HTTP/1 chunked
использует kernel send-buffer.

Дефолт 262_144 (256 KiB). Диапазон 4_096..67_108_864 (64 MiB).

Industry baseline: gRPC-Go 64 KiB, Envoy 1 MiB, Node.js 16 KiB.

### setH2StaticBudgetMax / getH2StaticBudgetMax

```php
public HttpServerConfig::setH2StaticBudgetMax(int $bytes): static
public HttpServerConfig::getH2StaticBudgetMax(): int
```

Per-worker cap для HTTP/2 static-file body buffers (read-ahead chunks + ring queues). `0` — auto
(`memory_limit / 8`). Любое явное значение clamps так, чтобы static budget не превышал
`memory_limit` минус небольшой резерв.

## Body limits

### setMaxBodySize / getMaxBodySize

```php
public HttpServerConfig::setMaxBodySize(int $bytes): static
public HttpServerConfig::getMaxBodySize(): int
```

Максимум на тело запроса (H1 и H2). H1 — 413 + close; H2 — `RST_STREAM(INTERNAL_ERROR)` (connection
остаётся для других streams).

Дефолт 10_485_760 (10 MiB). Диапазон 1_024..17_179_869_184 (16 GiB).

## WebSocket {#websocket}

(true_async_server 0.9+). Руководство: [WebSocket](/ru/docs/server/websocket.html).

### setWsMaxMessageSize / getWsMaxMessageSize

```php
public HttpServerConfig::setWsMaxMessageSize(int $bytes): static
public HttpServerConfig::getWsMaxMessageSize(): int
```

Максимум на пересобранное WebSocket-сообщение. Фрейм(ы), чей суммарный payload превышает лимит,
закрывают соединение по RFC 6455 §7.4.1 `1009 Message Too Big`.

Дефолт 1_048_576 (1 MiB). Диапазон 128..268_435_456 (256 MiB).

### setWsMaxFrameSize / getWsMaxFrameSize

```php
public HttpServerConfig::setWsMaxFrameSize(int $bytes): static
public HttpServerConfig::getWsMaxFrameSize(): int
```

Максимум payload на один фрейм. Защита от fragment-flood атак, когда клиент шлёт миллионы
крошечных фрагментов.

Дефолт 1_048_576 (1 MiB). Диапазон тот же, что у `setWsMaxMessageSize`.

### setWsPingIntervalMs / getWsPingIntervalMs

```php
public HttpServerConfig::setWsPingIntervalMs(int $ms): static
public HttpServerConfig::getWsPingIntervalMs(): int
```

Частота серверного PING на простаивающих соединениях. Пир обязан ответить PONG в течение
`WsPongTimeoutMs`, иначе соединение рвётся кодом `1001 GoingAway`.

Дефолт 30_000 (30 s). `0` отключает автоматический ping.

### setWsPongTimeoutMs / getWsPongTimeoutMs

```php
public HttpServerConfig::setWsPongTimeoutMs(int $ms): static
public HttpServerConfig::getWsPongTimeoutMs(): int
```

Деадлайн на PONG: сколько сервер ждёт после PING, прежде чем считать соединение мёртвым.

Дефолт 60_000 (60 s). `0` отключает таймаут.

### setWsPermessageDeflate / getWsPermessageDeflate

```php
public HttpServerConfig::setWsPermessageDeflate(bool $enabled): static
public HttpServerConfig::getWsPermessageDeflate(): bool
```

Включает RFC 7692 permessage-deflate (сжатие на уровне сообщений). Выключено по умолчанию,
это осознанный opt-in, потому что сжатие стоит CPU и расширяет поверхность decompression-bomb атак.
Согласовывается только когда клиент сам предлагает расширение; лимит на пересобранное сообщение
проверяется и до, и после inflate. Требует сборки с zlib (HTTP-компрессия).

## HTTP/3 knobs

### setHttp3IdleTimeoutMs / getHttp3IdleTimeoutMs

```php
public HttpServerConfig::setHttp3IdleTimeoutMs(int $ms): static
public HttpServerConfig::getHttp3IdleTimeoutMs(): int
```

QUIC `max_idle_timeout` (RFC 9000 §10.1). Дефолт 30_000 (30 s). Диапазон 0..UINT32_MAX (~49 days);
`0` анонсирует "no idle timeout". Legacy env `PHP_HTTP3_IDLE_TIMEOUT_MS` всё ещё работает как ops
escape hatch.

### setHttp3StreamWindowBytes / getHttp3StreamWindowBytes

```php
public HttpServerConfig::setHttp3StreamWindowBytes(int $bytes): static
public HttpServerConfig::getHttp3StreamWindowBytes(): int
```

Per-stream QUIC flow-control window. Выставляет все три: `initial_max_stream_data_bidi_local`,
`_bidi_remote`, `_uni` (стиль h2o `http3-input-window-size`). Connection-level `initial_max_data`
выводится как `window × max_concurrent_streams` (паттерн nginx).

Дефолт 262_144 (256 KiB). Диапазон 1_024..1_073_741_824 (1 GiB).

### setHttp3MaxConcurrentStreams / getHttp3MaxConcurrentStreams

```php
public HttpServerConfig::setHttp3MaxConcurrentStreams(int $n): static
public HttpServerConfig::getHttp3MaxConcurrentStreams(): int
```

QUIC `initial_max_streams_bidi`. Аналог nginx `http3_max_concurrent_streams`. Дефолт 100,
диапазон 1..1_000_000.

### setHttp3PeerConnectionBudget / getHttp3PeerConnectionBudget

```php
public HttpServerConfig::setHttp3PeerConnectionBudget(int $n): static
public HttpServerConfig::getHttp3PeerConnectionBudget(): int
```

Per-source-IP cap на concurrent QUIC connections. Защита от handshake slow-loris и amplification.
Дефолт 16, диапазон 1..4_096. Legacy env `PHP_HTTP3_PEER_BUDGET` всё ещё override'ит на listener spawn.

### setHttp3AltSvcEnabled / isHttp3AltSvcEnabled

```php
public HttpServerConfig::setHttp3AltSvcEnabled(bool $enable): static
public HttpServerConfig::isHttp3AltSvcEnabled(): bool
```

RFC 7838 `Alt-Svc: h3=":<port>"; ma=86400` на H1/H2 ответах при поднятом H3 listener. Дефолт `true`.
Выключайте на phased H3 rollout. Legacy env `PHP_HTTP3_DISABLE_ALT_SVC` honor'ится на `start()`.

## Компрессия

### setCompressionEnabled / isCompressionEnabled

```php
public HttpServerConfig::setCompressionEnabled(bool $enable): static
public HttpServerConfig::isCompressionEnabled(): bool
```

Master switch. Дефолт `true`. Если расширение собрано без `--enable-http-compression`, принимается
только `false` — `true` бросает.

### setCompressionLevel / getCompressionLevel

```php
public HttpServerConfig::setCompressionLevel(int $level): static
public HttpServerConfig::getCompressionLevel(): int
```

gzip level. zlib-семантика: 1 — самый быстрый/слабый, 9 — медленный/сильный. Дефолт 6.

### setBrotliLevel / getBrotliLevel

```php
public HttpServerConfig::setBrotliLevel(int $level): static
public HttpServerConfig::getBrotliLevel(): int
```

Brotli quality. Диапазон 0..11. Дефолт 4 (production-typical; quality 11 ≈ 50× медленнее quality 4
с маргинальным выигрышем по ratio).

Inert, если расширение собрано без `--enable-brotli` — пайплайн ответа никогда не выберет Brotli
без `HAVE_HTTP_BROTLI`, что бы сюда ни передали.

### setZstdLevel / getZstdLevel

```php
public HttpServerConfig::setZstdLevel(int $level): static
public HttpServerConfig::getZstdLevel(): int
```

zstd level. Диапазон 1..22. Дефолт 3 — production-default команды zstd (лучше ratio чем gzip-6 на
большей throughput).

### setCompressionMinSize / getCompressionMinSize

```php
public HttpServerConfig::setCompressionMinSize(int $bytes): static
public HttpServerConfig::getCompressionMinSize(): int
```

Body-size threshold — ниже этого не сжимаем. Дефолт 1024 (1 KiB). Диапазон 0..16 MiB.

### setCompressionMimeTypes / getCompressionMimeTypes

```php
public HttpServerConfig::setCompressionMimeTypes(array $types): static
public HttpServerConfig::getCompressionMimeTypes(): array
```

MIME-whitelist для сжатия. **Полностью заменяет** дефолт (nginx `gzip_types`-семантика).
Записи нормализуются на setter: параметры (`; charset=...`) обрезаются, пробелы trim'ятся,
всё в lowercase.

Дефолт: `["application/javascript", "application/json", "application/xml", "image/svg+xml",
"text/css", "text/html", "text/javascript", "text/plain", "text/xml"]`.

### setRequestMaxDecompressedSize / getRequestMaxDecompressedSize

```php
public HttpServerConfig::setRequestMaxDecompressedSize(int $bytes): static
public HttpServerConfig::getRequestMaxDecompressedSize(): int
```

Anti-zip-bomb cap на декодированные тела (`Content-Encoding: gzip/br/zstd` inbound). При превышении —
413. `0` отключает cap (явно — implicit-unlimited не предусмотрено). Дефолт 10_485_760 (10 MiB).

### getSupportedEncodings (static)

```php
public static HttpServerConfig::getSupportedEncodings(): array
```

Список кодеков, вкомпилированных в эту сборку, в порядке предпочтения сервера. Всегда содержит
`"identity"`; `"gzip"` — при успешном `--enable-http-compression`; `"br"` / `"zstd"` — при наличии
соответствующей библиотеки на configure-time.

## Buffers

### setWriteBufferSize / getWriteBufferSize

```php
public HttpServerConfig::setWriteBufferSize(int $size): static
public HttpServerConfig::getWriteBufferSize(): int
```

Размер write-buffer'а.

## Protocol options

| Метод | Назначение |
|-------|------------|
| `enableHttp2(bool)` / `isHttp2Enabled(): bool` | toggle HTTP/2 (TODO) |
| `enableWebSocket(bool)` / `isWebSocketEnabled(): bool` | toggle WS (TODO) |
| `enableProtocolDetection(bool)` / `isProtocolDetectionEnabled(): bool` | автодетект протокола на listener'е |

> `enableWebSocket()`: это отдельный, пока не реализованный toggle. Сам WebSocket уже полностью
> работает через [`addWebSocketHandler()`](/ru/docs/reference/server/http-server.html#addwebsockethandler)
> и параметры из [раздела WebSocket](#websocket) выше, эти два флага друг от друга не зависят.

## TLS

| Метод | Назначение |
|-------|------------|
| `enableTls(bool)` / `isTlsEnabled(): bool` | toggle TLS на дефолтном listener'е |
| `setCertificate(string)` / `getCertificate(): ?string` | путь к PEM-сертификату |
| `setPrivateKey(string)` / `getPrivateKey(): ?string` | путь к PEM-ключу |

## Body handling

### setAutoAwaitBody / isAutoAwaitBodyEnabled

```php
public HttpServerConfig::setAutoAwaitBody(bool $enable): static
public HttpServerConfig::isAutoAwaitBodyEnabled(): bool
```

Когда `true`, non-multipart запросы ждут полного тела до вызова обработчика. Multipart всегда
стрим. Дефолт `true`.

### setBodyStreamingEnabled / isBodyStreamingEnabled

```php
public HttpServerConfig::setBodyStreamingEnabled(bool $enabled): static
public HttpServerConfig::isBodyStreamingEnabled(): bool
```

Стрим тел запросов в per-request queue (issue #26) вместо аккумуляции в `req->body`. Обработчики
должны читать через [`HttpRequest::readBody()`](/ru/docs/reference/server/http-request.html#readbody);
`getBody()` бросает.

## JSON

### setJsonEncodeFlags / getJsonEncodeFlags

```php
public HttpServerConfig::setJsonEncodeFlags(int $flags): static
public HttpServerConfig::getJsonEncodeFlags(): int
```

Дефолтные `JSON_*`-флаги для [`HttpResponse::json()`](/ru/docs/reference/server/http-response.html#json),
когда per-call `$flags=0` (или omit).

Дефолт: `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`.

`JSON_THROW_ON_ERROR` молча стрипается — ошибка encode даёт 500 JSON-ошибки, исключение не
пробрасывается.

## Logging / telemetry

### setLogSeverity / getLogSeverity

```php
public HttpServerConfig::setLogSeverity(\TrueAsync\LogSeverity $level): static
public HttpServerConfig::getLogSeverity(): \TrueAsync\LogSeverity
```

Severity logger'а. Дефолт `OFF`. Severity фиксируется на старте — runtime-смены не поддерживаются
(single-threaded lock-free модель). См. [`LogSeverity`](/ru/docs/reference/server/log-severity.html).

### setLogStream / getLogStream

```php
public HttpServerConfig::setLogStream(mixed $stream): static
public HttpServerConfig::getLogStream(): mixed
```

Sink логгера. Любой `php_stream` (файл, `php://stderr`, `php://memory`, user wrapper). Logger
выключен, пока не выставлены **оба**: non-OFF severity И stream.

### setTelemetryEnabled / isTelemetryEnabled

```php
public HttpServerConfig::setTelemetryEnabled(bool $enabled): static
public HttpServerConfig::isTelemetryEnabled(): bool
```

Парсинг W3C Trace Context — входящие `traceparent` / `tracestate` приклеиваются к request'у,
доступны через [`HttpRequest::getTraceParent/getTraceId/...`](/ru/docs/reference/server/http-request.html).

## State

### isLocked

```php
public HttpServerConfig::isLocked(): bool
```

`true` после передачи конфига в `new HttpServer()`. Locked-конфиг отвергает все сеттеры с
`HttpServerRuntimeException`.

## См. также

- [Конфигурация](/ru/docs/server/configuration.html) — пошаговый гид
- [`TrueAsync\HttpServer`](/ru/docs/reference/server/http-server.html)
- [`TrueAsync\WebSocket`](/ru/docs/reference/server/websocket.html)
- [`TrueAsync\LogSeverity`](/ru/docs/reference/server/log-severity.html)
