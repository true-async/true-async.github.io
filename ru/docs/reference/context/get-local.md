---
layout: docs
lang: ru
path_key: "/docs/reference/context/get-local.html"
nav_active: docs
permalink: /ru/docs/reference/context/get-local.html
page_title: "Context::getLocal"
description: "Получить значение только из локального контекста. Бросает исключение, если не найдено."
---

# Context::getLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::getLocal(string|object $key): mixed
```

Получает значение по ключу **только** из текущего (локального) контекста.
В отличие от `get()`, этот метод не выполняет поиск в родительских контекстах.

Если ключ не найден на текущем уровне --- бросает исключение.

## Параметры

**key**
: Ключ для поиска. Может быть строкой или объектом.

## Возвращаемое значение

Значение, связанное с ключом в локальном контексте.

## Ошибки

- Выбрасывает `Async\ContextException`, если ключ не найден в локальном контексте.

## Примеры

### Пример #1 Получение локального значения

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    current_context()->set('task_id', 42);

    // Значение установлено локально — getLocal работает
    $taskId = current_context()->getLocal('task_id');
    echo "Задача: {$taskId}\n"; // "Задача: 42"
});
```

### Пример #2 Исключение при обращении к унаследованному ключу

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('parent_value', 'hello');

spawn(function() {
    // find() нашёл бы значение в родителе
    echo current_context()->find('parent_value') . "\n"; // "hello"

    // getLocal() бросает исключение — значение не в локальном контексте
    try {
        current_context()->getLocal('parent_value');
    } catch (\Async\ContextException $e) {
        echo "Локально не найдено: " . $e->getMessage() . "\n";
    }
});
```

### Пример #3 Использование с объектным ключом

```php
<?php

use function Async\current_context;
use function Async\spawn;

class SessionKey {}

spawn(function() {
    $key = new SessionKey();
    current_context()->set($key, ['user' => 'admin', 'role' => 'superuser']);

    $session = current_context()->getLocal($key);
    echo "Пользователь: " . $session['user'] . "\n"; // "Пользователь: admin"
});
```

## См. также

- [Context::get](/ru/docs/reference/context/get.html) --- Получить значение с иерархическим поиском
- [Context::findLocal](/ru/docs/reference/context/find-local.html) --- Безопасный поиск в локальном контексте
- [Context::hasLocal](/ru/docs/reference/context/has-local.html) --- Проверить ключ в локальном контексте
