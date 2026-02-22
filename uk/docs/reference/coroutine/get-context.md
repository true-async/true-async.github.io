---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/get-context.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/get-context.html
page_title: "Coroutine::getContext"
description: "Отримати локальний контекст корутини."
---

# Coroutine::getContext

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getContext(): Async\Context
```

Повертає локальний контекст корутини. Контекст створюється ліниво при першому зверненні.

Контекст дозволяє зберігати дані, прив'язані до конкретної корутини, та передавати їх дочірнім корутинам.

## Значення, що повертається

`Async\Context` -- об'єкт контексту корутини.

## Приклади

### Приклад #1 Доступ до контексту

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

## Дивіться також

- [Context](/uk/docs/components/context.html) -- Концепція контексту
- [current_context()](/uk/docs/reference/current-context.html) -- Отримати контекст поточної корутини
