---
layout: docs
lang: de
path_key: "/docs/server/workers.html"
nav_active: docs
permalink: /de/docs/server/workers.html
page_title: "TrueAsync Server: Multi-Worker und Bootloader"
description: "setWorkers(N): integrierter Thread-Pool auf Async\\ThreadPool. Bootloader, SO_REUSEPORT, Per-Request Scope, request_context()."
---

# Multi-Worker

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server läuft standardmäßig im **Single-Threaded**-Modus: ein Event-Loop, ein Thread, die
gesamte Pipeline (accept → parse → dispatch → respond) auf einer CPU. Das ist das schnellste Modell
für typische IO-bound Workloads, skaliert aber nicht über Kerne hinweg.

`setWorkers(N)` startet einen integrierten Pool aus N OS-Threads über
[`Async\ThreadPool`](/de/docs/components/thread-pool.html). Jeder Worker re-bindet dieselben Listener,
der Kernel (Linux/BSD) verteilt Accepts via `SO_REUSEPORT`. Jeder Worker hat seinen eigenen
unabhängigen Event-Loop, seinen eigenen Opcache, seine eigenen Connection-Pools.

## Basisbeispiel

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

$server->start();   // blockiert, bis alle Worker beendet sind
```

`HttpServer::start()` im Parent:

1. Spawnt `Async\ThreadPool` der gewünschten Größe.
2. Kopiert Config + Handler-Set über `transfer_obj` in jeden Worker.
3. Im Worker startet er den Event-Loop, der die Listener re-bindet.
4. Der Parent `await`et das Ende aller Worker.

Cross-Thread-`stop()` ist noch in der Roadmap; Stop läuft heute über SIGINT/SIGTERM oder das reguläre
Auslaufen der Arbeit.

## Bootloader

Schwere Worker-Initialisierung (Autoload, Pool-Warmup, JIT-Warmup) sollte **einmalig** beim Start
laufen, nicht pro Anfrage. Dafür gibt es `setBootloader(?\Closure $cb)`:

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // läuft in jedem Worker einmal vor dem Task-Loop
        require __DIR__ . '/vendor/autoload.php';

        // Connection-Pool-Warmup
        Database::initPool(min: 4, max: 16);

        // Vorabkompilierung kritischer Routen
        Router::compile();
    });
```

Die Closure wird einmal deep-copiert und auf jedem Worker ausgeführt, bevor dieser Tasks annimmt.
**Eine im Bootloader geworfene Exception lässt den gesamten Pool fehlschlagen**: der Worker startet nicht.

Gilt nur bei `setWorkers() > 1`. `null` entfernt den Bootloader.

> Benötigt TrueAsync ABI v0.15+. Test: `server/core/021-bootloader.phpt`.

## Per-Request Scope

Seit 0.6.5 läuft jede Handler-Coroutine **in einem eigenen Scope**, der ein Child des Server-Scope ist.
Daraus folgen zwei wichtige Semantiken:

- [`Async\request_context()`](/de/docs/reference/request-context.html) — gemeinsamer Kontext für den
  gesamten Coroutine-Baum der Anfrage (Handler und Child-`spawn`s).
- [`Async\current_context()`](/de/docs/reference/current-context.html) bleibt per-Coroutine.

```php
use function Async\spawn;
use function Async\await;
use function Async\request_context;

$server->addHttpHandler(function ($req, $res) {
    // Kontext ist im gesamten Coroutine-Baum der Anfrage sichtbar
    request_context()->set('request_id', $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8)));
    request_context()->set('user_id', authUser($req));

    // Fan-Out
    [$user, $posts] = await(\Async\all([
        spawn(fn() => fetchUser()),   // request_id ist hier sichtbar
        spawn(fn() => fetchPosts()),  // und hier
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

Zum Vergleich: `current_context()` legt Werte an, die **nur** in der aktuellen Coroutine sichtbar sind;
`request_context()` liefert einen gemeinsamen Sub-Tree, an den Request-Scope gebunden.

## SO_REUSEPORT und Load Balancing

Unter Linux/BSD verteilt der Kernel eingehende Verbindungen gleichmäßig (aber non-deterministisch)
auf alle Sockets, die mit `SO_REUSEPORT` auf demselben `(host, port)` geöffnet sind. Jeder Worker
öffnet seinen eigenen; kein Userspace-Loadbalancer nötig, keine Locks.

Unter Windows ist das `SO_REUSEPORT`-Äquivalent weniger vorhersagbar; verschieben Sie das Balancing
nach oben (LB) oder nutzen Sie Single-Worker + N Prozesse mit unterschiedlichen Ports.

## Cross-Thread-Transfer der Handler

Wenn die Konfiguration in einem Thread aufgebaut und der Server in einem anderen gestartet wird,
unterstützt `HttpServer` den Transfer. Seit 0.2.0 transportiert der Transfer-Pfad die Protokollmasken
korrekt (Bug "silently dropped every request" behoben; siehe CHANGELOG
`core/007-server-transfer-handler-dispatch.phpt`).

## Debugging des Multi-Threaded-Modus

Lautes Logging bei unerwartetem Worker-Exit wurde in 0.6.3 ergänzt. Uncaught `$server->start()`-Exceptions
und Clean-Returns, während die Await-Schleife noch auf Worker wartet, sind jetzt auf stderr sichtbar
(früher fiel jeder Fall stillschweigend 1/N der Accept-Capacity ohne Signal an den Operator weg).

INFO-Logging aktivieren:

```php
$config
    ->setLogSeverity(\TrueAsync\LogSeverity::INFO)
    ->setLogStream(STDERR);
```

## Wie viele Worker?

Faustregel:

- **IO-bound** (Standard-Web mit DB/HTTP): mit `available_parallelism()` starten, CPU-Auslastung
  beobachten.
- **CPU-bound** (Rendering, Compression-heavy, Big JSON): `available_parallelism()` oder weniger,
  p99-Latency beobachten.
- **Mixed**: Overcommit um 1–2 Worker (`N+1` oder `N+2`) liefert oft die beste Kern-Auslastung bei
  IO-Stalls.

```php
$config->setWorkers(\Async\available_parallelism());
```

> `Async\available_parallelism()` liefert die Zahl der für den Prozess verfügbaren CPUs
> (berücksichtigt cgroup-Quota und Affinity). Backend: `uv_available_parallelism` mit Fallback auf
> `uv_cpu_info`.

## Siehe auch

- [`HttpServerConfig::setWorkers()`](/de/docs/reference/server/http-server-config.html#setworkers)
- [`HttpServerConfig::setBootloader()`](/de/docs/reference/server/http-server-config.html#setbootloader)
- [`Async\ThreadPool`](/de/docs/components/thread-pool.html): Pool-Interna
- [`Async\request_context()`](/de/docs/reference/request-context.html)
- [Backpressure / Drain](/de/docs/server/configuration.html#graceful-drain-step-8)
