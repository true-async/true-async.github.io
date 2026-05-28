---
layout: docs
lang: fr
path_key: "/docs/reference/server/http-server.html"
nav_active: docs
permalink: /fr/docs/reference/server/http-server.html
page_title: "TrueAsync\\HttpServer"
description: "TrueAsync\\HttpServer — classe principale du serveur HTTP intégré. Enregistrement des handlers, start/stop, télémétrie, runtime stats."
---

# TrueAsync\HttpServer

(PHP 8.6+, true_async_server 0.6+)

Classe principale du serveur intégré. Reçoit la config via le constructeur, accepte des handlers
de protocoles, démarre via `start()` et bloque le thread jusqu'à `stop()`.

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

## Méthodes

### __construct

```php
public HttpServer::__construct(HttpServerConfig $config)
```

Crée un serveur avec la config donnée. **La config est gelée** sur cet appel — les setters
ultérieurs lèvent `HttpServerRuntimeException`.

### addHttpHandler

```php
public HttpServer::addHttpHandler(callable $handler): static
```

Enregistre un handler des requêtes HTTP/1.1 et HTTP/2. Signature :

```php
function (HttpRequest $request, HttpResponse $response): void
```

Chaque requête s'exécute dans **sa propre coroutine** dans un
[per-request scope](/fr/docs/server/workers.html#per-request-scope). Le handler retourne `void` ;
la réponse est envoyée via `$response`.

### addStaticHandler

```php
public HttpServer::addStaticHandler(StaticHandler $handler): static
```

Enregistre un static-mount (issue #13). Les requêtes sous `$handler->getUrlPrefix()` sont servies
**entièrement en C**, sans spawn de coroutine, sans entrée dans la VM PHP.

Les mounts multiples sont matchés dans l'ordre d'enregistrement. Après attach, le handler est
**verrouillé** : tout setter lèvera `HttpServerRuntimeException`.

Voir [`StaticHandler`](/fr/docs/reference/server/static-handler.html).

### addWebSocketHandler

```php
public HttpServer::addWebSocketHandler(callable $handler): static
```

📋 Planifié. RFC 6455, upgrade depuis HTTP/1.1 et HTTP/2.

### addHttp2Handler

```php
public HttpServer::addHttp2Handler(callable $handler): static
```

📋 Planifié. Pour l'instant, les requêtes HTTP/2 tombent dans `addHttpHandler` (dispatcher H1/H2
commun).

### addGrpcHandler

```php
public HttpServer::addGrpcHandler(callable $handler): static
```

📋 Planifié. Au-dessus de HTTP/2, RPC unary et streaming.

### start

```php
public HttpServer::start(): bool
```

Démarre le serveur et bloque le thread appelant jusqu'à `stop()` ou une erreur fatale.

- Avec `setWorkers(1)` : fait tourner l'event-loop sur le thread appelant.
- Avec `setWorkers(N > 1)` : spawn un `Async\ThreadPool` de N workers et `await` leur fin.

Retourne `true` à l'arrêt normal. Lève `HttpServerException` (et ses descendants) en cas d'erreur
de démarrage (bind failed, build sans support HTTP/3 alors qu'il y a `addHttp3Listener`, etc.).

### stop

```php
public HttpServer::stop(): bool
```

Graceful shutdown :

1. Arrête d'accepter de nouvelles connexions.
2. Attend la fin des requêtes actives (jusqu'à `setShutdownTimeout()`).
3. Ferme toutes les connexions.

Retourne `true` à l'arrêt réussi.

> Le `stop()` cross-thread est dans la roadmap. Pour l'instant, l'arrêt est le plus souvent
> initié via SIGINT/SIGTERM.

### isRunning

```php
public HttpServer::isRunning(): bool
```

### getConfig

```php
public HttpServer::getConfig(): HttpServerConfig
```

Renvoie **le même** objet de config qui a été passé à `__construct`. Après le démarrage du serveur,
la config est verrouillée (`isLocked() === true`).

### getHttp3Stats

```php
public HttpServer::getHttp3Stats(): array
```

Observabilité par listener pour HTTP/3. Une entrée par `addHttp3Listener()` dans l'ordre
d'enregistrement. Chaque entrée contient :

| Clé | Valeur |
|-----|--------|
| `host` | host attaché |
| `port` | port UDP |
| `datagrams_received` | compteur des datagrammes reçus |
| `bytes_received` | octets reçus |
| `datagrams_errored` | datagrammes en erreur |
| `last_datagram_size` | taille du dernier datagramme |
| `last_peer` | dernier peer (string) |

Renvoie un tableau vide quand l'extension est compilée **sans** `--enable-http3`.

### getRuntimeStats

```php
public HttpServer::getRuntimeStats(): array
```

Snapshot des allocateurs internes du serveur. Aide à attribuer la croissance du RSS à des
sous-systèmes précis.

| Clé | Signification |
|-----|---------------|
| `conn_arena_live` | slots `http_connection_t` actuellement en cours d'utilisation (un par connexion TCP vivante) |
| `conn_arena_slots` | nombre total de slots dans les chunks (live + free, jamais shrink) |
| `conn_arena_chunks` | nombre de chunks committés ; chacun = `CONN_ARENA_CHUNK_SLOTS` (256) structures d'environ 768 B |
| `conn_arena_bytes` | `chunks × 256 × sizeof(http_connection_t)` — engagement virtuel |
| `body_pool` | LIFO par classe de taille des request-bodies volumineux (1 MB..128 MB). Chaque entrée : `slot_bytes`, `count`, `bytes` |
| `body_pool_total_bytes` | somme des `bytes` sur toutes les classes |

### getTelemetry

```php
public HttpServer::getTelemetry(): array
```

📋 Planifié.

### resetTelemetry

```php
public HttpServer::resetTelemetry(): bool
```

📋 Planifié.

## Exemple

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

## Voir aussi

- [`TrueAsync\HttpServerConfig`](/fr/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/fr/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/fr/docs/reference/server/http-response.html)
- [Quickstart](/fr/docs/server/quickstart.html)
