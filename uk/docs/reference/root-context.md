---
layout: docs
lang: uk
path_key: "/docs/reference/root-context.html"
nav_active: docs
permalink: /uk/docs/reference/root-context.html
page_title: "root_context()"
description: "root_context() — отримання глобального кореневого контексту, видимого з усіх scope."
---

# root_context

(PHP 8.6+, True Async 1.0)

`root_context()` — Повертає глобальний кореневий об'єкт `Async\Context`, спільний для всього запиту.

## Опис

```php
root_context(): Async\Context
```

Повертає контекст верхнього рівня. Значення, встановлені тут, видимі через `find()` з будь-якого контексту в ієрархії.

## Значення, що повертаються

Об'єкт `Async\Context`.

## Приклади

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Встановити глобальну конфігурацію
root_context()
    ->set('app_name', 'MyApp')
    ->set('environment', 'production');

spawn(function() {
    // Доступно з будь-якої корутини через find()
    $env = current_context()->find('environment'); // "production"
});
?>
```

## Дивіться також

- [current_context()](/uk/docs/reference/current-context.html) — контекст Scope
- [coroutine_context()](/uk/docs/reference/coroutine-context.html) — контекст корутини
- [Context](/uk/docs/components/context.html) — концепція контексту
