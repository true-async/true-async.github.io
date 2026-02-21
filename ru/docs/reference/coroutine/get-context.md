---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/get-context.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/get-context.html
page_title: "Coroutine::getContext"
description: "Получить локальный контекст корутины."
---

# Coroutine::getContext

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getContext(): Async\Context
```

Возвращает локальный контекст корутины. Контекст создаётся лениво при первом обращении.

Контекст позволяет хранить данные, привязанные к конкретной корутине, и передавать их в дочерние корутины.

## Возвращаемое значение

`Async\Context` — объект контекста корутины.

## Примеры

### Пример #1 Доступ к контексту

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $ctx = \Async\current_context();
    $ctx['request_id'] = uniqid();

    return $ctx['request_id'];
});

await($coroutine);
$ctx = $coroutine->getContext();
```

## См. также

- [Context](/ru/docs/components/context.html) — Концепция контекста
- [current_context()](/ru/docs/reference/current-context.html) — Получить контекст текущей корутины
