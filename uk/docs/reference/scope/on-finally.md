---
layout: docs
lang: uk
path_key: "/docs/reference/scope/on-finally.html"
nav_active: docs
permalink: /uk/docs/reference/scope/on-finally.html
page_title: "Scope::finally"
description: "Реєструє зворотний виклик, що буде виконаний після завершення області видимості."
---

# Scope::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(\Closure $callback): void
```

Реєструє функцію зворотного виклику, яка буде виконана після завершення області видимості. Це еквівалент блоку `finally` для області видимості, що гарантує виконання коду очищення незалежно від того, як завершилася область (нормально, через скасування або з помилкою).

## Параметри

`callback` — замикання, яке буде викликане після завершення області видимості.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Очищення ресурсів

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Scope completed, cleaning up resources\n";
    // Close connections, delete temporary files
});

$scope->spawn(function() {
    echo "Executing task\n";
});

$scope->awaitCompletion();
// Output: "Executing task"
// Output: "Scope completed, cleaning up resources"
```

### Приклад #2 Кілька зворотних викликів

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Closing database connection\n";
});

$scope->finally(function() {
    echo "Writing metrics\n";
});

$scope->spawn(function() {
    \Async\delay(1000);
});

$scope->dispose();
// Both callbacks will be invoked when the scope completes
```

## Дивіться також

- [Scope::dispose](/uk/docs/reference/scope/dispose.html) — Закриття області видимості
- [Scope::isFinished](/uk/docs/reference/scope/is-finished.html) — Перевірка, чи завершена область видимості
- [Coroutine::finally](/uk/docs/reference/coroutine/on-finally.html) — Зворотний виклик при завершенні корутини
