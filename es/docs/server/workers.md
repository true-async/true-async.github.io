---
layout: docs
lang: es
path_key: "/docs/server/workers.html"
nav_active: docs
permalink: /es/docs/server/workers.html
page_title: "TrueAsync Server: multi-worker y bootloader"
description: "setWorkers(N): pool de hilos integrado sobre Async\\ThreadPool. Bootloader, SO_REUSEPORT, scope por solicitud, request_context()."
---

# Multi-worker

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server funciona por defecto en modo **single-threaded**: un event-loop, un hilo, todo el
pipeline (accept → parse → dispatch → respond) sobre un solo CPU. Es el modelo más rápido para
cargas IO-bound típicas, pero no escala por núcleos.

`setWorkers(N)` levanta el pool integrado de N hilos del sistema operativo mediante
[`Async\ThreadPool`](/es/docs/components/thread-pool.html). Cada worker hace re-bind sobre los
mismos listeners y el kernel (Linux/BSD) distribuye el accept mediante `SO_REUSEPORT`. Cada
worker tiene su propio event-loop independiente, su propio opcache, sus propios pools de
conexiones.

## Ejemplo base

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addHttpHandler(function ($req, $res) {
    $res->json(['pid' => getmypid(), 'tid' => /* TID */]);
});

$server->start();   // bloquea hasta que todos los workers terminen
```

`HttpServer::start()` en el padre:

1. Spawnea un `Async\ThreadPool` del tamaño requerido.
2. Copia el config + el conjunto de manejadores en cada worker mediante `transfer_obj`.
3. Dentro del worker arranca el event-loop, que hace re-bind de los listeners.
4. El padre hace `await` del final de todos los workers.

El `stop()` entre hilos está en la hoja de ruta; la parada actual funciona con SIGINT/SIGTERM o
por agotamiento natural del trabajo.

## Bootloader

La inicialización pesada del worker (autoload, calentamiento de pools, JIT-warmup) debe ejecutarse
**una sola vez** al arrancar, no por cada solicitud. Para eso existe `setBootloader(?\Closure $cb)`:

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // se ejecuta una vez en cada worker antes del task-loop
        require __DIR__ . '/vendor/autoload.php';

        // calentamiento del pool de conexiones
        Database::initPool(min: 4, max: 16);

        // precompilación de rutas críticas
        Router::compile();
    });
```

La closure se deep-copia una vez y se lanza en cada worker antes de que este empiece a aceptar
tareas. **Una excepción lanzada en el bootloader hace fallar al pool entero**: el worker no
arranca.

Solo se aplica con `setWorkers() > 1`. `null` elimina el bootloader.

> Requiere TrueAsync ABI v0.15+. Test: `server/core/021-bootloader.phpt`.

## Scope por solicitud

Desde 0.6.5 cada corrutina-manejador se ejecuta **en su propio scope**, hijo del scope del
servidor. Esto da dos semánticas importantes:

- [`Async\request_context()`](/es/docs/reference/request-context.html): contexto común para todo
  el árbol de corrutinas de la solicitud (handler y `spawn` hijos).
- [`Async\current_context()`](/es/docs/reference/current-context.html) sigue siendo per-coroutine.

```php
use function Async\spawn;
use function Async\await;
use function Async\request_context;

$server->addHttpHandler(function ($req, $res) {
    // El contexto lo ve toda la rama de corrutinas de la solicitud
    request_context()->set('request_id', $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8)));
    request_context()->set('user_id', authUser($req));

    // Fan-out
    [$user, $posts] = await(\Async\all([
        spawn(fn() => fetchUser()),   // aquí ve request_id
        spawn(fn() => fetchPosts()),  // y aquí también
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

Comparativa: `current_context()` crea valores visibles **solo** en la corrutina actual;
`request_context()` ofrece un subárbol común vinculado al scope de la solicitud.

## SO_REUSEPORT y balanceo

En Linux/BSD el kernel distribuye de forma uniforme (pero no determinista) las conexiones
entrantes entre todos los sockets abiertos con `SO_REUSEPORT` sobre el mismo `(host, port)`. Cada
worker abre el suyo; no hace falta un balanceador en userspace ni bloqueos.

En Windows el equivalente a `SO_REUSEPORT` es menos predecible; lleva el balanceo más arriba (LB)
o usa single-worker + N procesos con puertos distintos.

## Transferencia entre hilos de los manejadores

Si la configuración se prepara en un hilo y el servidor se arranca en otro, `HttpServer` admite
transfer. Desde 0.2.0 la ruta de transfer mueve correctamente las máscaras de protocolo (corregido
el bug "silently dropped every request"; véase el CHANGELOG
`core/007-server-transfer-handler-dispatch.phpt`).

## Depuración del modo multihilo

En 0.6.3 se añadió logging ruidoso ante una salida inesperada de un worker. Las excepciones no
capturadas de `$server->start()` y los returns limpios mientras el bucle await todavía espera a
los workers ahora aparecen en stderr (antes cada caso tiraba en silencio 1/N de la capacidad de
accept sin avisar al operador).

Activa el logging INFO:

```php
$config
    ->setLogSeverity(\TrueAsync\LogSeverity::INFO)
    ->setLogStream(STDERR);
```

## ¿Cuántos workers?

Regla práctica:

- **IO-bound** (web estándar con BD/HTTP): empezar por `available_parallelism()` y observar la
  utilización de CPU.
- **CPU-bound** (renderizado, mucha compresión, JSON grandes): `available_parallelism()` o menos,
  observando la latencia p99.
- **Mixto**: sobre-suscribir en 1–2 workers (`N+1` o `N+2`) suele dar mejor utilización de núcleos
  ante IO-stall.

```php
$config->setWorkers(\Async\available_parallelism());
```

> `Async\available_parallelism()` devuelve el número de CPUs disponibles para el proceso (tiene
> en cuenta la cuota de cgroup y la affinity). Respaldado por `uv_available_parallelism` con
> fallback a `uv_cpu_info`.

## Véase también

- [`HttpServerConfig::setWorkers()`](/es/docs/reference/server/http-server-config.html#setworkers)
- [`HttpServerConfig::setBootloader()`](/es/docs/reference/server/http-server-config.html#setbootloader)
- [`Async\ThreadPool`](/es/docs/components/thread-pool.html): el pool por dentro
- [`Async\request_context()`](/es/docs/reference/request-context.html)
- [Contrapresión / drain](/es/docs/server/configuration.html#graceful-drain-step-8)
