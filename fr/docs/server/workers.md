---
layout: docs
lang: fr
path_key: "/docs/server/workers.html"
nav_active: docs
permalink: /fr/docs/server/workers.html
page_title: "TrueAsync Server : multi-worker et bootloader"
description: "setWorkers(N) : pool de threads intégré sur Async\\ThreadPool. Bootloader, SO_REUSEPORT, per-request scope, request_context()."
---

# Multi-worker

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server tourne par défaut en mode **mono-thread** : une event-loop, un thread, tout le
pipeline (accept → parse → dispatch → respond) sur un seul CPU. C'est le modèle le plus rapide
pour des charges IO-bound typiques, mais il ne monte pas en charge sur les cœurs.

`setWorkers(N)` lève un pool intégré de N threads OS via
[`Async\ThreadPool`](/fr/docs/components/thread-pool.html). Chaque worker re-bind les mêmes
listeners, le noyau (Linux/BSD) répartit l'accept via `SO_REUSEPORT`. Chaque worker possède son
propre event-loop indépendante, son propre opcache, ses propres pools de connexions.

## Exemple de base

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

$server->start();   // bloque jusqu'à la fin de tous les workers
```

`HttpServer::start()` dans le parent :

1. Spawn un `Async\ThreadPool` de la taille demandée.
2. Copie la config + l'ensemble des handlers dans chaque worker via `transfer_obj`.
3. Dans le worker, lance l'event-loop qui re-bind les listeners.
4. Le parent fait `await` sur la fin de tous les workers.

## Arrêt gracieux

`HttpServer::stop()` fonctionne sur un parent de pool. Il retire toute la cohorte et **suspend
jusqu'à ce que le serveur soit vraiment arrêté** : quand il retourne, les workers ont drainé, le
pool est démonté et les sockets d'écoute sont fermés. Appelez-le depuis une coroutine ; un
gestionnaire de signal est l'endroit habituel :

```php
use function Async\spawn;
use function Async\await;
use function Async\signal;
use Async\Signal;

spawn(function () use ($server) {
    await(signal(Signal::SIGTERM));

    $server->stop();       // retourne une fois le pool réellement arrêté
});

$server->start();
```

Sur un serveur **standalone** (`setWorkers(1)`, la valeur par défaut), `stop()` ne suspend pas :
il est normalement appelé depuis un handler de requête, et le drain d'arrêt attend justement ce
handler — donc un `stop()` bloquant y attendrait lui-même.

## Hot reload

`HttpServer::reload()` remplace la cohorte de workers sans laisser tomber une connexion : les
workers finissent ce qu'ils tiennent, s'arrêtent et sortent, et de nouveaux threads worker
re-exécutent le bootloader — reprenant le code modifié — et prennent le relais sur les **mêmes
sockets d'écoute**. Il suspend jusqu'à ce que l'ancienne cohorte ait drainé ; `start()` continue
de tourner pendant tout ce temps. Parent de pool uniquement.

Vous l'appelez rarement vous-même. Câblez plutôt un déclencheur :

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        require __DIR__ . '/app/bootstrap.php';   // re-exécuté dans chaque nouveau worker
    })

    // développement : surveiller l'arborescence et recharger quand elle se stabilise
    ->enableHotReload([__DIR__ . '/app'], ['php'], debounceMs: 300, maxHoldMs: 2000)

    // production : recharger sur SIGHUP, ce qu'envoie un script de déploiement
    ->enableReloadOnSignal();
```

`enableHotReload()` surveille chaque chemin récursivement. Une rafale de changements stabilisée
invalide les arborescences surveillées dans opcache et appelle `reload()`. `debounceMs` est la
fenêtre de calme avant qu'une rafale ne déclenche un reload ; `maxHoldMs` force un reload au plus
tard ce délai après le premier changement, pour qu'un répertoire qui ne se calme jamais recharge
quand même. `enableReloadOnSignal()` arme un gestionnaire SIGHUP persistant (non supporté sur
Windows).

Les deux sont réservés au mode pool. Quel que soit le déclencheur, le code que reprennent les
nouveaux workers est celui que charge le bootloader — donc tout ce que vous voulez voir rechargé
doit être chargé **là**, pas en haut du script d'entrée, qui ne tourne qu'une fois dans le parent
et jamais plus.

> Si vous appelez `reload()` à la main, invalidez d'abord les fichiers modifiés
> (`opcache_invalidate()`) ou reposez-vous sur la validation par timestamp d'opcache — sinon les
> nouveaux workers compilent l'ancien code.

## Bootloader

L'initialisation lourde d'un worker (autoload, warmup des pools, JIT-warmup) doit s'exécuter **une
seule fois** au démarrage, pas à chaque requête. Pour cela il y a `setBootloader(?\Closure $cb)` :

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // exécuté dans chaque worker une seule fois avant la task-loop
        require __DIR__ . '/vendor/autoload.php';

        // warmup du pool de connexions
        Database::initPool(min: 4, max: 16);

        // précompilation des routes critiques
        Router::compile();
    });
```

La closure est deep-copy'ée une fois et exécutée sur chaque worker avant qu'il ne commence à
prendre des tâches. **Une exception levée dans le bootloader fait échouer tout le pool** : le
worker ne démarre pas.

S'applique uniquement quand `setWorkers() > 1`. `null` retire le bootloader.

> Nécessite TrueAsync ABI v0.15+. Test : `server/core/021-bootloader.phpt`.

## Per-request scope

Depuis 0.6.5 chaque handler-coroutine s'exécute **dans son propre scope**, enfant du scope serveur.
Cela donne deux sémantiques importantes :

- [`Async\request_context()`](/fr/docs/reference/request-context.html) : contexte commun pour
  toute l'arborescence de coroutines de la requête (handler et `spawn` enfants).
- [`Async\current_context()`](/fr/docs/reference/current-context.html) reste per-coroutine.

```php
use function Async\spawn;
use function Async\await;
use function Async\request_context;

$server->addHttpHandler(function ($req, $res) {
    // Le contexte est vu par toute la branche de coroutines de la requête
    request_context()->set('request_id', $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8)));
    request_context()->set('user_id', authUser($req));

    // Fan-out
    [$user, $posts] = await(\Async\await_all([
        spawn(fn() => fetchUser()),   // request_id visible ici
        spawn(fn() => fetchPosts()),  // et ici
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

À comparer : `current_context()` crée des valeurs visibles **uniquement** dans la coroutine
courante ; `request_context()` fournit un sous-arbre commun lié au scope de la requête.

Le scope enfant coûte deux allocations par requête. `setRequestScope(false)` le supprime et
réutilise directement le scope de connexion — mais alors `request_context()` renvoie `null`, donc
utilisez `?->` si vous le désactivez.

## SO_REUSEPORT et balancing

Sur Linux/BSD, le noyau répartit uniformément (mais non déterministiquement) les connexions
entrantes entre tous les sockets ouverts avec `SO_REUSEPORT` sur le même `(host, port)`. Chaque
worker ouvre le sien ; aucun load balancer userspace n'est nécessaire, aucun verrou.

Sur Windows, l'équivalent de `SO_REUSEPORT` est moins prévisible ; déplacez le balancing plus haut
(LB) ou utilisez single-worker + N processus avec des ports différents.

## Transfert cross-thread des handlers

Si la configuration est montée dans un thread et que le serveur démarre dans un autre, `HttpServer`
supporte le transfert. Depuis 0.2.0, le chemin de transfert préserve correctement les masks de
protocoles (bug "silently dropped every request" corrigé ; voir CHANGELOG
`core/007-server-transfer-handler-dispatch.phpt`).

## Débogage du mode multi-thread

Le logging bruyant sur un exit inattendu de worker est ajouté en 0.6.3. Les exceptions `$server->start()`
non capturées et les clean returns alors que l'await-loop attend encore les workers sont désormais
visibles dans stderr (auparavant chaque cas faisait silencieusement chuter 1/N de la capacité
d'accept sans signal pour l'opérateur).

Activez le logging INFO :

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::INFO],
]);
```

> **N'utilisez pas `setLogStream()` sous un pool de workers.** Une ressource stream PHP ouverte
> par le parent ne peut pas traverser vers un thread worker : le sink reste actif sur le parent et
> est ignoré dans les workers, avec un avis au démarrage. Utilisez un sink que chaque worker peut
> ouvrir lui-même — `stderr`, `stdout`, ou `file` (chaque worker rouvre le chemin en mode append).
> Voir [Observabilité](/fr/docs/server/observability.html).

## Combien de workers ?

Règle du pouce :

- **IO-bound** (web standard avec BD/HTTP) : commencer à `available_parallelism()`, regarder
  l'utilisation CPU.
- **CPU-bound** (rendering, compression lourde, gros JSON) : `available_parallelism()` ou moins,
  regarder la p99 latency.
- **Mixte** : un overcommit d'1 ou 2 workers (`N+1` ou `N+2`) donne souvent une meilleure
  utilisation des cœurs sur les IO-stall.

```php
$config->setWorkers(\Async\available_parallelism());
```

> `Async\available_parallelism()` retourne le nombre de CPU disponibles pour le processus (prend
> en compte les quotas cgroup et l'affinity). Backed by `uv_available_parallelism` avec fallback
> sur `uv_cpu_info`.

## Voir aussi

- [`HttpServerConfig::setWorkers()`](/fr/docs/reference/server/http-server-config.html#setworkers)
- [`HttpServerConfig::setBootloader()`](/fr/docs/reference/server/http-server-config.html#setbootloader)
- [Observabilité](/fr/docs/server/observability.html) : stats cross-worker, logging sous un pool
- [`Async\ThreadPool`](/fr/docs/components/thread-pool.html) : internes du pool
- [`Async\request_context()`](/fr/docs/reference/request-context.html)
- [Backpressure / drain](/fr/docs/server/configuration.html#graceful-drain-step-8)
