---
layout: docs
lang: es
path_key: "/docs/reference/server/http-server.html"
nav_active: docs
permalink: /es/docs/reference/server/http-server.html
page_title: "TrueAsync\\HttpServer"
description: "TrueAsync\\HttpServer: clase principal del servidor HTTP integrado. Registro de manejadores, start/stop, telemetría, estadísticas de runtime."
---

# TrueAsync\HttpServer

(PHP 8.6+, true_async_server 0.6+)

Clase principal del servidor integrado. Recibe el config en el constructor, acepta manejadores de
protocolo, arranca mediante `start()` y bloquea el hilo hasta `stop()`.

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

## Métodos

### __construct

```php
public HttpServer::__construct(HttpServerConfig $config)
```

Crea el servidor con el config dado. **El config queda congelado** en esta llamada; los setters
posteriores lanzan `HttpServerRuntimeException`.

### addHttpHandler

```php
public HttpServer::addHttpHandler(callable $handler): static
```

Registra el manejador de solicitudes HTTP/1.1 y HTTP/2. Firma:

```php
function (HttpRequest $request, HttpResponse $response): void
```

Cada solicitud se ejecuta en **su propia corrutina** dentro de un
[scope por solicitud](/es/docs/server/workers.html#scope-por-solicitud). El manejador devuelve
`void`; la respuesta se envía mediante `$response`.

### addStaticHandler

```php
public HttpServer::addStaticHandler(StaticHandler $handler): static
```

Registra un static-mount (issue #13). Las solicitudes bajo `$handler->getUrlPrefix()` se atienden
**completamente en C**, sin spawn de corrutina y sin entrar a la VM de PHP.

Los mounts múltiples se evalúan en orden de registro. Tras el attach el handler queda
**bloqueado**; cualquier setter sobre él lanza `HttpServerRuntimeException`.

Véase [`StaticHandler`](/es/docs/reference/server/static-handler.html).

### addWebSocketHandler

```php
public HttpServer::addWebSocketHandler(callable $handler): static
```

📋 Planificado. RFC 6455, upgrade desde HTTP/1.1 y HTTP/2.

### addHttp2Handler

```php
public HttpServer::addHttp2Handler(callable $handler): static
```

📋 Planificado. Por ahora las solicitudes HTTP/2 entran a `addHttpHandler` (dispatcher común
H1/H2).

### addGrpcHandler

```php
public HttpServer::addGrpcHandler(callable $handler): static
```

📋 Planificado. Sobre HTTP/2, RPC unario y streaming.

### start

```php
public HttpServer::start(): bool
```

Arranca el servidor y bloquea el hilo llamante hasta `stop()` o un error fatal.

- Con `setWorkers(1)`: mantiene el event-loop en el hilo llamante.
- Con `setWorkers(N > 1)`: spawnea un `Async\ThreadPool` de N workers y hace `await` de su
  terminación.

Devuelve `true` en una parada normal. Lanza `HttpServerException` (y descendientes) ante errores
de arranque (bind failed, build sin soporte de HTTP/3 cuando hay `addHttp3Listener`, etc.).

### stop

```php
public HttpServer::stop(): bool
```

Graceful shutdown:

1. Deja de aceptar nuevas conexiones.
2. Espera a que terminen las solicitudes activas (hasta `setShutdownTimeout()`).
3. Cierra todas las conexiones.

Devuelve `true` ante una parada correcta.

> `stop()` cross-thread está en la hoja de ruta. Actualmente la parada se inicia normalmente con
> SIGINT/SIGTERM.

### isRunning

```php
public HttpServer::isRunning(): bool
```

### getConfig

```php
public HttpServer::getConfig(): HttpServerConfig
```

Devuelve **el mismo** objeto de config que se pasó al `__construct`. Tras el arranque del
servidor, el config está bloqueado (`isLocked() === true`).

### getHttp3Stats

```php
public HttpServer::getHttp3Stats(): array
```

Observabilidad por listener para HTTP/3. Una entrada por cada `addHttp3Listener()` en orden de
registro. Cada entrada contiene:

| Clave | Valor |
|-------|-------|
| `host` | host enlazado |
| `port` | puerto UDP |
| `datagrams_received` | contador de datagramas recibidos |
| `bytes_received` | bytes recibidos |
| `datagrams_errored` | datagramas con error |
| `last_datagram_size` | tamaño del último datagrama |
| `last_peer` | último peer (string) |

Devuelve un array vacío cuando la extensión está compilada **sin** `--enable-http3`.

### getRuntimeStats

```php
public HttpServer::getRuntimeStats(): array
```

Snapshot de los allocators internos del servidor. Ayuda a atribuir el crecimiento del RSS a
subsistemas concretos.

| Clave | Qué significa |
|-------|---------------|
| `conn_arena_live` | slots de `http_connection_t` actualmente en uso (uno por TCP-connection viva) |
| `conn_arena_slots` | slots totales en los chunks (live + free, no se reduce) |
| `conn_arena_chunks` | chunks commiteados; cada uno son `CONN_ARENA_CHUNK_SLOTS` (256) estructuras de ~768 B |
| `conn_arena_bytes` | `chunks × 256 × sizeof(http_connection_t)`, compromiso virtual |
| `body_pool` | LIFO por clase de tamaño para cuerpos grandes de solicitud (1 MB..128 MB). Cada entrada: `slot_bytes`, `count`, `bytes` |
| `body_pool_total_bytes` | suma de `bytes` en todas las clases |

### getTelemetry

```php
public HttpServer::getTelemetry(): array
```

📋 Planificado.

### resetTelemetry

```php
public HttpServer::resetTelemetry(): bool
```

📋 Planificado.

## Ejemplo

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

## Véase también

- [`TrueAsync\HttpServerConfig`](/es/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/es/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/es/docs/reference/server/http-response.html)
- [Inicio rápido](/es/docs/server/quickstart.html)
