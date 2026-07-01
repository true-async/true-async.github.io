---
layout: docs
lang: de
path_key: "/docs/reference/server/http-server-config.html"
nav_active: docs
permalink: /de/docs/reference/server/http-server-config.html
page_title: "TrueAsync\\HttpServerConfig"
description: "Vollständige Referenz von HttpServerConfig: Listener, Workers, TLS, Timeouts, Backpressure, Drain, Komprimierung, HTTP/3-Knobs, Body-Streaming, Logging."
---

# TrueAsync\HttpServerConfig

(PHP 8.6+, true_async_server 0.6+)

Server-Konfiguration. Alle Methoden sind fluent (geben `static` zurück). Nach Übergabe des Objekts
an `new HttpServer($config)` ist die Konfiguration **eingefroren**: jeder Setter wirft
`HttpServerRuntimeException`. Prüfen — `isLocked()`.

Siehe auch [Konfiguration](/de/docs/server/configuration.html) — der schrittweise Guide.

## Konstruktor

### __construct

```php
public HttpServerConfig::__construct(?string $host = null, int $port = 8080)
```

Optionale Parameter — Shortcut für einen Single-Listener. Üblicher ist der Aufruf ohne Argumente
plus `addListener()`.

## Listener

### addListener

```php
public HttpServerConfig::addListener(string $host, int $port, bool $tls = false): static
```

TCP-Listener für HTTP/1.1 und HTTP/2 (h2c über Preface-Detection auf Plaintext, h2 über ALPN bei TLS).

### addHttp1Listener

```php
public HttpServerConfig::addHttp1Listener(string $host, int $port, bool $tls = false): static
```

HTTP/1.1-only TCP-Listener. Eine Verbindung mit HTTP/2-Preface geht an llhttp, das ein compliant
400 Bad Request emittiert und schließt.

### addHttp2Listener

```php
public HttpServerConfig::addHttp2Listener(string $host, int $port, bool $tls = false): static
```

HTTP/2-only Listener.

- `$tls=false`: h2c (cleartext H2). Listener verlangt das RFC-7540-§3.5-Preface; alles andere geht
  in `BAD_CLIENT_MAGIC` von nghttp2 und erhält compliant `GOAWAY(PROTOCOL_ERROR)`.
- `$tls=true`: Server kündigt über ALPN nur `h2` an.

### addUnixListener

```php
public HttpServerConfig::addUnixListener(string $path): static
```

Unix-Socket-Listener (H1 + H2, h2c-Stil).

### addHttp3Listener

```php
public HttpServerConfig::addHttp3Listener(string $host, int $port): static
```

HTTP/3 / QUIC über UDP. TLS 1.3 ist Pflicht — das Server-Zertifikat wird verwendet, ein separater
`$tls`-Flag existiert nicht. Die Extension muss mit `--enable-http3` gebaut sein, sonst wirft
`start()` eine Exception.

### getListeners

```php
public HttpServerConfig::getListeners(): array
```

Array aller registrierten Listener.

## Connection Limits

### setBacklog / getBacklog

```php
public HttpServerConfig::setBacklog(int $backlog): static
public HttpServerConfig::getBacklog(): int
```

Socket-Backlog. Default 128.

### setWorkers / getWorkers

```php
public HttpServerConfig::setWorkers(int $workers): static
public HttpServerConfig::getWorkers(): int
```

Größe des integrierten Worker-Pools (Issue #11).

- `1` (Default) — Single-Threaded.
- `> 1` — `start()` spawnt einen `Async\ThreadPool` der angegebenen Größe, Config + Handler-Set
  werden über `transfer_obj` repliziert, der Parent wartet auf alle Worker. Jeder Worker re-bindet
  die Listener; der Kernel verteilt Accepts via `SO_REUSEPORT` (Linux/BSD).

### setBootloader / getBootloader

```php
public HttpServerConfig::setBootloader(?\Closure $bootloader): static
public HttpServerConfig::getBootloader(): ?\Closure
```

Per-Worker-Startup-Hook. Der Pool deep-copiert die Closure einmal und führt sie in jedem Worker vor
dem Task-Loop aus — der ideale Ort für Autoload, Connection-Pool-Warmup, Opcache-Precompilation.

Gilt nur bei `setWorkers() > 1`. Eine Exception aus dem Bootloader lässt den gesamten Pool fehlschlagen.
Benötigt TrueAsync ABI v0.15+.

### setMaxConnections / getMaxConnections

```php
public HttpServerConfig::setMaxConnections(int $maxConnections): static
public HttpServerConfig::getMaxConnections(): int
```

Hartes Limit konkurrenter Verbindungen. `0` — unbegrenzt.

### setMaxInflightRequests / getMaxInflightRequests

```php
public HttpServerConfig::setMaxInflightRequests(int $n): static
public HttpServerConfig::getMaxInflightRequests(): int
```

Admission Control: bei Erreichen des Limits erhalten neue Anfragen eine schnelle Ablehnung — H1 → 503
+ `Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM` (retry-safe nach RFC 7540 §8.1.4). `0` —
disabled (Default); bleibt `0` bei `start()`, wird das Limit als `max_connections × 10` abgeleitet.

## Timeouts

| Methode | Was beschränkt wird |
|---------|---------------------|
| `setReadTimeout(int)` / `getReadTimeout(): int` | Empfang der Anfrage |
| `setWriteTimeout(int)` / `getWriteTimeout(): int` | Senden der Antwort |
| `setKeepAliveTimeout(int)` / `getKeepAliveTimeout(): int` | Idle zwischen Anfragen; `0` — Keep-Alive aus |
| `setShutdownTimeout(int)` / `getShutdownTimeout(): int` | wie lange auf aktive Anfragen beim Graceful Shutdown gewartet wird |

Werte in Sekunden. `0` (wo zutreffend) — Deaktivierung.

## Backpressure (CoDel)

### setBackpressureTargetMs / getBackpressureTargetMs

```php
public HttpServerConfig::setBackpressureTargetMs(int $ms): static
public HttpServerConfig::getBackpressureTargetMs(): int
```

Ziel-Sojourn für CoDel. Bleibt die Per-Request-Queue-Wait-Zeit 100 ms am Stück über dem Schwellwert,
wird der Listen-Socket pausiert. Bereich 0..10_000, Default 5. `0` — CoDel aus.

Guidance:
- schnelle Handler (<5 ms) — Default 5
- typische Web-Last — 10..20
- langsame (DB, IO) — 50..100

## Graceful Drain (Step 8)

### setMaxConnectionAgeMs / getMaxConnectionAgeMs

```php
public HttpServerConfig::setMaxConnectionAgeMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeMs(): int
```

Nach `(age ± 10 % Jitter)` Lifetime — H1: nächste Antwort mit `Connection: close`, H2: `GOAWAY`.
Pendant zu gRPC `MAX_CONNECTION_AGE`. Default `0` (off); Produktionsempfehlung 600_000 (10 min)
hinter einem L4-LB. Muss `0` oder ≥ 1000 sein.

### setMaxConnectionAgeGraceMs / getMaxConnectionAgeGraceMs

```php
public HttpServerConfig::setMaxConnectionAgeGraceMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeGraceMs(): int
```

Hard-Close nach `Connection: close`/`GOAWAY`. `0` — kein Force-Close-Timer; non-zero ≥ 1000.

### setDrainSpreadMs / getDrainSpreadMs

```php
public HttpServerConfig::setDrainSpreadMs(int $ms): static
public HttpServerConfig::getDrainSpreadMs(): int
```

Fenster zur gleichmäßigen Per-Connection-Drain-Verteilung bei CoDel-Trip / Hard-Cap
(Anti-Thundering-Herd). Pendant zu HAProxy `close-spread-time`. Default 5000, ≥ 100.

### setDrainCooldownMs / getDrainCooldownMs

```php
public HttpServerConfig::setDrainCooldownMs(int $ms): static
public HttpServerConfig::getDrainCooldownMs(): int
```

Minimaler Abstand zwischen reaktiven Drain-Triggern. Trigger innerhalb des Cooldowns inkrementieren
einen Telemetry-Counter. Default 10_000, ≥ 1000.

## HTTP/2 Streaming

### setStreamWriteBufferBytes / getStreamWriteBufferBytes

```php
public HttpServerConfig::setStreamWriteBufferBytes(int $bytes): static
public HttpServerConfig::getStreamWriteBufferBytes(): int
```

Per-Stream-Chunk-Queue-Cap für die Backpressure von `HttpResponse::send()`. HTTP/2 only; HTTP/1
chunked nutzt den Kernel-Send-Buffer.

Default 262_144 (256 KiB). Bereich 4_096..67_108_864 (64 MiB).

Industry-Baseline: gRPC-Go 64 KiB, Envoy 1 MiB, Node.js 16 KiB.

### setH2StaticBudgetMax / getH2StaticBudgetMax

```php
public HttpServerConfig::setH2StaticBudgetMax(int $bytes): static
public HttpServerConfig::getH2StaticBudgetMax(): int
```

Per-Worker-Cap für die HTTP/2-Static-File-Body-Buffer (Read-Ahead-Chunks + Ring-Queues). `0` — auto
(`memory_limit / 8`). Jeder explizite Wert wird so geclampt, dass das Static-Budget `memory_limit`
abzüglich einer kleinen Reserve nicht überschreitet.

## Body Limits

### setMaxBodySize / getMaxBodySize

```php
public HttpServerConfig::setMaxBodySize(int $bytes): static
public HttpServerConfig::getMaxBodySize(): int
```

Maximum für den Request-Body (H1 und H2). H1 — 413 + Close; H2 — `RST_STREAM(INTERNAL_ERROR)`
(die Connection bleibt für andere Streams erhalten).

Default 10_485_760 (10 MiB). Bereich 1_024..17_179_869_184 (16 GiB).

## WebSocket {#websocket}

(true_async_server 0.9+). Guide: [WebSocket](/de/docs/server/websocket.html).

### setWsMaxMessageSize / getWsMaxMessageSize

```php
public HttpServerConfig::setWsMaxMessageSize(int $bytes): static
public HttpServerConfig::getWsMaxMessageSize(): int
```

Maximale Größe für eine reassemblierte WebSocket-Nachricht. Ein Frame-Set, dessen kombinierter
Payload das Limit überschreitet, schließt die Verbindung mit RFC 6455 §7.4.1 `1009 Message Too
Big`.

Default 1_048_576 (1 MiB). Bereich 128..268_435_456 (256 MiB).

### setWsMaxFrameSize / getWsMaxFrameSize

```php
public HttpServerConfig::setWsMaxFrameSize(int $bytes): static
public HttpServerConfig::getWsMaxFrameSize(): int
```

Maximaler Payload für ein einzelnes Frame. Schutz vor Fragment-Flood-Angriffen, bei denen der
Client Millionen winziger Fragmente sendet.

Default 1_048_576 (1 MiB). Gleicher Bereich wie `setWsMaxMessageSize`.

### setWsPingIntervalMs / getWsPingIntervalMs

```php
public HttpServerConfig::setWsPingIntervalMs(int $ms): static
public HttpServerConfig::getWsPingIntervalMs(): int
```

Wie oft der Server eine ansonsten idle Verbindung pingt. Die Gegenseite muss innerhalb von
`WsPongTimeoutMs` mit PONG antworten, sonst wird die Verbindung mit Code `1001 GoingAway`
geschlossen.

Default 30_000 (30 s). `0` deaktiviert das automatische Ping.

### setWsPongTimeoutMs / getWsPongTimeoutMs

```php
public HttpServerConfig::setWsPongTimeoutMs(int $ms): static
public HttpServerConfig::getWsPongTimeoutMs(): int
```

Die PONG-Deadline: wie lange der Server nach einem PING wartet, bevor er die Verbindung für tot
erklärt.

Default 60_000 (60 s). `0` deaktiviert den Timeout.

### setWsPermessageDeflate / getWsPermessageDeflate

```php
public HttpServerConfig::setWsPermessageDeflate(bool $enabled): static
public HttpServerConfig::getWsPermessageDeflate(): bool
```

Aktiviert RFC 7692 permessage-deflate (Komprimierung auf Nachrichtenebene). Standardmäßig aus: ein
Opt-in, weil Komprimierung CPU kostet und die Angriffsfläche für Decompression-Bombs vergrößert.
Wird nur ausgehandelt, wenn der Client die Extension anbietet; das Cap für die reassemblierte
Nachricht wird sowohl vor als auch nach dem Inflate geprüft. Erfordert einen Build mit zlib
(HTTP-Komprimierung).

## HTTP/3 Knobs

### setHttp3IdleTimeoutMs / getHttp3IdleTimeoutMs

```php
public HttpServerConfig::setHttp3IdleTimeoutMs(int $ms): static
public HttpServerConfig::getHttp3IdleTimeoutMs(): int
```

QUIC `max_idle_timeout` (RFC 9000 §10.1). Default 30_000 (30 s). Bereich 0..UINT32_MAX (~49 Tage);
`0` kündigt "no idle timeout" an. Die Legacy-Env `PHP_HTTP3_IDLE_TIMEOUT_MS` funktioniert weiterhin
als Ops-Escape-Hatch.

### setHttp3StreamWindowBytes / getHttp3StreamWindowBytes

```php
public HttpServerConfig::setHttp3StreamWindowBytes(int $bytes): static
public HttpServerConfig::getHttp3StreamWindowBytes(): int
```

Per-Stream-QUIC-Flow-Control-Window. Setzt alle drei: `initial_max_stream_data_bidi_local`,
`_bidi_remote`, `_uni` (h2o-Stil `http3-input-window-size`). Das Connection-Level
`initial_max_data` ergibt sich als `window × max_concurrent_streams` (nginx-Muster).

Default 262_144 (256 KiB). Bereich 1_024..1_073_741_824 (1 GiB).

### setHttp3MaxConcurrentStreams / getHttp3MaxConcurrentStreams

```php
public HttpServerConfig::setHttp3MaxConcurrentStreams(int $n): static
public HttpServerConfig::getHttp3MaxConcurrentStreams(): int
```

QUIC `initial_max_streams_bidi`. Pendant zu nginx `http3_max_concurrent_streams`. Default 100,
Bereich 1..1_000_000.

### setHttp3PeerConnectionBudget / getHttp3PeerConnectionBudget

```php
public HttpServerConfig::setHttp3PeerConnectionBudget(int $n): static
public HttpServerConfig::getHttp3PeerConnectionBudget(): int
```

Per-Source-IP-Cap auf konkurrente QUIC-Verbindungen. Schutz vor Handshake-Slow-Loris und Amplification.
Default 16, Bereich 1..4_096. Legacy-Env `PHP_HTTP3_PEER_BUDGET` überschreibt weiterhin beim
Listener-Spawn.

### setHttp3AltSvcEnabled / isHttp3AltSvcEnabled

```php
public HttpServerConfig::setHttp3AltSvcEnabled(bool $enable): static
public HttpServerConfig::isHttp3AltSvcEnabled(): bool
```

RFC 7838 `Alt-Svc: h3=":<port>"; ma=86400` auf H1/H2-Antworten, wenn ein H3-Listener läuft.
Default `true`. Bei phased H3-Rollouts deaktivieren. Legacy-Env `PHP_HTTP3_DISABLE_ALT_SVC` wird
bei `start()` berücksichtigt.

## Komprimierung

### setCompressionEnabled / isCompressionEnabled

```php
public HttpServerConfig::setCompressionEnabled(bool $enable): static
public HttpServerConfig::isCompressionEnabled(): bool
```

Master Switch. Default `true`. Ist die Extension ohne `--enable-http-compression` gebaut, wird nur
`false` akzeptiert — `true` wirft.

### setCompressionLevel / getCompressionLevel

```php
public HttpServerConfig::setCompressionLevel(int $level): static
public HttpServerConfig::getCompressionLevel(): int
```

gzip-Level. zlib-Semantik: 1 — am schnellsten/schwächsten, 9 — langsam/stark. Default 6.

### setBrotliLevel / getBrotliLevel

```php
public HttpServerConfig::setBrotliLevel(int $level): static
public HttpServerConfig::getBrotliLevel(): int
```

Brotli Quality. Bereich 0..11. Default 4 (production-typical; Quality 11 ≈ 50× langsamer als
Quality 4 bei marginalem Ratio-Gewinn).

Inert, wenn die Extension ohne `--enable-brotli` gebaut ist — die Response-Pipeline wählt ohne
`HAVE_HTTP_BROTLI` nie Brotli, egal was hier übergeben wurde.

### setZstdLevel / getZstdLevel

```php
public HttpServerConfig::setZstdLevel(int $level): static
public HttpServerConfig::getZstdLevel(): int
```

zstd-Level. Bereich 1..22. Default 3 — der Production-Default des zstd-Teams (besseres Ratio als
gzip-6 bei höherem Durchsatz).

### setCompressionMinSize / getCompressionMinSize

```php
public HttpServerConfig::setCompressionMinSize(int $bytes): static
public HttpServerConfig::getCompressionMinSize(): int
```

Body-Size-Schwellwert — darunter wird nicht komprimiert. Default 1024 (1 KiB). Bereich 0..16 MiB.

### setCompressionMimeTypes / getCompressionMimeTypes

```php
public HttpServerConfig::setCompressionMimeTypes(array $types): static
public HttpServerConfig::getCompressionMimeTypes(): array
```

MIME-Whitelist für Komprimierung. **Ersetzt den Default vollständig** (nginx `gzip_types`-Semantik).
Einträge werden beim Setter normalisiert: Parameter (`; charset=...`) entfernt, Whitespace getrimmt,
alles in lowercase.

Default: `["application/javascript", "application/json", "application/xml", "image/svg+xml",
"text/css", "text/html", "text/javascript", "text/plain", "text/xml"]`.

### setRequestMaxDecompressedSize / getRequestMaxDecompressedSize

```php
public HttpServerConfig::setRequestMaxDecompressedSize(int $bytes): static
public HttpServerConfig::getRequestMaxDecompressedSize(): int
```

Anti-Zip-Bomb-Cap für dekodierte Bodies (`Content-Encoding: gzip/br/zstd` inbound). Bei Überschreitung
— 413. `0` deaktiviert das Cap (explizit — kein impliziter unlimited-Pfad). Default 10_485_760 (10 MiB).

### getSupportedEncodings (static)

```php
public static HttpServerConfig::getSupportedEncodings(): array
```

Liste der in diesem Build hineinkompilierten Codecs, in Server-Präferenzreihenfolge. Enthält stets
`"identity"`; `"gzip"` bei erfolgreichem `--enable-http-compression`; `"br"` / `"zstd"` bei
vorhandener Bibliothek zur Configure-Zeit.

## Buffers

### setWriteBufferSize / getWriteBufferSize

```php
public HttpServerConfig::setWriteBufferSize(int $size): static
public HttpServerConfig::getWriteBufferSize(): int
```

Write-Buffer-Größe.

## Protocol Options

| Methode | Zweck |
|---------|-------|
| `enableHttp2(bool)` / `isHttp2Enabled(): bool` | HTTP/2 toggle (TODO) |
| `enableWebSocket(bool)` / `isWebSocketEnabled(): bool` | WS toggle (TODO) |
| `enableProtocolDetection(bool)` / `isProtocolDetectionEnabled(): bool` | Protokoll-Autodetect am Listener |

> `enableWebSocket()` ist ein separater, noch nicht implementierter Toggle. WebSocket selbst
> funktioniert bereits vollständig über
> [`addWebSocketHandler()`](/de/docs/reference/server/http-server.html#addwebsockethandler) und
> die Einstellungen im [WebSocket-Abschnitt](#websocket) oben; die beiden Flags haben nichts
> miteinander zu tun.

## TLS

| Methode | Zweck |
|---------|-------|
| `enableTls(bool)` / `isTlsEnabled(): bool` | TLS auf dem Default-Listener toggeln |
| `setCertificate(string)` / `getCertificate(): ?string` | Pfad zum PEM-Zertifikat |
| `setPrivateKey(string)` / `getPrivateKey(): ?string` | Pfad zum PEM-Schlüssel |

## Body Handling

### setAutoAwaitBody / isAutoAwaitBodyEnabled

```php
public HttpServerConfig::setAutoAwaitBody(bool $enable): static
public HttpServerConfig::isAutoAwaitBodyEnabled(): bool
```

Bei `true` warten Non-Multipart-Anfragen auf den vollständigen Body, bevor der Handler aufgerufen
wird. Multipart streamt immer. Default `true`.

### setBodyStreamingEnabled / isBodyStreamingEnabled

```php
public HttpServerConfig::setBodyStreamingEnabled(bool $enabled): static
public HttpServerConfig::isBodyStreamingEnabled(): bool
```

Streaming der Request-Bodies in eine Per-Request-Queue (Issue #26) statt Akkumulation in `req->body`.
Handler müssen über [`HttpRequest::readBody()`](/de/docs/reference/server/http-request.html#readbody)
lesen; `getBody()` wirft.

## JSON

### setJsonEncodeFlags / getJsonEncodeFlags

```php
public HttpServerConfig::setJsonEncodeFlags(int $flags): static
public HttpServerConfig::getJsonEncodeFlags(): int
```

Default-`JSON_*`-Flags für [`HttpResponse::json()`](/de/docs/reference/server/http-response.html#json),
wenn Per-Call-`$flags=0` (oder weggelassen).

Default: `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`.

`JSON_THROW_ON_ERROR` wird stillschweigend entfernt — ein Encoding-Fehler liefert eine 500 mit
JSON-Fehlerbody, eine Exception wird nicht durchgereicht.

## Logging / Telemetrie

### setLogSeverity / getLogSeverity

```php
public HttpServerConfig::setLogSeverity(\TrueAsync\LogSeverity $level): static
public HttpServerConfig::getLogSeverity(): \TrueAsync\LogSeverity
```

Logger-Severity. Default `OFF`. Die Severity wird beim Start festgeschrieben — Laufzeit-Änderungen
sind nicht möglich (Single-Threaded Lock-Free-Modell). Siehe [`LogSeverity`](/de/docs/reference/server/log-severity.html).

### setLogStream / getLogStream

```php
public HttpServerConfig::setLogStream(mixed $stream): static
public HttpServerConfig::getLogStream(): mixed
```

Logger-Sink. Beliebiger `php_stream` (Datei, `php://stderr`, `php://memory`, User-Wrapper). Der
Logger ist deaktiviert, bis **beide** gesetzt sind: non-OFF Severity UND Stream.

### setTelemetryEnabled / isTelemetryEnabled

```php
public HttpServerConfig::setTelemetryEnabled(bool $enabled): static
public HttpServerConfig::isTelemetryEnabled(): bool
```

W3C-Trace-Context-Parsing — eingehende `traceparent` / `tracestate` werden an den Request angeheftet
und sind über [`HttpRequest::getTraceParent/getTraceId/...`](/de/docs/reference/server/http-request.html)
verfügbar.

## State

### isLocked

```php
public HttpServerConfig::isLocked(): bool
```

`true` nach Übergabe der Konfiguration an `new HttpServer()`. Eine locked Config verweigert jeden
Setter mit `HttpServerRuntimeException`.

## Siehe auch

- [Konfiguration](/de/docs/server/configuration.html) — der schrittweise Guide
- [`TrueAsync\HttpServer`](/de/docs/reference/server/http-server.html)
- [`TrueAsync\WebSocket`](/de/docs/reference/server/websocket.html)
- [`TrueAsync\LogSeverity`](/de/docs/reference/server/log-severity.html)
