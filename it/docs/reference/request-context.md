---
layout: docs
lang: it
path_key: "/docs/reference/request-context.html"
nav_active: docs
permalink: /it/docs/reference/request-context.html
page_title: "request_context()"
description: "Async\\request_context(): contesto comune della richiesta, visibile a tutto l'albero di coroutine dell'handler. Legato al request-scope che il codice C embedding (server HTTP) imposta."
---

# request_context

(PHP 8.6+, True Async 1.0)

`Async\request_context()` restituisce il [`Context`](/it/docs/components/context.html) del
request-scope ereditato dalla coroutine genitrice, oppure `null` se non è stato impostato alcun
request-scope.

## Descrizione

```php
namespace Async;

function request_context(): ?Context
```

Il request-scope è impostato dal **codice C embedding** (ad esempio il server HTTP) e si propaga
automaticamente a tutte le coroutine figlie. Questo dà all'handler un unico contesto visibile a
tutto l'albero di coroutine della richiesta.

| Funzione | Cosa restituisce |
|----------|------------------|
| `current_context()` | Contesto della **coroutine corrente** — isolato per ogni coroutine |
| `coroutine_context()` | Alias di `current_context()` |
| `request_context()` | Contesto della **richiesta** — comune all'handler e a tutte le sue coroutine figlie |
| `root_context()` | Contesto del root-scope |

## Valore restituito

`Async\Context`: contesto comune del request-scope, oppure `null` fuori dal request-scope (ad
esempio in uno script CLI senza server HTTP).

## Esempi

### Esempio #1 Propagazione del request-id a tutto l'albero di coroutine

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

    // Le coroutine figlie vedono lo stesso contesto automaticamente.
    [$user, $posts] = await_all([
        spawn(fn() => fetchUser()),
        spawn(fn() => fetchPosts()),
    ]);

    $res->setHeader('X-Request-Id', $rid);
    $res->json(['user' => $user, 'posts' => $posts]);
});

function fetchUser(): array
{
    // request_id è visibile qui — ad esempio per il logging
    $rid = request_context()?->get('request_id');
    log_debug("[$rid] fetching user");
    // ...
    return [/* ... */];
}

$server->start();
```

### Esempio #2 Accesso sicuro fuori dal request-scope

```php
<?php
use function Async\request_context;

function audit_log(string $event): void
{
    $ctx = request_context();
    $rid = $ctx?->get('request_id') ?? 'no-request';
    error_log("[$rid] $event");
}

// Funziona sia in un handler HTTP (request_id visibile),
// sia in un task CLI di background (request_context() === null, $rid === 'no-request').
```

### Esempio #3 Confronto con `current_context()`

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
        // request_context è visibile, perché è comune a tutto lo scope della richiesta.
        var_dump(request_context()->get('request_id')); // string(7) "abc-123"

        // current_context() della coroutine figlia è proprio.
        var_dump(current_context()->find('local'));     // NULL
    });
    await($child);

    $res->setStatusCode(204);
});
```

## Note

> **Quando viene restituito `null`.** Il request-scope è impostato dal codice esterno (server HTTP,
> coda, gRPC). In un normale script CLI senza tale ambiente, `request_context()` è sempre `null`:
> è normale.

> **Non è per comunicazioni arbitrarie.** `request_context()` è limitato di proposito allo scope
> della richiesta. Per valori a livello di sistema (config, registry) usa i normali servizi /
> container DI; per quelli per coroutine usa `current_context()`.

## Vedi anche

- [Async\\Context](/it/docs/components/context.html) — la classe stessa del contesto e i suoi metodi
- [Async\\current_context()](/it/docs/reference/current-context.html) — contesto della coroutine corrente
- [Async\\root_context()](/it/docs/reference/root-context.html) — contesto del root-scope
- [TrueAsync Server: scope per richiesta](/it/docs/server/workers.html#scope-per-richiesta)
