---
layout: docs
lang: ru
path_key: "/docs/reference/request-context.html"
nav_active: docs
permalink: /ru/docs/reference/request-context.html
page_title: "request_context()"
description: "Async\\request_context() — общий контекст запроса, видимый всему дереву корутин обработчика. Привязан к request-scope, который выставляет встраивающий C-код (HTTP-сервер)."
---

# request_context

(PHP 8.6+, True Async 1.0)

`Async\request_context()` возвращает [`Context`](/ru/docs/components/context.html) request-scope,
унаследованный от родительской корутины, либо `null`, если request-scope не выставлен.

## Описание

```php
namespace Async;

function request_context(): ?Context
```

Request-scope назначает **встраивающий C-код** (например, HTTP-сервер) и автоматически
распространяет его на все дочерние корутины. Это даёт обработчику единый контекст, видимый всему
дереву корутин запроса.

| Функция | Что возвращает |
|---------|----------------|
| `current_context()` | Контекст **текущей корутины** — изолирован для каждой корутины |
| `coroutine_context()` | Алиас `current_context()` |
| `request_context()` | Контекст **запроса** — общий для handler и всех его дочерних корутин |
| `root_context()` | Контекст root-scope |

## Возвращаемое значение

`Async\Context` — общий контекст request-scope, либо `null` вне request-scope (например, в CLI-скрипте
без HTTP-сервера).

## Примеры

### Пример #1 Передача request-id через всё дерево корутин

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

    // Дочерние корутины видят тот же контекст автоматически.
    [$user, $posts] = await_all([
        spawn(fn() => fetchUser()),
        spawn(fn() => fetchPosts()),
    ]);

    $res->setHeader('X-Request-Id', $rid);
    $res->json(['user' => $user, 'posts' => $posts]);
});

function fetchUser(): array
{
    // request_id виден здесь — например, для логирования
    $rid = request_context()?->get('request_id');
    log_debug("[$rid] fetching user");
    // ...
    return [/* ... */];
}

$server->start();
```

### Пример #2 Безопасное обращение вне request-scope

```php
<?php
use function Async\request_context;

function audit_log(string $event): void
{
    $ctx = request_context();
    $rid = $ctx?->get('request_id') ?? 'no-request';
    error_log("[$rid] $event");
}

// Работает и в HTTP-обработчике (виден request_id),
// и в фоновой CLI-задаче (request_context() === null, $rid === 'no-request').
```

### Пример #3 Сравнение с `current_context()`

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
        // Виден request_context, потому что он общий для всего scope запроса.
        var_dump(request_context()->get('request_id')); // string(7) "abc-123"

        // current_context() у дочерней корутины — свой.
        var_dump(current_context()->find('local'));     // NULL
    });
    await($child);

    $res->setStatusCode(204);
});
```

## Примечания

> **Когда возвращается `null`.** Request-scope выставляет внешний код (HTTP-сервер, очередь, gRPC).
> В обычном CLI-скрипте без такого окружения `request_context()` всегда `null` — это нормально.

> **Не для произвольных коммуникаций.** `request_context()` намеренно ограничен scope запроса.
> Для общесистемных значений (конфиг, registry) используйте обычные сервисы / DI-контейнер, для
> per-coroutine — `current_context()`.

## См. также

- [Async\\Context](/ru/docs/components/context.html) — сам класс контекста и его методы
- [Async\\current_context()](/ru/docs/reference/current-context.html) — контекст текущей корутины
- [Async\\root_context()](/ru/docs/reference/root-context.html) — контекст root-scope
- [TrueAsync Server: per-request scope](/ru/docs/server/workers.html#per-request-scope)
