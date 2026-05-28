---
layout: docs
lang: de
path_key: "/docs/reference/server/http-server.html"
nav_active: docs
permalink: /de/docs/reference/server/http-server.html
page_title: "TrueAsync\\HttpServer"
description: "TrueAsync\\HttpServer — Hauptklasse des integrierten HTTP-Servers. Handler-Registrierung, Start/Stop, Telemetrie, Runtime-Stats."
---

# TrueAsync\HttpServer

(PHP 8.6+, true_async_server 0.6+)

Hauptklasse des integrierten Servers. Erhält die Konfiguration über den Konstruktor, nimmt
Protokoll-Handler entgegen, wird über `start()` gestartet und blockiert den Thread bis `stop()`.

```php
namespace TrueAsync;

final class HttpServer
{
    public function __construct(HttpServerConfig $config);

    public function addHttpHandler(callable $handler): static;
    public function addStaticHandler(StaticHandler $handler): static;
    public function addWebSocketHandler(callable $handler): static;   // TODO
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

## Methoden

### __construct

```php
public HttpServer::__construct(HttpServerConfig $config)
```

Erstellt einen Server mit der angegebenen Konfiguration. **Die Konfiguration wird bei diesem Aufruf
eingefroren** — nachfolgende Setter werfen `HttpServerRuntimeException`.

### addHttpHandler

```php
public HttpServer::addHttpHandler(callable $handler): static
```

Registriert einen Handler für HTTP/1.1- und HTTP/2-Anfragen. Signatur:

```php
function (HttpRequest $request, HttpResponse $response): void
```

Jede Anfrage läuft in einer **eigenen Coroutine** im [Per-Request Scope](/de/docs/server/workers.html#per-request-scope).
Der Handler gibt `void` zurück; die Antwort wird über `$response` gesendet.

### addStaticHandler

```php
public HttpServer::addStaticHandler(StaticHandler $handler): static
```

Registriert einen Static-Mount (Issue #13). Anfragen unter `$handler->getUrlPrefix()` werden
**vollständig in C** bedient — ohne Coroutine-Spawn, ohne Eintritt in die PHP-VM.

Mehrere Mounts werden in Registrierungsreihenfolge gematcht. Nach dem Attach wird der Handler
**gesperrt** — jeder Setter darauf wirft `HttpServerRuntimeException`.

Siehe [`StaticHandler`](/de/docs/reference/server/static-handler.html).

### addWebSocketHandler

```php
public HttpServer::addWebSocketHandler(callable $handler): static
```

📋 Geplant. RFC 6455, Upgrade von HTTP/1.1 und HTTP/2.

### addHttp2Handler

```php
public HttpServer::addHttp2Handler(callable $handler): static
```

📋 Geplant. Aktuell landen HTTP/2-Anfragen in `addHttpHandler` (gemeinsamer H1/H2-Dispatcher).

### addGrpcHandler

```php
public HttpServer::addGrpcHandler(callable $handler): static
```

📋 Geplant. Über HTTP/2, unary und streaming RPC.

### start

```php
public HttpServer::start(): bool
```

Startet den Server und blockiert den aufrufenden Thread bis `stop()` oder ein fataler Fehler.

- Bei `setWorkers(1)` — Event-Loop läuft auf dem aufrufenden Thread.
- Bei `setWorkers(N > 1)` — spawnt `Async\ThreadPool` mit N Workern und `await`et deren Ende.

Liefert `true` bei regulärem Stop. Wirft `HttpServerException` (und Subklassen) bei Startfehlern
(Bind failed, fehlender HTTP/3-Build, wenn `addHttp3Listener` vorhanden ist, etc.).

### stop

```php
public HttpServer::stop(): bool
```

Graceful Shutdown:

1. Stoppt die Annahme neuer Verbindungen.
2. Wartet auf das Ende aktiver Anfragen (bis `setShutdownTimeout()`).
3. Schließt alle Verbindungen.

Liefert `true` bei erfolgreichem Stop.

> Cross-Thread-`stop()` — in der Roadmap. Derzeit wird der Stop meistens über SIGINT/SIGTERM
> ausgelöst.

### isRunning

```php
public HttpServer::isRunning(): bool
```

### getConfig

```php
public HttpServer::getConfig(): HttpServerConfig
```

Liefert **dasselbe** Config-Objekt, das in `__construct` übergeben wurde. Nach dem Server-Start
ist die Konfiguration gesperrt (`isLocked() === true`).

### getHttp3Stats

```php
public HttpServer::getHttp3Stats(): array
```

Per-Listener-Observability für HTTP/3. Ein Eintrag pro `addHttp3Listener()` in Registrierungsreihenfolge.
Jeder Eintrag enthält:

| Schlüssel | Wert |
|-----------|------|
| `host` | gebundener Host |
| `port` | UDP-Port |
| `datagrams_received` | Zähler eingegangener Datagramme |
| `bytes_received` | empfangene Bytes |
| `datagrams_errored` | Datagramme mit Fehler |
| `last_datagram_size` | Größe des letzten Datagramms |
| `last_peer` | letzter Peer (string) |

Liefert ein leeres Array, wenn die Extension **ohne** `--enable-http3` gebaut wurde.

### getRuntimeStats

```php
public HttpServer::getRuntimeStats(): array
```

Snapshot der internen Server-Allokatoren. Hilft, RSS-Wachstum konkreten Subsystemen zuzuordnen.

| Schlüssel | Bedeutung |
|-----------|-----------|
| `conn_arena_live` | aktuell genutzte `http_connection_t`-Slots (einer pro Live-TCP-Connection) |
| `conn_arena_slots` | Gesamtzahl Slots in den Chunks (live + free, kein Shrink) |
| `conn_arena_chunks` | committeerte Chunks; jeder = `CONN_ARENA_CHUNK_SLOTS` (256) Structs à ~768 B |
| `conn_arena_bytes` | `chunks × 256 × sizeof(http_connection_t)` — virtuelles Commitment |
| `body_pool` | Per-Size-Class LIFO für große Request-Bodies (1 MB..128 MB). Jeder Eintrag: `slot_bytes`, `count`, `bytes` |
| `body_pool_total_bytes` | Summe `bytes` über alle Klassen |

### getTelemetry

```php
public HttpServer::getTelemetry(): array
```

📋 Geplant.

### resetTelemetry

```php
public HttpServer::resetTelemetry(): bool
```

📋 Geplant.

## Beispiel

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

## Siehe auch

- [`TrueAsync\HttpServerConfig`](/de/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/de/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/de/docs/reference/server/http-response.html)
- [Schnellstart](/de/docs/server/quickstart.html)
