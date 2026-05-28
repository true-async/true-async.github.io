---
layout: docs
lang: fr
path_key: "/docs/reference/request-context.html"
nav_active: docs
permalink: /fr/docs/reference/request-context.html
page_title: "request_context()"
description: "Async\\request_context() — contexte partagé de la requête, visible par toute l'arborescence de coroutines du handler. Lié au request-scope que pose le code C embarquant (serveur HTTP)."
---

# request_context

(PHP 8.6+, True Async 1.0)

`Async\request_context()` renvoie le [`Context`](/fr/docs/components/context.html) du request-scope,
hérité de la coroutine parente, ou `null` si aucun request-scope n'est défini.

## Description

```php
namespace Async;

function request_context(): ?Context
```

Le request-scope est assigné par le **code C embarquant** (par exemple un serveur HTTP) et propagé
automatiquement à toutes les coroutines enfants. Cela fournit au handler un contexte unique
visible par toute l'arborescence de coroutines de la requête.

| Fonction | Ce qu'elle renvoie |
|----------|--------------------|
| `current_context()` | Contexte de la **coroutine courante** — isolé pour chaque coroutine |
| `coroutine_context()` | Alias de `current_context()` |
| `request_context()` | Contexte de la **requête** — partagé entre le handler et toutes ses coroutines enfants |
| `root_context()` | Contexte du root-scope |

## Valeur de retour

`Async\Context` : contexte partagé du request-scope, ou `null` hors d'un request-scope (par ex.
dans un script CLI sans serveur HTTP).

## Exemples

### Exemple #1 Propagation d'un request-id à toute l'arborescence de coroutines

```php
<?php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;
use function Async\await_all;
use function Async\request_context;

$server = new HttpServer((new HttpServerConfig())->addListener('0.0.0.0', 8080));

$server->addHttpHandler(function ($req, $res) {
    $rid = $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8));
    request_context()->set('request_id', $rid);
    request_context()->set('user_id', authUser($req));

    // Les coroutines enfants voient automatiquement le même contexte.
    [$user, $posts] = await_all([
        spawn(fn() => fetchUser()),
        spawn(fn() => fetchPosts()),
    ]);

    $res->setHeader('X-Request-Id', $rid);
    $res->json(['user' => $user, 'posts' => $posts]);
});

function fetchUser(): array
{
    // request_id est visible ici — par exemple pour le logging
    $rid = request_context()?->get('request_id');
    log_debug("[$rid] fetching user");
    // ...
    return [/* ... */];
}

$server->start();
```

### Exemple #2 Accès sûr hors du request-scope

```php
<?php
use function Async\request_context;

function audit_log(string $event): void
{
    $ctx = request_context();
    $rid = $ctx?->get('request_id') ?? 'no-request';
    error_log("[$rid] $event");
}

// Fonctionne aussi bien dans un handler HTTP (request_id visible),
// que dans une tâche CLI en arrière-plan (request_context() === null, $rid === 'no-request').
```

### Exemple #3 Comparaison avec `current_context()`

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\request_context;
use function Async\current_context;

$server->addHttpHandler(function ($req, $res) {
    request_context()->set('request_id', 'abc-123');
    current_context()->set('local',      'handler-only');

    $child = spawn(function () {
        // request_context visible parce qu'il est partagé pour tout le scope de la requête.
        var_dump(request_context()->get('request_id')); // string(7) "abc-123"

        // current_context() de la coroutine enfant — c'est le sien.
        var_dump(current_context()->find('local'));     // NULL
    });
    await($child);

    $res->setStatusCode(204);
});
```

## Notes

> **Quand on obtient `null`.** Le request-scope est posé par le code externe (serveur HTTP, file
> d'attente, gRPC). Dans un script CLI ordinaire sans un tel environnement, `request_context()`
> est toujours `null` — c'est normal.

> **Pas pour des communications arbitraires.** `request_context()` est délibérément limité au
> scope de la requête. Pour des valeurs globales (config, registry), utilisez des services
> ordinaires / un conteneur DI ; pour du per-coroutine, `current_context()`.

## Voir aussi

- [Async\\Context](/fr/docs/components/context.html) — la classe Context et ses méthodes
- [Async\\current_context()](/fr/docs/reference/current-context.html) — contexte de la coroutine courante
- [Async\\root_context()](/fr/docs/reference/root-context.html) — contexte du root-scope
- [TrueAsync Server : per-request scope](/fr/docs/server/workers.html#per-request-scope)
