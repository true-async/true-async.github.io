---
layout: docs
lang: it
path_key: "/docs/reference/server/http-server.html"
nav_active: docs
permalink: /it/docs/reference/server/http-server.html
page_title: "TrueAsync\\HttpServer"
description: "TrueAsync\\HttpServer: classe principale del server HTTP integrato. Registrazione degli handler, start/stop, telemetria, statistiche runtime."
---

# TrueAsync\HttpServer

(PHP 8.6+, true_async_server 0.6+)

Classe principale del server integrato. Riceve la configurazione tramite il costruttore, accetta
handler di protocollo, si avvia con `start()` e blocca il thread fino a `stop()`.

```php
namespace TrueAsync;

final class HttpServer
{
    public function __construct(HttpServerConfig $config);

    public function addHttpHandler(callable $handler): static;
    public function addStaticHandler(StaticHandler $handler): static;
    public function addWebSocketHandler(callable $handler): static;
    public function addHttp2Handler(callable $handler): static;       // TODO
    public function addGrpcHandler(callable $handler): static;        // TODO

    public function start(): bool;
    public function stop(): bool;
    public function isRunning(): bool;

    public function getConfig(): HttpServerConfig;
    public function getHttp3Stats(): array;
    public function getRuntimeStats(): array;
    public function getTelemetry(): array;        // TODO
    public function resetTelemetry(): bool;       // TODO
}
```

## Metodi

### __construct

```php
public HttpServer::__construct(HttpServerConfig $config)
```

Crea il server con la configurazione data. **La configurazione viene congelata** in questa chiamata:
i setter successivi lanciano `HttpServerRuntimeException`.

### addHttpHandler

```php
public HttpServer::addHttpHandler(callable $handler): static
```

Registra l'handler per le richieste HTTP/1.1 e HTTP/2. Firma:

```php
function (HttpRequest $request, HttpResponse $response): void
```

Ogni richiesta gira in una **propria coroutine** nello [scope per richiesta](/it/docs/server/workers.html#scope-per-richiesta).
L'handler restituisce `void`; la risposta viene inviata tramite `$response`.

### addStaticHandler

```php
public HttpServer::addStaticHandler(StaticHandler $handler): static
```

Registra un static mount (issue #13). Le richieste sotto `$handler->getUrlPrefix()` vengono servite
**interamente in C**: niente coroutine, niente VM PHP.

I mount multipli vengono confrontati nell'ordine di registrazione. Dopo l'attach l'handler viene
**bloccato**: qualsiasi setter lancia `HttpServerRuntimeException`.

Vedi [`StaticHandler`](/it/docs/reference/server/static-handler.html).

### addWebSocketHandler

```php
public HttpServer::addWebSocketHandler(callable $handler): static
```

Registra un handler per connessioni WebSocket full-duplex (RFC 6455). L'upgrade è accettato da
HTTP/1.1 e da HTTP/2 (RFC 8441 Extended CONNECT), oltre a `wss://` su TLS e permessage-deflate
(RFC 7692). Ogni connessione viene servita dalla propria coroutine.

Sono supportate due firme; il server controlla quanti parametri dichiara l'handler:

```php
function (WebSocket $ws): void
function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade): void
```

La forma a due parametri (solo `$ws`) accetta l'upgrade con le impostazioni predefinite. La forma
a tre parametri dà accesso a `WebSocketUpgrade`: negoziazione del subprotocollo e possibilità di
rifiutare l'upgrade prima che venga inviata la risposta `101`.

Vedi la [guida WebSocket](/it/docs/server/websocket.html) e il
[riferimento della classe `WebSocket`](/it/docs/reference/server/websocket.html).

### addHttp2Handler

```php
public HttpServer::addHttp2Handler(callable $handler): static
```

In roadmap. Attualmente le richieste HTTP/2 finiscono in `addHttpHandler` (dispatcher comune H1/H2).

### addGrpcHandler

```php
public HttpServer::addGrpcHandler(callable $handler): static
```

In roadmap. Sopra HTTP/2, RPC unary e streaming.

### start

```php
public HttpServer::start(): bool
```

Avvia il server e blocca il thread chiamante fino a `stop()` o a un errore fatale.

- Con `setWorkers(1)`: gira l'event loop sul thread chiamante.
- Con `setWorkers(N > 1)`: crea un `Async\ThreadPool` di N worker e ne attende il termine.

Restituisce `true` su arresto regolare. Lancia `HttpServerException` (e discendenti) per errori di
avvio (bind fallito, build senza HTTP/3 ma con `addHttp3Listener` ecc.).

### stop

```php
public HttpServer::stop(): bool
```

Graceful shutdown:

1. Smette di accettare nuove connessioni.
2. Attende il termine delle richieste attive (fino a `setShutdownTimeout()`).
3. Chiude tutte le connessioni.

Restituisce `true` su arresto riuscito.

> `stop()` cross-thread è in roadmap. Oggi l'arresto si fa di solito tramite SIGINT/SIGTERM.

### isRunning

```php
public HttpServer::isRunning(): bool
```

### getConfig

```php
public HttpServer::getConfig(): HttpServerConfig
```

Restituisce **lo stesso** oggetto config passato a `__construct`. Dopo l'avvio del server la
configurazione è bloccata (`isLocked() === true`).

### getHttp3Stats

```php
public HttpServer::getHttp3Stats(): array
```

Observability per singolo listener HTTP/3. Una voce per ogni `addHttp3Listener()` nell'ordine di
registrazione. Ogni voce contiene:

| Chiave | Valore |
|--------|--------|
| `host` | host a cui è legato |
| `port` | porta UDP |
| `datagrams_received` | contatore di datagrammi ricevuti |
| `bytes_received` | byte ricevuti |
| `datagrams_errored` | datagrammi con errore |
| `last_datagram_size` | dimensione dell'ultimo datagramma |
| `last_peer` | ultimo peer (string) |

Restituisce un array vuoto quando l'estensione è compilata **senza** `--enable-http3`.

### getRuntimeStats

```php
public HttpServer::getRuntimeStats(): array
```

Snapshot degli allocatori interni del server. Aiuta ad attribuire la crescita dell'RSS a specifici
sottosistemi.

| Chiave | Significato |
|--------|-------------|
| `conn_arena_live` | slot `http_connection_t` attualmente in uso (uno per connessione TCP viva) |
| `conn_arena_slots` | slot totali nei chunk (live + free, non si riduce) |
| `conn_arena_chunks` | quanti chunk sono committati; ciascuno è di `CONN_ARENA_CHUNK_SLOTS` (256) strutture da ~768 B |
| `conn_arena_bytes` | `chunks × 256 × sizeof(http_connection_t)`: commitment virtuale |
| `body_pool` | LIFO per classe di dimensione di corpi richiesta grandi (1 MB..128 MB). Ogni voce: `slot_bytes`, `count`, `bytes` |
| `body_pool_total_bytes` | somma di `bytes` su tutte le classi |

### getTelemetry

```php
public HttpServer::getTelemetry(): array
```

In roadmap.

### resetTelemetry

```php
public HttpServer::resetTelemetry(): bool
```

In roadmap.

## Esempio

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\StaticHandler;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addStaticHandler(
    (new StaticHandler('/assets/', __DIR__ . '/public'))
        ->enablePrecompressed('br', 'gzip')
);

$server->addHttpHandler(function ($req, $res) {
    $res->json(['ok' => true, 'path' => $req->getPath()]);
});

$server->start();
```

## Vedi anche

- [`TrueAsync\HttpServerConfig`](/it/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/it/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/it/docs/reference/server/http-response.html)
- [`TrueAsync\WebSocket`](/it/docs/reference/server/websocket.html)
- [Avvio rapido](/it/docs/server/quickstart.html)
