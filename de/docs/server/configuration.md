---
layout: docs
lang: de
path_key: "/docs/server/configuration.html"
nav_active: docs
permalink: /de/docs/server/configuration.html
page_title: "TrueAsync Server: Konfiguration"
description: "HttpServerConfig: Listener, TLS, Timeouts, Backpressure, Body-Limits, Body-Streaming, JSON-Flags, Logging, HTTP/3."
---

# Konfiguration TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

Die gesamte Server-Konfiguration wird über das Objekt
[`TrueAsync\HttpServerConfig`](/de/docs/reference/server/http-server-config.html) vor dem Aufruf
`new HttpServer($config)` festgelegt. Sobald `HttpServer` erstellt wurde, wird die Konfiguration
**eingefroren**: jeder Setter wirft anschließend `HttpServerRuntimeException`.

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

Die Setter geben `static` zurück, sodass die Konfiguration per Method-Chaining aufgebaut wird.

## Listener

Der Server kann beliebig viele TCP/Unix-Sockets und UDP-Ports (für HTTP/3) gleichzeitig bedienen.

| Methode | Was sie tut |
|---------|-------------|
| `addListener($host, $port, $tls = false)` | TCP, HTTP/1.1 + HTTP/2 (h2c per Preface auf Plaintext, h2 über ALPN auf TLS) |
| `addHttp1Listener($host, $port, $tls = false)` | TCP, nur HTTP/1.1. Ein Client mit HTTP/2-Preface erhält 400 |
| `addHttp2Listener($host, $port, $tls = false)` | TCP, nur HTTP/2. Ohne TLS ist das h2c mit zwingendem Preface |
| `addHttp3Listener($host, $port)` | UDP, HTTP/3 / QUIC. TLS 1.3 automatisch aktiv, das Server-Zertifikat wird verwendet |
| `addUnixListener($path)` | Unix-Socket, HTTP/1.1 + HTTP/2 (h2c-Stil) |

```php
$config
    ->addListener('0.0.0.0', 80)              // H1 + H2c
    ->addListener('0.0.0.0', 443, tls: true)  // H1 + H2 über TLS
    ->addHttp3Listener('0.0.0.0', 443);       // H3 / QUIC auf demselben Port
```

Für einen phasenweisen HTTP/3-Rollout kann der `Alt-Svc`-Hinweis temporär deaktiviert werden:

```php
$config->setHttp3AltSvcEnabled(false);
```

## TLS

```php
$config
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key');
```

Zertifikat und Schlüssel gelten für alle TLS-Listener (einschließlich HTTP/3). TLS 1.2/1.3, ALPN,
schwache Cipher sind deaktiviert, Stateless Session Tickets aktiv, Safe Renegotiation aus.

## Workers und Bootloader

`setWorkers(1)` (Standard) aktiviert den Single-Threaded-Modus: `start()` betreibt den Event-Loop
auf dem aufrufenden Thread.

`setWorkers(N > 1)` startet einen integrierten Pool aus N Threads über `Async\ThreadPool`. Jeder
Worker re-bindet dieselben Listener, der Kernel (Linux/BSD) verteilt Accepts via `SO_REUSEPORT`.
Das übergeordnete `start()` wartet auf den Abschluss aller Worker.

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // läuft einmalig in jedem Worker vor dem Task-Loop
        require __DIR__ . '/vendor/autoload.php';
        Database::warmupPool();
        OpcacheWarm::compile();
    });
```

Details: [Multi-Worker](/de/docs/server/workers.html).

## Timeouts

| Methode | Standard | Was wird beschränkt |
|---------|----------|---------------------|
| `setReadTimeout($sec)` | — | Empfang der gesamten Anfrage |
| `setWriteTimeout($sec)` | — | Senden der Antwort |
| `setKeepAliveTimeout($sec)` | — | Idle zwischen Anfragen; `0` deaktiviert Keep-Alive |
| `setShutdownTimeout($sec)` | — | Graceful Shutdown: wie lange auf aktive Anfragen gewartet wird |

## Limits und Backpressure

```php
$config
    ->setBacklog(1024)
    ->setMaxConnections(50_000)
    ->setMaxInflightRequests(10_000)
    ->setMaxBodySize(10 * 1024 * 1024)
    ->setBackpressureTargetMs(10);
```

- **`setMaxConnections($n)`** — hartes Limit für die Anzahl der TCP-Verbindungen. `0` hebt das Limit auf.
- **`setMaxInflightRequests($n)`** — Admission Control: ab diesem Wert aktiver Handler erhalten neue
  Anfragen eine schnelle Ablehnung. H1 → 503 + `Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM`
  (retry-safe nach RFC 7540 §8.1.4). Auf H2 hilft ein hartes Connection-Limit nicht, da neue Streams
  über eine bereits akzeptierte Verbindung kommen. `0` übernimmt den Wert `max_connections × 10`.
- **`setMaxBodySize($bytes)`** — Maximum für den Request-Body. Standard 10 MiB, Bereich 1 KiB..16 GiB.
  H1 liefert 413 und schließt die Verbindung; H2 sendet `RST_STREAM(INTERNAL_ERROR)`.
- **`setBackpressureTargetMs($ms)`** — Schwellwert für die CoDel-Sojourn-Zeit als Accept-Backpressure.
  Bleibt die Per-Request-Queue-Wait-Zeit 100 ms am Stück über dem Schwellwert, wird der Listen-Socket
  pausiert. `0` deaktiviert CoDel. Standard 5 ms; für typische Web-Last 10–20 ms; für langsame Handler
  (DB, IO) 50–100 ms.

### Graceful Drain (Step 8)

Steuerung der Lastmigration hinter einem L4-Loadbalancer:

| Methode | Default | Zweck |
|---------|---------|-------|
| `setMaxConnectionAgeMs($ms)` | 0 (off) | Nach ±10 % Jitter des Limits erhält eine Verbindung Connection: close (H1) oder GOAWAY (H2). Pendant zu gRPC `MAX_CONNECTION_AGE`. Produktion: 600_000 (10 min). |
| `setMaxConnectionAgeGraceMs($ms)` | 0 | Hard-Close nach `Connection: close`/GOAWAY. `0` deaktiviert den Force-Close-Timer. |
| `setDrainSpreadMs($ms)` | 5000 | Fenster zur gleichmäßigen Verteilung des Per-Connection-Drains bei CoDel-Trip / Hard-Cap (Anti-Thundering-Herd). |
| `setDrainCooldownMs($ms)` | 10_000 | Minimaler Abstand zwischen reaktiven Drain-Triggern. |

## HTTP/2-Streaming-Limits

```php
$config
    ->setStreamWriteBufferBytes(256 * 1024)  // 256 KiB pro Stream, 4 KiB .. 64 MiB
    ->setH2StaticBudgetMax(0);               // 0 = auto (memory_limit / 8)
```

`HttpResponse::send($chunk)` blockiert die Handler-Coroutine **nur** unter Backpressure: wenn der
Per-Stream-Staging-Buffer voll ist. Standard 256 KiB (zum Vergleich: gRPC-Go 64 KiB, Envoy 1 MiB,
Node.js 16 KiB).

## HTTP/3 Production Knobs

```php
$config
    ->setHttp3IdleTimeoutMs(30_000)           // RFC 9000 §10.1
    ->setHttp3StreamWindowBytes(256 * 1024)   // Per-Stream Flow Control
    ->setHttp3MaxConcurrentStreams(100)       // initial_max_streams_bidi
    ->setHttp3PeerConnectionBudget(16)        // Per-Source-IP Cap, Slow-Loris-Schutz
    ->setHttp3AltSvcEnabled(true);            // RFC 7838 Alt-Svc Announcement
```

Das Connection-Level `initial_max_data` ergibt sich als `window × max_concurrent_streams` (nginx-Muster).

## WebSocket

```php
$config
    ->setWsMaxMessageSize(1024 * 1024)   // 1 MiB, 128 .. 256 MiB
    ->setWsMaxFrameSize(1024 * 1024)     // 1 MiB, gleicher Bereich
    ->setWsPingIntervalMs(30_000)        // Keepalive-PING bei Idle
    ->setWsPongTimeoutMs(60_000)         // Deadline für die PONG-Antwort
    ->setWsPermessageDeflate(false);     // RFC 7692, standardmäßig aus
```

- **`setWsMaxMessageSize($bytes)`** — max. Größe für eine reassemblierte Nachricht. Wird sie
  überschritten, gibt es `1009 Message Too Big` und die Verbindung wird geschlossen (RFC 6455
  §7.4.1).
- **`setWsMaxFrameSize($bytes)`** — max. Größe für ein einzelnes Frame. Schutz vor
  Fragment-Flood, bei dem der Client Millionen winziger Fragmente sendet.
- **`setWsPingIntervalMs($ms)`** — wie oft der Server idle Verbindungen von sich aus pingt.
  `0` deaktiviert das automatische Ping.
- **`setWsPongTimeoutMs($ms)`** — wie lange auf PONG nach einem PING gewartet wird, bevor die
  Verbindung als tot behandelt und mit Code `1001 GoingAway` geschlossen wird. `0` deaktiviert
  den Timeout.
- **`setWsPermessageDeflate($bool)`** — RFC 7692, Komprimierung auf Nachrichtenebene.
  Standardmäßig aus: ein bewusstes Opt-in, weil Komprimierung CPU kostet und die Angriffsfläche
  für Decompression-Bombs vergrößert. Wird nur ausgehandelt, wenn der Client diese Extension
  selbst anbietet; erfordert einen Build mit zlib.

Siehe den [WebSocket-Guide](/de/docs/server/websocket.html) und die
[Referenz](/de/docs/reference/server/websocket.html) für die Connection-API selbst.

## Body-Streaming

Aktiviert pull-basiertes Streaming des Request-Bodys (Issue #26): die H1/H2-Parser legen Chunks in
eine Queue, der Handler liest sie über [`HttpRequest::readBody()`](/de/docs/reference/server/http-request.html#readbody),
ohne den gesamten Body im RAM zu halten.

```php
$config->setBodyStreamingEnabled(true);

$server->addHttpHandler(function ($req, $res) {
    while (($chunk = $req->readBody()) !== null) {
        // Chunk verarbeiten (z. B. streamendes Schreiben auf Disk, Parsen)
    }
    $res->setStatusCode(204);
});
```

Ohne `setBodyStreamingEnabled(true)` erhält der Handler den bereits vollständig gelesenen Body über
`getBody()`; `readBody()` ist in diesem Modus nicht verfügbar.

Vergleich für 50 parallele 20-MiB-POSTs (h2load, WSL2): Peak-RSS fällt von 1170 MiB auf **197 MiB**
(×6), der Durchsatz steigt von 36 req/s auf **100 req/s** (×2.7), weil der Handler-Dispatch nicht
mehr auf den vollständigen Body wartet.

Siehe auch [Streaming](/de/docs/server/streaming.html).

## Auto-Await Body

```php
$config->setAutoAwaitBody(true);   // Default: true
```

Wenn aktiviert, warten Non-Multipart-Anfragen auf den vollständigen Body, bevor der Handler aufgerufen
wird (Multipart streamt immer). Nützlich für klassische Body-Verarbeitung am Stück.

## JSON

```php
$config->setJsonEncodeFlags(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

Diese Flags greifen für [`HttpResponse::json()`](/de/docs/reference/server/http-response.html#json),
wenn der Aufrufer `$flags` nicht explizit übergibt. `JSON_THROW_ON_ERROR` wird stillschweigend
entfernt: ein Encoding-Fehler liefert eine 500 mit JSON-Fehlerbody, eine Exception wird nicht an
den Handler durchgereicht.

## Logging

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);   // beliebiger php_stream: Datei, php://stderr, php://memory, User-Wrapper
```

Der Logger ist standardmäßig deaktiviert (`LogSeverity::OFF`). Die Severity wird beim Start
festgeschrieben, Laufzeit-Änderungen sind nicht möglich (Single-Threaded Lock-Free-Modell).

Stufen (OpenTelemetry SeverityNumber):

| Stufe | Was geloggt wird |
|-------|------------------|
| `OFF` (0) | nichts |
| `DEBUG` (5) | Tracing von H3-Paketen u. a. |
| `INFO` (9) | Server-Lifecycle (start/stop), Bind-Retries |
| `WARN` (13) | TLS-Handshake-Fehler, Peer-Reset, absorbierte Exceptions |
| `ERROR` (17) | Listener-Bind-Failures, harte Protokollfehler |

`FATAL` fehlt bewusst: es wird über `zend_error_noreturn(E_ERROR)` ausgeliefert, was den Prozess
ohnehin beendet.

## Telemetrie (W3C Trace Context)

```php
$config->setTelemetryEnabled(true);
```

Wenn aktiviert, werden eingehende `traceparent` / `tracestate` geparst und an die Anfrage angeheftet.
Im Handler stehen zur Verfügung:

```php
$req->getTraceParent();   // raw header
$req->getTraceState();
$req->getTraceId();       // 32 lower-hex Zeichen
$req->getSpanId();        // 16 lower-hex Zeichen
$req->getTraceFlags();    // int (0x01 = sampled)
```

## Vollständige Referenz

Siehe [`TrueAsync\HttpServerConfig`](/de/docs/reference/server/http-server-config.html): alle
60+ Methoden mit detaillierter Beschreibung und gültigen Wertebereichen.
