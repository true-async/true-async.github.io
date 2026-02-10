---
layout: docs
lang: ru
path_key: "/docs/reference/current-context.html"
nav_active: docs
permalink: /ru/docs/reference/current-context.html
page_title: "current_context()"
description: "current_context() — получение контекста текущего Scope."
---

# current_context

(PHP 8.6+, True Async 1.0)

`current_context()` — Возвращает объект `Async\Context`, привязанный к текущему Scope.

## Описание

```php
current_context(): Async\Context
```

Если контекст для текущего Scope ещё не создан — создаёт его автоматически.
Значения, установленные в этом контексте, видны всем корутинам текущего Scope через `find()`.

## Возвращаемое значение

Объект `Async\Context`.

## Примеры

```php
<?php
use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Видит значение из parent scope
    $id = current_context()->find('request_id'); // "abc-123"
});
?>
```

## См. также

- [coroutine_context()](/ru/docs/reference/coroutine-context.html) — контекст корутины
- [root_context()](/ru/docs/reference/root-context.html) — глобальный контекст
- [Context](/ru/docs/concepts/context.html) — концепция контекстов
