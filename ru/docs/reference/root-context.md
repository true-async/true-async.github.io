---
layout: docs
lang: ru
path_key: "/docs/reference/root-context.html"
nav_active: docs
permalink: /ru/docs/reference/root-context.html
page_title: "root_context()"
description: "root_context() — получение глобального корневого контекста, видимого из всех скоупов."
---

# root_context

(PHP 8.6+, True Async 1.0)

`root_context()` — Возвращает глобальный корневой объект `Async\Context`, общий для всего запроса.

## Описание

```php
root_context(): Async\Context
```

Возвращает контекст верхнего уровня. Значения, установленные здесь, видны через `find()` из любого контекста в иерархии.

## Возвращаемое значение

Объект `Async\Context`.

## Примеры

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Устанавливаем глобальную конфигурацию
root_context()
    ->set('app_name', 'MyApp')
    ->set('environment', 'production');

spawn(function() {
    // Доступно из любой корутины через find()
    $env = current_context()->find('environment'); // "production"
});
?>
```

## См. также

- [current_context()](/ru/docs/reference/current-context.html) — контекст Scope
- [coroutine_context()](/ru/docs/reference/coroutine-context.html) — контекст корутины
- [Context](/ru/docs/concepts/context.html) — концепция контекстов
