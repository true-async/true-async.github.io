---
layout: docs
lang: ru
path_key: "/docs/reference/context/has-local.html"
nav_active: docs
permalink: /ru/docs/reference/context/has-local.html
page_title: "Context::hasLocal"
description: "Проверить существование ключа только в локальном контексте."
---

# Context::hasLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::hasLocal(string|object $key): bool
```

Проверяет, существует ли значение с указанным ключом **только** в текущем (локальном) контексте.
В отличие от `has()`, этот метод не выполняет поиск в родительских контекстах.

## Параметры

**key**
: Ключ для проверки. Может быть строкой или объектом.

## Возвращаемое значение

`true`, если ключ найден в локальном контексте, `false` --- в противном случае.

## Примеры

### Пример #1 Различие между has и hasLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('inherited_key', 'value');

spawn(function() {
    current_context()->set('local_key', 'value');

    // has() ищет вверх по иерархии
    var_dump(current_context()->has('inherited_key'));      // true
    var_dump(current_context()->has('local_key'));          // true

    // hasLocal() проверяет только текущий уровень
    var_dump(current_context()->hasLocal('inherited_key')); // false
    var_dump(current_context()->hasLocal('local_key'));      // true
});
```

### Пример #2 Проверка с объектным ключом

```php
<?php

use function Async\current_context;
use function Async\spawn;

$configKey = new stdClass();
current_context()->set($configKey, ['debug' => true]);

spawn(function() use ($configKey) {
    $localKey = new stdClass();
    current_context()->set($localKey, 'local');

    var_dump(current_context()->hasLocal($configKey)); // false
    var_dump(current_context()->hasLocal($localKey));  // true
});
```

### Пример #3 Условная инициализация локального значения

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    // Инициализируем значение только если оно не установлено локально
    if (!current_context()->hasLocal('request_count')) {
        current_context()->set('request_count', 0);
    }

    echo current_context()->getLocal('request_count') . "\n"; // 0
});
```

## См. также

- [Context::has](/ru/docs/reference/context/has.html) --- Проверка с иерархическим обходом
- [Context::findLocal](/ru/docs/reference/context/find-local.html) --- Найти значение в локальном контексте
- [Context::getLocal](/ru/docs/reference/context/get-local.html) --- Получить локальное значение (с исключением)
