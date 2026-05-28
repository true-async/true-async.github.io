---
layout: docs
lang: uk
path_key: "/docs/reference/request-context.html"
nav_active: docs
permalink: /uk/docs/reference/request-context.html
page_title: "request_context()"
description: "Async\\request_context() — спільний контекст запиту, видимий усьому дереву корутин обробника. Прив'язаний до request-scope, який виставляє вбудовуючий C-код (HTTP-сервер)."
---

# request_context

(PHP 8.6+, True Async 1.0)

`Async\request_context()` повертає [`Context`](/uk/docs/components/context.html) request-scope,
успадкований від батьківської корутини, або `null`, якщо request-scope не виставлено.

## Опис

```php
namespace Async;

function request_context(): ?Context
```

Request-scope призначає **вбудовуючий C-код** (наприклад, HTTP-сервер) і автоматично
поширює його на всі дочірні корутини. Це дає обробнику єдиний контекст, видимий усьому
дереву корутин запиту.

| Функція | Що повертає |
|---------|-------------|
| `current_context()` | Контекст **поточної корутини** — ізольований для кожної корутини |
| `coroutine_context()` | Алас `current_context()` |
| `request_context()` | Контекст **запиту** — спільний для handler і всіх його дочірніх корутин |
| `root_context()` | Контекст root-scope |

## Значення, що повертається

`Async\Context` — спільний контекст request-scope, або `null` поза request-scope (наприклад, у CLI-скрипті
без HTTP-сервера).

## Приклади

### Приклад #1 Передача request-id через все дерево корутин

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

    // Дочірні корутини бачать той самий контекст автоматично.
    [$user, $posts] = await_all([
        spawn(fn() => fetchUser()),
        spawn(fn() => fetchPosts()),
    ]);

    $res->setHeader('X-Request-Id', $rid);
    $res->json(['user' => $user, 'posts' => $posts]);
});

function fetchUser(): array
{
    // request_id видно тут — наприклад, для логування
    $rid = request_context()?->get('request_id');
    log_debug("[$rid] fetching user");
    // ...
    return [/* ... */];
}

$server->start();
```

### Приклад #2 Безпечне звернення поза request-scope

```php
<?php
use function Async\request_context;

function audit_log(string $event): void
{
    $ctx = request_context();
    $rid = $ctx?->get('request_id') ?? 'no-request';
    error_log("[$rid] $event");
}

// Працює і в HTTP-обробнику (видно request_id),
// і у фоновій CLI-задачі (request_context() === null, $rid === 'no-request').
```

### Приклад #3 Порівняння з `current_context()`

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
        // Видно request_context, бо він спільний для всього scope запиту.
        var_dump(request_context()->get('request_id')); // string(7) "abc-123"

        // current_context() у дочірньої корутини — свій.
        var_dump(current_context()->find('local'));     // NULL
    });
    await($child);

    $res->setStatusCode(204);
});
```

## Примітки

> **Коли повертається `null`.** Request-scope виставляє зовнішній код (HTTP-сервер, черга, gRPC).
> У звичайному CLI-скрипті без такого оточення `request_context()` завжди `null` — це нормально.

> **Не для довільних комунікацій.** `request_context()` навмисно обмежений scope запиту.
> Для загальносистемних значень (конфіг, registry) використовуйте звичайні сервіси / DI-контейнер, для
> per-coroutine — `current_context()`.

## Див. також

- [Async\\Context](/uk/docs/components/context.html) — сам клас контексту і його методи
- [Async\\current_context()](/uk/docs/reference/current-context.html) — контекст поточної корутини
- [Async\\root_context()](/uk/docs/reference/root-context.html) — контекст root-scope
- [TrueAsync Server: per-request scope](/uk/docs/server/workers.html#per-request-scope)
