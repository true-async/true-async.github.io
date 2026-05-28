---
layout: docs
lang: de
path_key: "/docs/reference/request-context.html"
nav_active: docs
permalink: /de/docs/reference/request-context.html
page_title: "request_context()"
description: "Async\\request_context() — gemeinsamer Request-Kontext, der dem gesamten Coroutine-Baum des Handlers sichtbar ist. An den Request-Scope gebunden, den der einbettende C-Code (HTTP-Server) setzt."
---

# request_context

(PHP 8.6+, True Async 1.0)

`Async\request_context()` gibt den [`Context`](/de/docs/components/context.html) des Request-Scope
zurück, geerbt von der Parent-Coroutine, oder `null`, wenn kein Request-Scope gesetzt ist.

## Beschreibung

```php
namespace Async;

function request_context(): ?Context
```

Den Request-Scope vergibt der **einbettende C-Code** (z. B. ein HTTP-Server), und er propagiert
automatisch auf alle Child-Coroutinen. Der Handler erhält damit einen einheitlichen Kontext, der
dem gesamten Coroutine-Baum der Anfrage sichtbar ist.

| Funktion | Was sie liefert |
|----------|-----------------|
| `current_context()` | Kontext der **aktuellen Coroutine** — pro Coroutine isoliert |
| `coroutine_context()` | Alias für `current_context()` |
| `request_context()` | **Request**-Kontext — gemeinsam für Handler und alle seine Child-Coroutinen |
| `root_context()` | Kontext des Root-Scope |

## Rückgabewert

`Async\Context` — gemeinsamer Kontext des Request-Scope, oder `null` außerhalb eines Request-Scope
(z. B. in einem CLI-Skript ohne HTTP-Server).

## Beispiele

### Beispiel #1 Request-ID durch den gesamten Coroutine-Baum reichen

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

    // Child-Coroutinen sehen denselben Kontext automatisch.
    [$user, $posts] = await_all([
        spawn(fn() => fetchUser()),
        spawn(fn() => fetchPosts()),
    ]);

    $res->setHeader('X-Request-Id', $rid);
    $res->json(['user' => $user, 'posts' => $posts]);
});

function fetchUser(): array
{
    // request_id ist hier sichtbar — etwa fürs Logging
    $rid = request_context()?->get('request_id');
    log_debug("[$rid] fetching user");
    // ...
    return [/* ... */];
}

$server->start();
```

### Beispiel #2 Sicherer Zugriff außerhalb des Request-Scope

```php
<?php
use function Async\request_context;

function audit_log(string $event): void
{
    $ctx = request_context();
    $rid = $ctx?->get('request_id') ?? 'no-request';
    error_log("[$rid] $event");
}

// Funktioniert sowohl im HTTP-Handler (request_id sichtbar)
// als auch in einem Hintergrund-CLI-Task (request_context() === null, $rid === 'no-request').
```

### Beispiel #3 Vergleich mit `current_context()`

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
        // request_context sichtbar, weil er für den gesamten Request-Scope gilt.
        var_dump(request_context()->get('request_id')); // string(7) "abc-123"

        // current_context() der Child-Coroutine ist eigenständig.
        var_dump(current_context()->find('local'));     // NULL
    });
    await($child);

    $res->setStatusCode(204);
});
```

## Hinweise

> **Wann `null` zurückgegeben wird.** Den Request-Scope setzt externer Code (HTTP-Server, Queue, gRPC).
> In einem gewöhnlichen CLI-Skript ohne ein solches Umfeld ist `request_context()` stets `null` —
> das ist normal.

> **Nicht für beliebige Kommunikation.** `request_context()` ist bewusst auf den Request-Scope
> beschränkt. Für systemweite Werte (Config, Registry) nutzen Sie reguläre Services / einen
> DI-Container; für Per-Coroutine-Werte — `current_context()`.

## Siehe auch

- [Async\\Context](/de/docs/components/context.html) — die Context-Klasse selbst und ihre Methoden
- [Async\\current_context()](/de/docs/reference/current-context.html) — Kontext der aktuellen Coroutine
- [Async\\root_context()](/de/docs/reference/root-context.html) — Kontext des Root-Scope
- [TrueAsync Server: Per-Request Scope](/de/docs/server/workers.html#per-request-scope)
