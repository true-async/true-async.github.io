---
layout: docs
lang: it
path_key: "/docs/reference/server/http-server-config.html"
nav_active: docs
permalink: /it/docs/reference/server/http-server-config.html
page_title: "TrueAsync\\HttpServerConfig"
description: "Riferimento completo di HttpServerConfig: listener, worker, TLS, timeout, contropressione, drain, compressione, parametri HTTP/3, streaming del corpo, logging."
---

# TrueAsync\HttpServerConfig

(PHP 8.6+, true_async_server 0.6+)

Configurazione del server. Tutti i metodi sono fluent (restituiscono `static`). Dopo aver passato
l'oggetto a `new HttpServer($config)` la configurazione viene **congelata**: ogni setter lancia
`HttpServerRuntimeException`. Verifica: `isLocked()`.

Vedi anche [Configurazione](/it/docs/server/configuration.html): guida passo passo.

## Costruttore

### __construct

```php
public HttpServerConfig::__construct(?string $host = null, int $port = 8080)
```

I parametri opzionali sono una scorciatoia per un singolo listener. Più spesso si usa senza argomenti
insieme a `addListener()`.

## Listener

### addListener

```php
public HttpServerConfig::addListener(string $host, int $port, bool $tls = false): static
```

Listener TCP, accetta HTTP/1.1 e HTTP/2 (h2c tramite preface detection in plaintext, h2 tramite ALPN
su TLS).

### addHttp1Listener

```php
public HttpServerConfig::addHttp1Listener(string $host, int $port, bool $tls = false): static
```

Listener TCP solo HTTP/1.1. Una connessione con preface HTTP/2 viene passata a llhttp, che emette un
400 Bad Request conforme e si chiude.

### addHttp2Listener

```php
public HttpServerConfig::addHttp2Listener(string $host, int $port, bool $tls = false): static
```

Listener solo HTTP/2.

- `$tls=false`: h2c (H2 in chiaro). Il listener richiede il preface RFC 7540 §3.5; il resto va in
  `BAD_CLIENT_MAGIC` di nghttp2 e riceve `GOAWAY(PROTOCOL_ERROR)` conforme.
- `$tls=true`: il server annuncia solo `h2` via ALPN.

### addUnixListener

```php
public HttpServerConfig::addUnixListener(string $path): static
```

Listener su socket Unix (H1 + H2, stile h2c).

### addHttp3Listener

```php
public HttpServerConfig::addHttp3Listener(string $host, int $port): static
```

HTTP/3 / QUIC su UDP. TLS 1.3 è obbligatorio: viene preso il certificato del server, non c'è un flag
`$tls` separato. L'estensione deve essere compilata con `--enable-http3`, altrimenti `start()`
lancerà un'eccezione.

### getListeners

```php
public HttpServerConfig::getListeners(): array
```

Array di tutti i listener registrati.

## Limiti di connessione

### setBacklog / getBacklog

```php
public HttpServerConfig::setBacklog(int $backlog): static
public HttpServerConfig::getBacklog(): int
```

Backlog del socket. Default 128.

### setWorkers / getWorkers

```php
public HttpServerConfig::setWorkers(int $workers): static
public HttpServerConfig::getWorkers(): int
```

Dimensione del worker pool integrato (issue #11).

- `1` (default): single-threaded.
- `> 1`: `start()` crea un `Async\ThreadPool` della dimensione indicata, configurazione + set degli
  handler vengono replicati tramite `transfer_obj`, il padre attende il termine di tutti i worker.
  Ogni worker rifa il bind dei listener; il kernel distribuisce gli accept tramite `SO_REUSEPORT`
  (Linux/BSD).

### setBootloader / getBootloader

```php
public HttpServerConfig::setBootloader(?\Closure $bootloader): static
public HttpServerConfig::getBootloader(): ?\Closure
```

Hook di startup per worker. Il pool deep-copia la closure una volta e la esegue in ogni worker prima
del task loop: il posto ideale per autoload, riscaldamento dei pool di connessioni, precompilazione
di opcache.

Si applica solo quando `setWorkers() > 1`. Un'eccezione dal bootloader fa fallire l'intero pool.
Richiede TrueAsync ABI v0.15+.

### setMaxConnections / getMaxConnections

```php
public HttpServerConfig::setMaxConnections(int $maxConnections): static
public HttpServerConfig::getMaxConnections(): int
```

Limite rigido sulle connessioni concorrenti. `0`: nessun limite.

### setMaxInflightRequests / getMaxInflightRequests

```php
public HttpServerConfig::setMaxInflightRequests(int $n): static
public HttpServerConfig::getMaxInflightRequests(): int
```

Controllo di ammissione: al raggiungimento del limite le nuove richieste ricevono un rifiuto rapido:
H1 → 503 + `Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM` (retry-safe per RFC 7540 §8.1.4).
`0` significa disabilitato (default); se `0` resta tale a `start()`, il limite viene derivato come
`max_connections × 10`.

## Timeout

| Metodo | Cosa fa scattare il timeout |
|--------|-----------------------------|
| `setReadTimeout(int)` / `getReadTimeout(): int` | ricezione della richiesta |
| `setWriteTimeout(int)` / `getWriteTimeout(): int` | invio della risposta |
| `setKeepAliveTimeout(int)` / `getKeepAliveTimeout(): int` | idle tra richieste; `0` disattiva il keep-alive |
| `setShutdownTimeout(int)` / `getShutdownTimeout(): int` | quanto attendere le richieste attive durante il graceful shutdown |

Valori in secondi. `0` (dove applicabile): disattivato.

## Contropressione (CoDel)

### setBackpressureTargetMs / getBackpressureTargetMs

```php
public HttpServerConfig::setBackpressureTargetMs(int $ms): static
public HttpServerConfig::getBackpressureTargetMs(): int
```

Sojourn obiettivo per CoDel. Quando il tempo di attesa in coda per richiesta resta sopra la soglia
per 100 ms consecutivi, il socket in ascolto viene messo in pausa. Intervallo 0..10_000, default 5.
`0` disattiva CoDel.

Linee guida:
- handler veloci (<5 ms): default 5
- web tipico: 10..20
- lenti (DB, IO): 50..100

## Graceful drain (Step 8)

### setMaxConnectionAgeMs / getMaxConnectionAgeMs

```php
public HttpServerConfig::setMaxConnectionAgeMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeMs(): int
```

Dopo `(age ± 10% jitter)` di vita: H1 invia la prossima risposta con `Connection: close`, H2 emette
`GOAWAY`. Analogo a `MAX_CONNECTION_AGE` di gRPC. Default `0` (off); raccomandazione produzione
600_000 (10 min) dietro un LB L4. Deve essere `0` o ≥ 1000.

### setMaxConnectionAgeGraceMs / getMaxConnectionAgeGraceMs

```php
public HttpServerConfig::setMaxConnectionAgeGraceMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeGraceMs(): int
```

Hard-close dopo `Connection: close`/`GOAWAY`. `0`: nessun timer di force-close; non-zero ≥ 1000.

### setDrainSpreadMs / getDrainSpreadMs

```php
public HttpServerConfig::setDrainSpreadMs(int $ms): static
public HttpServerConfig::getDrainSpreadMs(): int
```

Finestra di distribuzione uniforme del drain per connessione al trigger CoDel / hard-cap
(anti-thundering-herd). Analogo a `close-spread-time` di HAProxy. Default 5000, ≥ 100.

### setDrainCooldownMs / getDrainCooldownMs

```php
public HttpServerConfig::setDrainCooldownMs(int $ms): static
public HttpServerConfig::getDrainCooldownMs(): int
```

Gap minimo tra trigger reattivi di drain. I trigger entro il cooldown incrementano un counter di
telemetria. Default 10_000, ≥ 1000.

## Streaming HTTP/2

### setStreamWriteBufferBytes / getStreamWriteBufferBytes

```php
public HttpServerConfig::setStreamWriteBufferBytes(int $bytes): static
public HttpServerConfig::getStreamWriteBufferBytes(): int
```

Limite della coda di chunk per stream per la contropressione di `HttpResponse::send()`. Solo HTTP/2;
HTTP/1 chunked usa il buffer di invio del kernel.

Default 262_144 (256 KiB). Intervallo 4_096..67_108_864 (64 MiB).

Riferimenti industria: gRPC-Go 64 KiB, Envoy 1 MiB, Node.js 16 KiB.

### setH2StaticBudgetMax / getH2StaticBudgetMax

```php
public HttpServerConfig::setH2StaticBudgetMax(int $bytes): static
public HttpServerConfig::getH2StaticBudgetMax(): int
```

Cap per worker sui buffer del corpo dei file statici HTTP/2 (chunk di read-ahead + ring queues).
`0`: auto (`memory_limit / 8`). Qualunque valore esplicito viene comunque clampato perché il budget
statico non superi `memory_limit` meno una piccola riserva.

## Limiti del corpo

### setMaxBodySize / getMaxBodySize

```php
public HttpServerConfig::setMaxBodySize(int $bytes): static
public HttpServerConfig::getMaxBodySize(): int
```

Massimo per il corpo della richiesta (H1 e H2). H1 → 413 + close; H2 → `RST_STREAM(INTERNAL_ERROR)`
(la connessione resta aperta per altri stream).

Default 10_485_760 (10 MiB). Intervallo 1_024..17_179_869_184 (16 GiB).

## WebSocket {#websocket}

(true_async_server 0.9+). Guida: [WebSocket](/it/docs/server/websocket.html).

### setWsMaxMessageSize / getWsMaxMessageSize

```php
public HttpServerConfig::setWsMaxMessageSize(int $bytes): static
public HttpServerConfig::getWsMaxMessageSize(): int
```

Dimensione massima di un messaggio WebSocket riassemblato. Un insieme di frame il cui payload
combinato supera il limite chiude la connessione con `1009 Message Too Big` (RFC 6455 §7.4.1).

Default 1_048_576 (1 MiB). Intervallo 128..268_435_456 (256 MiB).

### setWsMaxFrameSize / getWsMaxFrameSize

```php
public HttpServerConfig::setWsMaxFrameSize(int $bytes): static
public HttpServerConfig::getWsMaxFrameSize(): int
```

Payload massimo per un singolo frame. Protegge da attacchi di fragment-flood, in cui il client
invia milioni di frammenti piccolissimi.

Default 1_048_576 (1 MiB). Stesso intervallo di `setWsMaxMessageSize`.

### setWsPingIntervalMs / getWsPingIntervalMs

```php
public HttpServerConfig::setWsPingIntervalMs(int $ms): static
public HttpServerConfig::getWsPingIntervalMs(): int
```

Ogni quanto il server pinga una connessione altrimenti idle. Il peer deve rispondere con PONG
entro `WsPongTimeoutMs`, o la connessione viene chiusa con il codice `1001 GoingAway`.

Default 30_000 (30 s). `0` disattiva il ping automatico.

### setWsPongTimeoutMs / getWsPongTimeoutMs

```php
public HttpServerConfig::setWsPongTimeoutMs(int $ms): static
public HttpServerConfig::getWsPongTimeoutMs(): int
```

La deadline del PONG: quanto attende il server dopo un PING prima di dichiarare morta la
connessione.

Default 60_000 (60 s). `0` disattiva il timeout.

### setWsPermessageDeflate / getWsPermessageDeflate

```php
public HttpServerConfig::setWsPermessageDeflate(bool $enabled): static
public HttpServerConfig::getWsPermessageDeflate(): bool
```

Abilita permessage-deflate RFC 7692 (compressione a livello di messaggio). Disattivato di
default: è un opt-in, perché la compressione costa CPU e allarga la superficie di attacco delle
decompression-bomb. Viene negoziato solo quando il client offre l'estensione; il tetto sul
messaggio riassemblato viene controllato sia prima sia dopo l'inflate. Richiede una build con
zlib (compressione HTTP).

## Parametri HTTP/3

### setHttp3IdleTimeoutMs / getHttp3IdleTimeoutMs

```php
public HttpServerConfig::setHttp3IdleTimeoutMs(int $ms): static
public HttpServerConfig::getHttp3IdleTimeoutMs(): int
```

QUIC `max_idle_timeout` (RFC 9000 §10.1). Default 30_000 (30 s). Intervallo 0..UINT32_MAX
(~49 giorni); `0` annuncia "no idle timeout". La variabile d'ambiente legacy
`PHP_HTTP3_IDLE_TIMEOUT_MS` continua a funzionare come escape hatch ops.

### setHttp3StreamWindowBytes / getHttp3StreamWindowBytes

```php
public HttpServerConfig::setHttp3StreamWindowBytes(int $bytes): static
public HttpServerConfig::getHttp3StreamWindowBytes(): int
```

Finestra di flow control QUIC per stream. Imposta tutte e tre: `initial_max_stream_data_bidi_local`,
`_bidi_remote`, `_uni` (stile `http3-input-window-size` di h2o). L'`initial_max_data` a livello di
connessione viene derivato come `window × max_concurrent_streams` (pattern nginx).

Default 262_144 (256 KiB). Intervallo 1_024..1_073_741_824 (1 GiB).

### setHttp3MaxConcurrentStreams / getHttp3MaxConcurrentStreams

```php
public HttpServerConfig::setHttp3MaxConcurrentStreams(int $n): static
public HttpServerConfig::getHttp3MaxConcurrentStreams(): int
```

QUIC `initial_max_streams_bidi`. Analogo a `http3_max_concurrent_streams` di nginx. Default 100,
intervallo 1..1_000_000.

### setHttp3PeerConnectionBudget / getHttp3PeerConnectionBudget

```php
public HttpServerConfig::setHttp3PeerConnectionBudget(int $n): static
public HttpServerConfig::getHttp3PeerConnectionBudget(): int
```

Limite per IP di origine sulle connessioni QUIC concorrenti. Protezione da handshake slow-loris e
amplification. Default 16, intervallo 1..4_096. La variabile d'ambiente legacy
`PHP_HTTP3_PEER_BUDGET` continua a fare override allo spawn del listener.

### setHttp3AltSvcEnabled / isHttp3AltSvcEnabled

```php
public HttpServerConfig::setHttp3AltSvcEnabled(bool $enable): static
public HttpServerConfig::isHttp3AltSvcEnabled(): bool
```

`Alt-Svc: h3=":<port>"; ma=86400` (RFC 7838) sulle risposte H1/H2 quando è attivo un listener H3.
Default `true`. Disattivalo per un rollout H3 graduale. La variabile d'ambiente legacy
`PHP_HTTP3_DISABLE_ALT_SVC` viene rispettata su `start()`.

## Compressione

### setCompressionEnabled / isCompressionEnabled

```php
public HttpServerConfig::setCompressionEnabled(bool $enable): static
public HttpServerConfig::isCompressionEnabled(): bool
```

Interruttore principale. Default `true`. Se l'estensione è compilata senza
`--enable-http-compression`, viene accettato solo `false`: `true` lancia un'eccezione.

### setCompressionLevel / getCompressionLevel

```php
public HttpServerConfig::setCompressionLevel(int $level): static
public HttpServerConfig::getCompressionLevel(): int
```

Livello gzip. Semantica zlib: 1 = più veloce/debole, 9 = lento/forte. Default 6.

### setBrotliLevel / getBrotliLevel

```php
public HttpServerConfig::setBrotliLevel(int $level): static
public HttpServerConfig::getBrotliLevel(): int
```

Quality Brotli. Intervallo 0..11. Default 4 (tipico produzione; quality 11 ≈ 50× più lento di
quality 4 con guadagno marginale sul rapporto).

Inerte se l'estensione è compilata senza `--enable-brotli`: la pipeline di risposta non sceglierà
mai Brotli senza `HAVE_HTTP_BROTLI`, qualunque cosa si passi qui.

### setZstdLevel / getZstdLevel

```php
public HttpServerConfig::setZstdLevel(int $level): static
public HttpServerConfig::getZstdLevel(): int
```

Livello zstd. Intervallo 1..22. Default 3: il default di produzione consigliato dal team di zstd
(rapporto migliore di gzip-6 con throughput più alto).

### setCompressionMinSize / getCompressionMinSize

```php
public HttpServerConfig::setCompressionMinSize(int $bytes): static
public HttpServerConfig::getCompressionMinSize(): int
```

Soglia di dimensione del corpo: sotto la quale non si comprime. Default 1024 (1 KiB).
Intervallo 0..16 MiB.

### setCompressionMimeTypes / getCompressionMimeTypes

```php
public HttpServerConfig::setCompressionMimeTypes(array $types): static
public HttpServerConfig::getCompressionMimeTypes(): array
```

Whitelist MIME per la compressione. **Sostituisce completamente** il default (semantica `gzip_types`
di nginx). Le voci vengono normalizzate al setter: i parametri (`; charset=...`) vengono tagliati,
gli spazi rimossi, tutto in lowercase.

Default: `["application/javascript", "application/json", "application/xml", "image/svg+xml",
"text/css", "text/html", "text/javascript", "text/plain", "text/xml"]`.

### setRequestMaxDecompressedSize / getRequestMaxDecompressedSize

```php
public HttpServerConfig::setRequestMaxDecompressedSize(int $bytes): static
public HttpServerConfig::getRequestMaxDecompressedSize(): int
```

Tetto anti zip-bomb sui corpi decompressi (`Content-Encoding: gzip/br/zstd` in ingresso). Al
superamento → 413. `0` disattiva il tetto (esplicitamente: nessun illimitato implicito).
Default 10_485_760 (10 MiB).

### getSupportedEncodings (static)

```php
public static HttpServerConfig::getSupportedEncodings(): array
```

Elenco dei codec compilati in questa build, in ordine di preferenza del server. Contiene sempre
`"identity"`; `"gzip"` se `--enable-http-compression` ha avuto successo; `"br"` / `"zstd"` se la
libreria corrispondente era disponibile al configure time.

## Buffer

### setWriteBufferSize / getWriteBufferSize

```php
public HttpServerConfig::setWriteBufferSize(int $size): static
public HttpServerConfig::getWriteBufferSize(): int
```

Dimensione del write buffer.

## Opzioni di protocollo

| Metodo | Scopo |
|--------|-------|
| `enableHttp2(bool)` / `isHttp2Enabled(): bool` | toggle HTTP/2 (TODO) |
| `enableWebSocket(bool)` / `isWebSocketEnabled(): bool` | toggle WS (TODO) |
| `enableProtocolDetection(bool)` / `isProtocolDetectionEnabled(): bool` | autodetect del protocollo sul listener |

> `enableWebSocket()` è un toggle separato, non ancora implementato. WebSocket in sé funziona già
> pienamente tramite [`addWebSocketHandler()`](/it/docs/reference/server/http-server.html#addwebsockethandler)
> e le impostazioni nella [sezione WebSocket](#websocket) sopra; i due flag non sono collegati.

## TLS

| Metodo | Scopo |
|--------|-------|
| `enableTls(bool)` / `isTlsEnabled(): bool` | toggle TLS sul listener predefinito |
| `setCertificate(string)` / `getCertificate(): ?string` | path al certificato PEM |
| `setPrivateKey(string)` / `getPrivateKey(): ?string` | path alla chiave PEM |

## Gestione del corpo

### setAutoAwaitBody / isAutoAwaitBodyEnabled

```php
public HttpServerConfig::setAutoAwaitBody(bool $enable): static
public HttpServerConfig::isAutoAwaitBodyEnabled(): bool
```

Se `true`, le richieste non multipart attendono il corpo completo prima della chiamata all'handler.
Il multipart è sempre in streaming. Default `true`.

### setBodyStreamingEnabled / isBodyStreamingEnabled

```php
public HttpServerConfig::setBodyStreamingEnabled(bool $enabled): static
public HttpServerConfig::isBodyStreamingEnabled(): bool
```

Streaming dei corpi richiesta in una coda per richiesta (issue #26) invece di accumulare in
`req->body`. Gli handler devono leggere tramite
[`HttpRequest::readBody()`](/it/docs/reference/server/http-request.html#readbody); `getBody()`
lancia un'eccezione.

## JSON

### setJsonEncodeFlags / getJsonEncodeFlags

```php
public HttpServerConfig::setJsonEncodeFlags(int $flags): static
public HttpServerConfig::getJsonEncodeFlags(): int
```

Flag `JSON_*` predefiniti per
[`HttpResponse::json()`](/it/docs/reference/server/http-response.html#json) quando `$flags=0`
per chiamata (oppure omesso).

Default: `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`.

`JSON_THROW_ON_ERROR` viene rimosso silenziosamente: un errore di encode produce un 500 di errore
JSON, l'eccezione non viene propagata.

## Logging / telemetria

### setLogSeverity / getLogSeverity

```php
public HttpServerConfig::setLogSeverity(\TrueAsync\LogSeverity $level): static
public HttpServerConfig::getLogSeverity(): \TrueAsync\LogSeverity
```

Severity del logger. Default `OFF`. La severity viene fissata all'avvio: non sono supportati cambi a
runtime (modello single-threaded lock-free). Vedi
[`LogSeverity`](/it/docs/reference/server/log-severity.html).

### setLogStream / getLogStream

```php
public HttpServerConfig::setLogStream(mixed $stream): static
public HttpServerConfig::getLogStream(): mixed
```

Sink del logger. Qualsiasi `php_stream` (file, `php://stderr`, `php://memory`, user wrapper). Il
logger resta disattivato finché non sono impostati **entrambi**: severity diversa da OFF E stream.

### setTelemetryEnabled / isTelemetryEnabled

```php
public HttpServerConfig::setTelemetryEnabled(bool $enabled): static
public HttpServerConfig::isTelemetryEnabled(): bool
```

Parsing W3C Trace Context: `traceparent` / `tracestate` in ingresso vengono agganciati alla
richiesta e sono disponibili tramite
[`HttpRequest::getTraceParent/getTraceId/...`](/it/docs/reference/server/http-request.html).

## Stato

### isLocked

```php
public HttpServerConfig::isLocked(): bool
```

`true` dopo aver passato la configurazione a `new HttpServer()`. Una configurazione bloccata rifiuta
ogni setter con `HttpServerRuntimeException`.

## Vedi anche

- [Configurazione](/it/docs/server/configuration.html): guida passo passo
- [`TrueAsync\HttpServer`](/it/docs/reference/server/http-server.html)
- [`TrueAsync\WebSocket`](/it/docs/reference/server/websocket.html)
- [`TrueAsync\LogSeverity`](/it/docs/reference/server/log-severity.html)
