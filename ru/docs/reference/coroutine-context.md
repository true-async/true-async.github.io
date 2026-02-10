---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine-context.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine-context.html
page_title: "coroutine_context()"
description: "coroutine_context() — получение приватного контекста текущей корутины."
---

# coroutine_context

(PHP 8.6+, True Async 1.0)

`coroutine_context()` — Возвращает объект `Async\Context`, привязанный к текущей корутине.

## Описание

```php
coroutine_context(): Async\Context
```

Возвращает **приватный** контекст текущей корутины. Данные, установленные здесь, не видны другим корутинам. Если контекст для корутины ещё не создан — создаёт его автоматически.

## Возвращаемое значение

Объект `Async\Context`.

## Примеры

```php
<?php
use function Async\spawn;
use function Async\coroutine_context;

spawn(function() {
    coroutine_context()->set('step', 1);
    // Позже в этой же корутине
    $step = coroutine_context()->getLocal('step'); // 1
});

spawn(function() {
    // Не видит 'step' из другой корутины
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

## См. также

- [current_context()](/ru/docs/reference/current-context.html) — контекст Scope
- [root_context()](/ru/docs/reference/root-context.html) — глобальный контекст
- [Context](/ru/docs/concepts/context.html) — концепция контекстов
