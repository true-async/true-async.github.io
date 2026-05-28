---
layout: docs
lang: it
path_key: "/docs/server/workers.html"
nav_active: docs
permalink: /it/docs/server/workers.html
page_title: "TrueAsync Server: multi-worker e bootloader"
description: "setWorkers(N): pool di thread integrato basato su Async\\ThreadPool. Bootloader, SO_REUSEPORT, scope per richiesta, request_context()."
---

# Multi-worker

(PHP 8.6+, true_async_server 0.6+)

Per impostazione predefinita TrueAsync Server funziona in modalità **single-threaded**: un event loop,
un thread, tutta la pipeline (accept → parse → dispatch → respond) su un'unica CPU. È il modello più
veloce per i tipici carichi IO-bound, ma non scala sui core.

`setWorkers(N)` avvia un pool integrato di N thread OS tramite
[`Async\ThreadPool`](/it/docs/components/thread-pool.html). Ogni worker rifa il bind degli stessi
listener; il kernel (Linux/BSD) distribuisce gli accept tramite `SO_REUSEPORT`. Ciascun worker ha il
proprio event loop indipendente, il proprio opcache e i propri pool di connessioni.

## Esempio di base

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

$server->start();   // blocca finché tutti i worker non terminano
```

`HttpServer::start()` nel processo padre:

1. Crea un `Async\ThreadPool` della dimensione richiesta.
2. Tramite `transfer_obj` copia config + set degli handler in ogni worker.
3. All'interno del worker avvia l'event loop, che rifa il bind dei listener.
4. Il padre fa `await` del completamento di tutti i worker.

`stop()` cross-thread è ancora in roadmap; l'arresto avviene tramite SIGINT/SIGTERM oppure tramite il
naturale esaurimento del lavoro.

## Bootloader

L'inizializzazione pesante del worker (autoload, riscaldamento dei pool, JIT warmup) va eseguita
**una sola volta** all'avvio, non a ogni richiesta. A questo serve `setBootloader(?\Closure $cb)`:

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // eseguito in ogni worker una sola volta prima del task loop
        require __DIR__ . '/vendor/autoload.php';

        // riscaldamento del pool di connessioni
        Database::initPool(min: 4, max: 16);

        // precompilazione delle route critiche
        Router::compile();
    });
```

La closure viene deep-copiata una volta e avviata in ogni worker prima che inizi ad accettare task.
**Un'eccezione nel bootloader fa fallire l'intero pool**: il worker non parte.

Si applica solo quando `setWorkers() > 1`. `null` rimuove il bootloader.

> Richiede TrueAsync ABI v0.15+. Test: `server/core/021-bootloader.phpt`.

## Scope per richiesta

Dal 0.6.5 ogni coroutine handler viene eseguita **nel proprio scope**, figlio dello scope del server.
Questo dà due semantiche importanti:

- [`Async\request_context()`](/it/docs/reference/request-context.html) fornisce un contesto comune a
  tutto l'albero di coroutine della richiesta (handler e `spawn` figli).
- [`Async\current_context()`](/it/docs/reference/current-context.html) resta per coroutine.

```php
use function Async\spawn;
use function Async\await;
use function Async\request_context;

$server->addHttpHandler(function ($req, $res) {
    // Il contesto è visibile a tutto il ramo di coroutine della richiesta
    request_context()->set('request_id', $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8)));
    request_context()->set('user_id', authUser($req));

    // Fan-out
    [$user, $posts] = await(\Async\all([
        spawn(fn() => fetchUser()),   // request_id visibile qui
        spawn(fn() => fetchPosts()),  // e qui
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

Confronto: `current_context()` crea valori visibili **solo** nella coroutine corrente;
`request_context()` fornisce un sottoinsieme comune, legato allo scope della richiesta.

## SO_REUSEPORT e bilanciamento

Su Linux/BSD il kernel distribuisce in modo uniforme (ma non deterministico) le connessioni in
ingresso tra tutti i socket aperti con `SO_REUSEPORT` sulla stessa coppia `(host, port)`. Ogni worker
apre il proprio; non serve un bilanciatore userspace, niente lock.

Su Windows l'equivalente di `SO_REUSEPORT` è meno prevedibile; sposta il bilanciamento più a monte
(LB) oppure usa single-worker + N processi su porte diverse.

## Trasferimento cross-thread degli handler

Se la configurazione viene preparata in un thread e il server avviato in un altro, `HttpServer`
supporta il trasferimento. Dal 0.2.0 il percorso di trasferimento porta correttamente le maschere di
protocollo (il bug "silently dropped every request" è risolto; vedi CHANGELOG
`core/007-server-transfer-handler-dispatch.phpt`).

## Debug della modalità multi-thread

Il logging rumoroso sulla terminazione inattesa di un worker è stato aggiunto nel 0.6.3. Le eccezioni
non catturate da `$server->start()` e i clean return mentre il loop di await sta ancora aspettando i
worker sono ora visibili in stderr (prima ogni caso faceva cadere silenziosamente 1/N della capacità
di accept senza segnalarlo all'operatore).

Abilita il logging INFO:

```php
$config
    ->setLogSeverity(\TrueAsync\LogSeverity::INFO)
    ->setLogStream(STDERR);
```

## Quanti worker?

Regola pratica:

- **IO-bound** (web standard con DB/HTTP): partire da `available_parallelism()` e guardare l'utilizzo
  CPU.
- **CPU-bound** (rendering, compression-heavy, JSON grandi): `available_parallelism()` o meno,
  guardare la p99 della latenza.
- **Misto**: overcommit di 1–2 worker (`N+1` o `N+2`) dà spesso un miglior utilizzo dei core sugli
  stalli IO.

```php
$config->setWorkers(\Async\available_parallelism());
```

> `Async\available_parallelism()` restituisce il numero di CPU disponibili al processo (tiene conto
> delle quote cgroup e dell'affinity). Si basa su `uv_available_parallelism` con fallback su
> `uv_cpu_info`.

## Vedi anche

- [`HttpServerConfig::setWorkers()`](/it/docs/reference/server/http-server-config.html#setworkers)
- [`HttpServerConfig::setBootloader()`](/it/docs/reference/server/http-server-config.html#setbootloader)
- [`Async\ThreadPool`](/it/docs/components/thread-pool.html): internals del pool
- [`Async\request_context()`](/it/docs/reference/request-context.html)
- [Contropressione / drain](/it/docs/server/configuration.html#graceful-drain-step-8)
