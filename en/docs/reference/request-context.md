---
layout: docs
lang: en
path_key: "/docs/reference/request-context.html"
nav_active: docs
permalink: /en/docs/reference/request-context.html
page_title: "request_context()"
description: "Async\\request_context() — shared request context visible to the entire handler coroutine tree. Bound to the request scope set by the embedding C code (HTTP server)."
---

# request_context

(PHP 8.6+, True Async 1.0)

`Async\request_context()` returns the [`Context`](/en/docs/components/context.html) of the
request scope inherited from the parent coroutine, or `null` if no request scope is set.

## Description

```php
namespace Async;

function request_context(): ?Context
```

The request scope is set by **embedding C code** (for example, the HTTP server) and is
automatically propagated to all child coroutines. This gives the handler a single context visible
to the entire request coroutine tree.

| Function | What it returns |
|----------|-----------------|
| `current_context()` | The **current coroutine's** context — isolated per coroutine |
| `coroutine_context()` | Alias of `current_context()` |
| `request_context()` | The **request's** context — shared between the handler and all its child coroutines |
| `root_context()` | The root-scope context |

## Return value

`Async\Context` — the shared request-scope context, or `null` outside a request scope (for
example, in a CLI script without an HTTP server).

## Examples

### Example #1 Propagating a request id through the entire coroutine tree

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

    // Child coroutines automatically see the same context.
    [$user, $posts] = await_all([
        spawn(fn() => fetchUser()),
        spawn(fn() => fetchPosts()),
    ]);

    $res->setHeader('X-Request-Id', $rid);
    $res->json(['user' => $user, 'posts' => $posts]);
});

function fetchUser(): array
{
    // request_id is visible here — useful for logging, for example
    $rid = request_context()?->get('request_id');
    log_debug("[$rid] fetching user");
    // ...
    return [/* ... */];
}

$server->start();
```

### Example #2 Safe access outside a request scope

```php
<?php
use function Async\request_context;

function audit_log(string $event): void
{
    $ctx = request_context();
    $rid = $ctx?->get('request_id') ?? 'no-request';
    error_log("[$rid] $event");
}

// Works both inside an HTTP handler (request_id is visible)
// and in a background CLI task (request_context() === null, $rid === 'no-request').
```

### Example #3 Comparison with `current_context()`

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
        // request_context is visible because it is shared across the entire request scope.
        var_dump(request_context()->get('request_id')); // string(7) "abc-123"

        // The child coroutine has its own current_context().
        var_dump(current_context()->find('local'));     // NULL
    });
    await($child);

    $res->setStatusCode(204);
});
```

## Notes

> **When `null` is returned.** The request scope is set by external code (HTTP server, queue,
> gRPC). In a plain CLI script without such an environment, `request_context()` is always `null`
> — that is normal.

> **Not for arbitrary communication.** `request_context()` is intentionally limited to the request
> scope. Use regular services / a DI container for system-wide values (config, registry); use
> `current_context()` for per-coroutine values.

## See also

- [Async\\Context](/en/docs/components/context.html) — the context class itself and its methods
- [Async\\current_context()](/en/docs/reference/current-context.html) — current coroutine's context
- [Async\\root_context()](/en/docs/reference/root-context.html) — root-scope context
- [TrueAsync Server: per-request scope](/en/docs/server/workers.html#per-request-scope)
