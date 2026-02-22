---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine-context.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine-context.html
page_title: "coroutine_context()"
description: "coroutine_context() — отримання приватного контексту поточної корутини."
---

# coroutine_context

(PHP 8.6+, True Async 1.0)

`coroutine_context()` — Повертає об'єкт `Async\Context`, прив'язаний до поточної корутини.

## Опис

```php
coroutine_context(): Async\Context
```

Повертає **приватний** контекст поточної корутини. Дані, встановлені тут, не видимі для інших корутин. Якщо контекст для корутини ще не створено, він створюється автоматично.

## Значення, що повертаються

Об'єкт `Async\Context`.

## Приклади

```php
<?php
use function Async\spawn;
use function Async\coroutine_context;

spawn(function() {
    coroutine_context()->set('step', 1);
    // Пізніше в тій самій корутині
    $step = coroutine_context()->getLocal('step'); // 1
});

spawn(function() {
    // Не бачить 'step' з іншої корутини
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

## Дивіться також

- [current_context()](/uk/docs/reference/current-context.html) — контекст Scope
- [root_context()](/uk/docs/reference/root-context.html) — глобальний контекст
- [Context](/uk/docs/components/context.html) — концепція контексту
