---
layout: docs
lang: uk
path_key: "/docs/reference/context/get-local.html"
nav_active: docs
permalink: /uk/docs/reference/context/get-local.html
page_title: "Context::getLocal"
description: "Отримати значення лише з локального контексту. Кидає виключення, якщо не знайдено."
---

# Context::getLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::getLocal(string|object $key): mixed
```

Отримує значення за ключем **лише** з поточного (локального) контексту.
На відміну від `get()`, цей метод не шукає в батьківських контекстах.

Якщо ключ не знайдено на поточному рівні, кидається виключення.

## Параметри

**key**
: Ключ для пошуку. Може бути рядком або об'єктом.

## Значення, що повертаються

Значення, пов'язане з ключем у локальному контексті.

## Помилки

- Кидає `Async\ContextException`, якщо ключ не знайдено в локальному контексті.

## Приклади

### Приклад #1 Отримання локального значення

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    current_context()->set('task_id', 42);

    // Значення встановлено локально — getLocal працює
    $taskId = current_context()->getLocal('task_id');
    echo "Task: {$taskId}\n"; // "Task: 42"
});
```

### Приклад #2 Виключення при доступі до успадкованого ключа

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('parent_value', 'hello');

spawn(function() {
    // find() знайде значення в батьківському контексті
    echo current_context()->find('parent_value') . "\n"; // "hello"

    // getLocal() кидає виключення — значення відсутнє в локальному контексті
    try {
        current_context()->getLocal('parent_value');
    } catch (\Async\ContextException $e) {
        echo "Не знайдено локально: " . $e->getMessage() . "\n";
    }
});
```

### Приклад #3 Використання з ключем-об'єктом

```php
<?php

use function Async\current_context;
use function Async\spawn;

class SessionKey {}

spawn(function() {
    $key = new SessionKey();
    current_context()->set($key, ['user' => 'admin', 'role' => 'superuser']);

    $session = current_context()->getLocal($key);
    echo "User: " . $session['user'] . "\n"; // "User: admin"
});
```

## Дивіться також

- [Context::get](/uk/docs/reference/context/get.html) --- Отримати значення з ієрархічним пошуком
- [Context::findLocal](/uk/docs/reference/context/find-local.html) --- Безпечний пошук у локальному контексті
- [Context::hasLocal](/uk/docs/reference/context/has-local.html) --- Перевірити ключ у локальному контексті
