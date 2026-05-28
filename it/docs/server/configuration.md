---
layout: docs
lang: it
path_key: "/docs/server/configuration.html"
nav_active: docs
permalink: /it/docs/server/configuration.html
page_title: "TrueAsync Server: configurazione"
description: "HttpServerConfig: listener, TLS, timeout, contropressione, limiti del corpo, streaming del corpo, flag JSON, logging, HTTP/3."
---

# Configurazione di TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

Tutta la configurazione del server è impostata tramite l'oggetto
[`TrueAsync\HttpServerConfig`](/it/docs/reference/server/http-server-config.html) prima di chiamare
`new HttpServer($config)`. Una volta creato l'`HttpServer`, la configurazione viene **congelata**:
qualsiasi setter lancerà `HttpServerRuntimeException`.

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

I setter restituiscono `static`, quindi la configurazione si costruisce a catena.

## Listener

Il server può ascoltare un numero arbitrario di socket TCP/Unix e porte UDP (per HTTP/3) contemporaneamente.

| Metodo | Cosa fa |
|--------|---------|
| `addListener($host, $port, $tls = false)` | TCP, HTTP/1.1 + HTTP/2 (h2c tramite preface in plaintext, h2 tramite ALPN su TLS) |
| `addHttp1Listener($host, $port, $tls = false)` | TCP, solo HTTP/1.1. Un client con preface HTTP/2 riceverà 400 |
| `addHttp2Listener($host, $port, $tls = false)` | TCP, solo HTTP/2. Senza TLS è h2c con preface obbligatorio |
| `addHttp3Listener($host, $port)` | UDP, HTTP/3 / QUIC. TLS 1.3 abilitato automaticamente, viene usato il certificato del server |
| `addUnixListener($path)` | Socket Unix, HTTP/1.1 + HTTP/2 (stile h2c) |

```php
$config
    ->addListener('0.0.0.0', 80)              // H1 + H2c
    ->addListener('0.0.0.0', 443, tls: true)  // H1 + H2 su TLS
    ->addHttp3Listener('0.0.0.0', 443);       // H3 / QUIC sulla stessa porta
```

Per un rollout graduale di HTTP/3 è possibile disattivare temporaneamente l'annuncio `Alt-Svc`:

```php
$config->setHttp3AltSvcEnabled(false);
```

## TLS

```php
$config
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key');
```

Il certificato e la chiave sono comuni a tutti i listener TLS (incluso HTTP/3). TLS 1.2/1.3, ALPN,
cifrari deboli disattivati, stateless session ticket, rinegoziazione sicura disattivata.

## Worker e bootloader

`setWorkers(1)` (valore predefinito) abilita la modalità single-threaded: `start()` fa girare l'event
loop sul thread chiamante.

`setWorkers(N > 1)` avvia il pool integrato di N thread tramite `Async\ThreadPool`. Ogni worker rifa
il bind degli stessi listener, e il kernel (Linux/BSD) distribuisce gli accept tramite `SO_REUSEPORT`.
Lo `start()` del processo padre attende il termine di tutti i worker.

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // eseguito una sola volta in ogni worker prima del task loop
        require __DIR__ . '/vendor/autoload.php';
        Database::warmupPool();
        OpcacheWarm::compile();
    });
```

Dettagli: [Multi-worker](/it/docs/server/workers.html).

## Timeout

| Metodo | Predefinito | Cosa fa scattare il timeout |
|--------|-------------|-----------------------------|
| `setReadTimeout($sec)` | — | ricezione completa della richiesta |
| `setWriteTimeout($sec)` | — | invio della risposta |
| `setKeepAliveTimeout($sec)` | — | idle tra una richiesta e l'altra; `0` disattiva il keep-alive |
| `setShutdownTimeout($sec)` | — | graceful shutdown: quanto attendere le richieste attive |

## Limiti e contropressione

```php
$config
    ->setBacklog(1024)
    ->setMaxConnections(50_000)
    ->setMaxInflightRequests(10_000)
    ->setMaxBodySize(10 * 1024 * 1024)
    ->setBackpressureTargetMs(10);
```

- **`setMaxConnections($n)`**: limite rigido sul numero di connessioni TCP. `0` rimuove il limite.
- **`setMaxInflightRequests($n)`**: controllo di ammissione: superato questo numero di handler attivi
  le nuove richieste ricevono un rifiuto rapido. H1 → 503 + `Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM`
  (retry-safe per RFC 7540 §8.1.4). Su H2 il limite rigido sulle connessioni non basta, perché i
  nuovi stream arrivano su una connessione già accettata. `0` usa il valore `max_connections × 10`.
- **`setMaxBodySize($bytes)`**: massimo per il corpo della richiesta. Predefinito 10 MiB, intervallo
  1 KiB..16 GiB. H1 risponde 413 e chiude la connessione; H2 invia `RST_STREAM(INTERNAL_ERROR)`.
- **`setBackpressureTargetMs($ms)`**: soglia CoDel del sojourn per la contropressione lato accept.
  Quando il tempo di attesa in coda per richiesta resta sopra la soglia per 100 ms consecutivi, il
  socket in ascolto viene messo in pausa. `0` disattiva CoDel. Predefinito 5 ms; per un web tipico
  10–20 ms; per handler lenti (DB, IO) 50–100 ms.

### Graceful drain (Step 8)

Gestione della migrazione del carico dietro un bilanciatore L4:

| Metodo | Default | Scopo |
|--------|---------|-------|
| `setMaxConnectionAgeMs($ms)` | 0 (off) | Dopo un limite con jitter ±10% la connessione riceve Connection: close (H1) o GOAWAY (H2). Analogo a `MAX_CONNECTION_AGE` di gRPC. Produzione: 600_000 (10 min). |
| `setMaxConnectionAgeGraceMs($ms)` | 0 | Hard-close dopo `Connection: close`/GOAWAY. `0` disattiva il timer di force-close. |
| `setDrainSpreadMs($ms)` | 5000 | Finestra di distribuzione uniforme del drain per connessione al trigger di CoDel / hard-cap (anti-thundering-herd). |
| `setDrainCooldownMs($ms)` | 10_000 | Gap minimo tra trigger reattivi di drain. |

## Limiti dello streaming HTTP/2

```php
$config
    ->setStreamWriteBufferBytes(256 * 1024)  // 256 KiB per stream, 4 KiB .. 64 MiB
    ->setH2StaticBudgetMax(0);               // 0 = auto (memory_limit / 8)
```

`HttpResponse::send($chunk)` blocca la coroutine dell'handler **soltanto** in caso di contropressione:
quando lo staging buffer per stream è pieno. Predefinito 256 KiB (per confronto: gRPC-Go 64 KiB,
Envoy 1 MiB, Node.js 16 KiB).

## Parametri di produzione per HTTP/3

```php
$config
    ->setHttp3IdleTimeoutMs(30_000)           // RFC 9000 §10.1
    ->setHttp3StreamWindowBytes(256 * 1024)   // flow control per stream
    ->setHttp3MaxConcurrentStreams(100)       // initial_max_streams_bidi
    ->setHttp3PeerConnectionBudget(16)        // limite per IP di origine, protezione slow-loris
    ->setHttp3AltSvcEnabled(true);            // annuncio Alt-Svc RFC 7838
```

L'`initial_max_data` a livello di connessione viene derivato come `window × max_concurrent_streams`
(pattern di nginx).

## Streaming del corpo

Abilita la lettura pull-based del corpo della richiesta (issue #26): i parser H1/H2 mettono i blocchi
in coda e l'handler li legge tramite
[`HttpRequest::readBody()`](/it/docs/reference/server/http-request.html#readbody) senza tenere
l'intero corpo in RAM.

```php
$config->setBodyStreamingEnabled(true);

$server->addHttpHandler(function ($req, $res) {
    while (($chunk = $req->readBody()) !== null) {
        // elabora il blocco (es. scrittura a blocchi su disco, parsing)
    }
    $res->setStatusCode(204);
});
```

Senza `setBodyStreamingEnabled(true)` l'handler riceve il corpo già letto interamente tramite
`getBody()`; `readBody()` in quella modalità non è disponibile.

Confronto su 50 POST paralleli da 20 MiB (h2load, WSL2): l'RSS di picco cala da 1170 MiB a
**197 MiB** (×6), il throughput passa da 36 req/s a **100 req/s** (×2.7), perché il dispatch
dell'handler non aspetta più il corpo completo.

Vedi anche [Streaming](/it/docs/server/streaming.html).

## Attesa automatica del corpo

```php
$config->setAutoAwaitBody(true);   // default: true
```

Se abilitato, le richieste non multipart attendono il corpo completo prima della chiamata
all'handler (il multipart è sempre in streaming). Utile per l'elaborazione classica del corpo intero.

## JSON

```php
$config->setJsonEncodeFlags(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

Questi flag si applicano a [`HttpResponse::json()`](/it/docs/reference/server/http-response.html#json)
quando il chiamante non passa `$flags` esplicitamente. `JSON_THROW_ON_ERROR` viene rimosso
silenziosamente: un errore di encoding produce un 500 con corpo JSON di errore, l'eccezione non viene
propagata all'handler.

## Logging

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);   // qualsiasi php_stream: file, php://stderr, php://memory, user wrapper
```

Il logger è disattivato per impostazione predefinita (`LogSeverity::OFF`). La severity viene fissata
all'avvio, non sono supportati cambi a runtime (modello single-threaded lock-free).

Livelli (OpenTelemetry SeverityNumber):

| Livello | Cosa rientra |
|---------|--------------|
| `OFF` (0) | nulla |
| `DEBUG` (5) | tracciamento dei pacchetti H3 e altro |
| `INFO` (9) | lifecycle del server (start/stop), retry di bind |
| `WARN` (13) | fallimenti dell'handshake TLS, reset del peer, eccezioni assorbite |
| `ERROR` (17) | bind del listener fallito, errori di protocollo non recuperabili |

`FATAL` è assente di proposito: passa per `zend_error_noreturn(E_ERROR)`, che termina già il processo.

## Telemetria (W3C Trace Context)

```php
$config->setTelemetryEnabled(true);
```

Quando è attivo, `traceparent` / `tracestate` in ingresso vengono analizzati e agganciati alla
richiesta. Nell'handler sono disponibili:

```php
$req->getTraceParent();   // header grezzo
$req->getTraceState();
$req->getTraceId();       // 32 caratteri lower-hex
$req->getSpanId();        // 16 caratteri lower-hex
$req->getTraceFlags();    // int (0x01 = sampled)
```

## Riferimento completo

Vedi [`TrueAsync\HttpServerConfig`](/it/docs/reference/server/http-server-config.html): tutti i 60+
metodi con descrizione dettagliata e intervalli di valori validi.
