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
    $res->json(['pid' => getmypid()]);
});

$server->start();   // blocca finché tutti i worker non terminano
```

`HttpServer::start()` nel processo padre:

1. Crea un `Async\ThreadPool` della dimensione richiesta.
2. Tramite `transfer_obj` copia config + set degli handler in ogni worker.
3. All'interno del worker avvia l'event loop, che rifa il bind dei listener.
4. Il padre fa `await` del completamento di tutti i worker.

## Arresto graceful

`HttpServer::stop()` funziona sul processo padre di un pool. Ritira l'intera coorte e
**sospende finché il server non è davvero spento** — quando ritorna, i worker hanno drenato,
il pool è smantellato e i listen socket sono chiusi. Chiamalo da una coroutine; un signal
handler è il posto abituale:

```php
use function Async\spawn;
use function Async\await;
use function Async\signal;
use Async\Signal;

spawn(function () use ($server) {
    await(signal(Signal::SIGTERM));

    $server->stop();       // ritorna una volta che il pool è davvero spento
});

$server->start();
```

Su un server **standalone** (`setWorkers(1)`, il default) `stop()` non sospende: viene
normalmente chiamato da un request handler, e il drain di shutdown attende proprio quell'handler —
quindi uno `stop()` bloccante lì aspetterebbe se stesso.

## Hot reload

`HttpServer::reload()` sostituisce la coorte di worker senza far cadere una connessione: i
worker finiscono ciò che stanno tenendo, si fermano ed escono, e nuovi thread worker rieseguono
il bootloader — raccogliendo il codice modificato — e subentrano sugli **stessi listen socket**.
Sospende finché la vecchia coorte non ha drenato; `start()` continua a girare per tutto il
tempo. Solo processo padre del pool.

Raramente lo chiami tu stesso. Collega piuttosto un trigger:

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        require __DIR__ . '/app/bootstrap.php';   // rieseguito in ogni worker nuovo
    })

    // sviluppo: osserva l'albero e ricarica quando si assesta
    ->enableHotReload([__DIR__ . '/app'], ['php'], debounceMs: 300, maxHoldMs: 2000)

    // produzione: ricarica su SIGHUP, che è ciò che invia uno script di deploy
    ->enableReloadOnSignal();
```

`enableHotReload()` osserva ricorsivamente ogni percorso. Una raffica di modifiche assestata
invalida gli alberi osservati in opcache e chiama `reload()`. `debounceMs` è la finestra di
quiete prima che una raffica scateni un reload; `maxHoldMs` forza un reload al più dopo quel
tempo dalla prima modifica, così una directory che non si acquieta mai si ricarica comunque.
`enableReloadOnSignal()` arma un handler SIGHUP persistente (non supportato su Windows).

Entrambi sono solo per la modalità pool. Qualunque sia il trigger, il codice che i nuovi
worker raccolgono è quello che il bootloader carica — quindi tutto ciò che vuoi ricaricare
deve essere caricato **lì**, non in cima allo script di ingresso, che gira una sola volta nel
padre e mai più.

> Se chiami `reload()` a mano, invalida prima i file modificati
> (`opcache_invalidate()`) oppure affidati alla validazione dei timestamp di opcache —
> altrimenti i worker nuovi compilano il vecchio codice.

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
    [$user, $posts] = await(\Async\await_all([
        spawn(fn() => fetchUser()),   // request_id visibile qui
        spawn(fn() => fetchPosts()),  // e qui
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

Confronto: `current_context()` crea valori visibili **solo** nella coroutine corrente;
`request_context()` fornisce un sottoinsieme comune, legato allo scope della richiesta.

Lo scope figlio costa due allocazioni per richiesta. `setRequestScope(false)` lo elimina e
riusa direttamente lo scope della connessione — ma allora `request_context()` restituisce
`null`, quindi ricorri a `?->` se lo disattivi.

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
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::INFO],
]);
```

> **Non usare `setLogStream()` sotto un pool di worker.** Una risorsa stream PHP aperta dal
> padre non può passare in un thread worker: il sink resta attivo sul padre e viene saltato
> nei worker, con un avviso all'avvio. Usa un sink che ogni worker può aprire da sé —
> `stderr`, `stdout` o `file` (ogni worker riapre il percorso in modalità append).
> Vedi [Osservabilità](/it/docs/server/observability.html).

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
- [Osservabilità](/it/docs/server/observability.html): statistiche cross-worker, logging sotto un pool
- [`Async\ThreadPool`](/it/docs/components/thread-pool.html): internals del pool
- [`Async\request_context()`](/it/docs/reference/request-context.html)
- [Contropressione / drain](/it/docs/server/configuration.html#graceful-drain-step-8)
