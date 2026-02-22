---
layout: docs
lang: uk
path_key: "/docs/reference/current-context.html"
nav_active: docs
permalink: /uk/docs/reference/current-context.html
page_title: "current_context()"
description: "current_context() — отримання контексту поточного Scope."
---

# current_context

(PHP 8.6+, True Async 1.0)

`current_context()` — Повертає об'єкт `Async\Context`, прив'язаний до поточного Scope.

## Опис

```php
current_context(): Async\Context
```

Якщо контекст для поточного Scope ще не створено, він створюється автоматично.
Значення, встановлені в цьому контексті, видимі для всіх корутин у поточному Scope через `find()`.

## Значення, що повертаються

Об'єкт `Async\Context`.

## Приклади

```php
<?php
use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Бачить значення з батьківського scope
    $id = current_context()->find('request_id'); // "abc-123"
});
?>
```

## Дивіться також

- [coroutine_context()](/uk/docs/reference/coroutine-context.html) — контекст корутини
- [root_context()](/uk/docs/reference/root-context.html) — глобальний контекст
- [Context](/uk/docs/components/context.html) — концепція контексту
