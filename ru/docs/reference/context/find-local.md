---
layout: docs
lang: ru
path_key: "/docs/reference/context/find-local.html"
nav_active: docs
permalink: /ru/docs/reference/context/find-local.html
page_title: "Context::findLocal"
description: "Найти значение только в локальном контексте (без поиска в родительских)."
---

# Context::findLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::findLocal(string|object $key): mixed
```

Ищет значение по ключу **только** в текущем (локальном) контексте. В отличие от `find()`,
этот метод не выполняет поиск вверх по иерархии родительских контекстов.

Возвращает `null`, если ключ не найден на текущем уровне.

## Параметры

**key**
: Ключ для поиска. Может быть строкой или объектом.

## Возвращаемое значение

Значение, связанное с ключом в локальном контексте, или `null`, если ключ не найден.

## Примеры

### Пример #1 Различие между find и findLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('config', 'global_value');

spawn(function() {
    current_context()->set('local_data', 'local_value');

    // find() ищет вверх по иерархии
    echo current_context()->find('config') . "\n";       // "global_value"

    // findLocal() ищет только на текущем уровне
    echo current_context()->findLocal('local_data') . "\n"; // "local_value"
    var_dump(current_context()->findLocal('config'));        // NULL
});
```

### Пример #2 Использование с объектным ключом

```php
<?php

use function Async\current_context;
use function Async\spawn;

$parentKey = new stdClass();
$localKey = new stdClass();

current_context()->set($parentKey, 'parent_value');

spawn(function() use ($parentKey, $localKey) {
    current_context()->set($localKey, 'child_value');

    // Объектный ключ из родителя не виден через findLocal
    var_dump(current_context()->findLocal($parentKey)); // NULL
    var_dump(current_context()->findLocal($localKey));  // "child_value"
});
```

### Пример #3 Переопределение родительского значения

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('timeout', 5000);

spawn(function() {
    // Проверяем, переопределено ли значение локально
    if (current_context()->findLocal('timeout') === null) {
        // Используем унаследованное значение, но можем переопределить
        current_context()->set('timeout', 3000);
    }

    echo current_context()->findLocal('timeout') . "\n"; // 3000
});
```

## См. также

- [Context::find](/ru/docs/reference/context/find.html) --- Поиск с иерархическим обходом
- [Context::getLocal](/ru/docs/reference/context/get-local.html) --- Получить локальное значение (с исключением)
- [Context::hasLocal](/ru/docs/reference/context/has-local.html) --- Проверить ключ в локальном контексте
