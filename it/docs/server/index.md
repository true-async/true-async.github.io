---
layout: docs
lang: it
path_key: "/docs/server/index.html"
nav_active: docs
permalink: /it/docs/server/index.html
page_title: "TrueAsync Server"
description: "TrueAsync Server: estensione PHP nativa che trasforma PHP in un server HTTP/1.1/2/3 ad alte prestazioni. Multi-protocollo, TLS 1.2/1.3, compressione, coroutine — tutto in un unico processo."
---

# TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

**TrueAsync Server** è un'estensione PHP nativa che esegue un server HTTP performante
**direttamente all'interno del processo PHP**. Niente daemon separato, niente reverse proxy, niente ponte FastCGI.

Supporta da subito **HTTP/1.1 e HTTP/2 sulla stessa porta TCP**. La scelta del protocollo
avviene tramite negoziazione ALPN (per TLS) o tramite HTTP Upgrade. HTTP/3 lavora sulla stessa
porta UDP (QUIC) e viene annunciato ai client tramite l'header `Alt-Svc`.

WebSocket e SSE sono già completi e girano sullo stesso modello di un unico listener con
rilevamento del protocollo. gRPC su HTTP/2 è ancora in lavorazione (vedi [Roadmap](#funzionalità)).

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

## Perché

**L'obiettivo del server è liberare il potenziale delle applicazioni PHP concorrenti.**

TrueAsync ha dato al linguaggio coroutine reali, I/O non bloccante e pool di connessioni. Perché
quel potenziale si traduca in carichi di produzione, serve un server progettato fin dall'inizio
attorno a questo modello: un processo a vita lunga con un event loop, in cui ogni richiesta riceve
la propria coroutine e lo scheduler alterna tra di esse a ogni attesa di I/O.

TrueAsync Server è esattamente questo server. Nessuno strato intermedio fra coroutine e rete:
listener, parser del protocollo, dispatcher delle richieste e handler vivono nello stesso processo
e nello stesso event loop. Le connessioni al database si riusano tramite `Async\Pool`, opcache resta
caldo tra una richiesta e l'altra, il cold start si paga una volta sola, su `start()`.

## Funzionalità

| Stato | Funzionalità | Dettagli |
|-------|--------------|----------|
| Pronto | **HTTP/1.1** | Conformità completa a RFC 9112, keep-alive, pipelining (tramite [llhttp](https://github.com/nodejs/llhttp), lo stesso parser usato da Node.js) |
| Pronto | **HTTP/2** | Multiplexing, server push (libnghttp2 ≥ 1.57, soglia per CVE-2023-44487) |
| Pronto | **HTTP/3 / QUIC** | Trasporto UDP su libngtcp2 + libnghttp3, API QUIC TLS di OpenSSL 3.5 |
| Pronto | **TLS 1.2 / 1.3** | OpenSSL 3.x, negoziazione ALPN, cifrari deboli disattivati |
| Pronto | **Compressione** | gzip (zlib-ng / zlib), Brotli, zstd: sia in uscita sia in decompressione dei corpi in ingresso, su tutti i protocolli |
| Pronto | **Multipart / upload file** | Parser di streaming zero-copy |
| Pronto | **Contropressione** | CoDel (RFC 8289), sospensione adattiva dell'accept sotto carico |
| Pronto | **Streaming del corpo della richiesta** | Opzionale tramite [`HttpRequest::readBody()`](/it/docs/reference/server/http-request.html); upload senza tenere il corpo in RAM |
| Pronto | **sendFile** | Invio efficiente di file dal disco direttamente dall'handler |
| Pronto | **Pool di worker integrato** | `setWorkers(N)`: N thread tramite `Async\ThreadPool` + `SO_REUSEPORT` |
| Pronto | **Scope per richiesta** | Ogni handler nel proprio scope; `Async\request_context()` fornisce un contesto comune a tutto l'albero di coroutine della richiesta |
| Pronto | **Coroutine native** | Integrazione profonda con TrueAsync: qualunque I/O bloccante nell'handler sospende la coroutine, non il thread |
| Pronto | **Zero-copy** | Allocazioni minime sul percorso caldo |
| Pronto | **WebSocket** | RFC 6455, Upgrade da HTTP/1.1 e HTTP/2 (RFC 8441 Extended CONNECT), `wss://`, permessage-deflate (RFC 7692), full-duplex, contropressione, tutti i 246 test di Autobahn|Testsuite |
| Pronto | **SSE** | `text/event-stream` su HTTP/1.1, HTTP/2 e HTTP/3, lo stesso handler indipendentemente dal protocollo |
| In roadmap | **gRPC** | Sopra HTTP/2, unary e streaming |

## Architettura: event loop a thread singolo

Lo stesso modello usato da [NGINX](https://nginx.org), [Envoy](https://www.envoyproxy.io),
[Node.js](https://nodejs.org) e da Rust [Tokio](https://tokio.rs)/[hyper](https://hyper.rs).

**Un solo thread possiede sia la connessione sia la richiesta, dall'accept fino al send.**
Nessun passaggio fra accept-thread e worker-thread, nessun lock, nessun cambio di contesto fra di loro.
Un unico event loop accetta la connessione, legge i byte dal socket, fa il parsing HTTP, smista
la richiesta all'handler e scrive la risposta, senza mai lasciare il thread.

```
       ┌─────────────────────────────────────────┐
       │              Event Loop Thread          │
       │                                         │
accept ─►  parse  ─►  dispatch  ─►  respond      │
       │     ▲                        │          │
       │     └──── coroutine yield ◄──┘          │
       └─────────────────────────────────────────┘
```

L'I/O non bloccante è gestito dal **reactor libuv** (tramite TrueAsync). Quando una coroutine deve
attendere un file, il database o il prossimo frame WebSocket, cede il controllo all'event loop, che
sceglie subito il prossimo evento pronto. Il thread non resta mai fermo in `read()`/`recv()`.

Per scalare sui core si attiva la modalità **multi-worker** tramite
[`setWorkers(N)`](/it/docs/reference/server/http-server-config.html#setworkers):
l'`Async\ThreadPool` integrato avvia N thread OS, ciascuno con il proprio event loop indipendente,
e `SO_REUSEPORT` (Linux/BSD) lascia che sia il kernel a distribuire le connessioni in ingresso fra
di loro. Nessuno stato condiviso, nessun lock globale.

## Da dove iniziare

- [Avvio rapido](/it/docs/server/quickstart.html): installazione ed esempio minimo in 5 minuti
- [Configurazione](/it/docs/server/configuration.html): listener, worker, TLS, timeout, streaming del corpo, bootloader
- [Compressione](/it/docs/server/compression.html): gzip / brotli / zstd, negoziazione, BREACH
- [File statici e sendFile](/it/docs/server/static-files.html): `StaticHandler`, sidecar precompressi, Range
- [Streaming](/it/docs/server/streaming.html): streaming del corpo della richiesta e della risposta
- [SSE](/it/docs/server/sse.html): Server-Sent Events, `sseEvent()`, riconnessione, heartbeat
- [WebSocket](/it/docs/server/websocket.html): connessioni full-duplex, contropressione, keepalive
- [Multi-worker](/it/docs/server/workers.html): `setWorkers(N)`, bootloader, scope per richiesta
- [Esempi](/it/docs/server/examples.html): API JSON, file statici, fan-out, upload multipart
- [Architettura](/it/architecture/server.html): internals

### Riferimento API

- [`TrueAsync\HttpServer`](/it/docs/reference/server/http-server.html)
- [`TrueAsync\HttpServerConfig`](/it/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/it/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/it/docs/reference/server/http-response.html)
- [`TrueAsync\WebSocket`](/it/docs/reference/server/websocket.html)
- [`TrueAsync\StaticHandler`](/it/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/it/docs/reference/server/send-file-options.html)
- [`TrueAsync\UploadedFile`](/it/docs/reference/server/uploaded-file.html)
- [`TrueAsync\LogSeverity`](/it/docs/reference/server/log-severity.html)
- [Eccezioni](/it/docs/reference/server/exceptions.html)

## Alternative

[FrankenPHP](/it/docs/frankenphp.html) è un server embeddable separato basato su Caddy/Go, in cui
PHP funge da worker. Conveniente quando servono le funzionalità di Caddy (Let's Encrypt automatico,
configurazione tramite Caddyfile) o l'integrazione in un'infrastruttura Caddy esistente.
TrueAsync Server è l'alternativa nativa senza runtime Go: il server vive direttamente nel processo PHP.
