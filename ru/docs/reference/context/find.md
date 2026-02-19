---
layout: docs
lang: ru
path_key: "/docs/reference/context/find.html"
nav_active: docs
permalink: /ru/docs/reference/context/find.html
page_title: "Context::find"
description: "Найти значение по ключу в текущем или родительском контексте."
---

# Context::find

(PHP 8.6+, True Async 1.0)

```php
public Context::find(string|object $key): mixed
```

Ищет значение по ключу в текущем контексте. Если ключ не найден — продолжает поиск вверх
по иерархии родительских контекстов. Возвращает `null`, если значение не найдено ни на одном уровне.

Это безопасный метод поиска: он никогда не бросает исключение при отсутствии ключа.

## Параметры

**key**
: Ключ для поиска. Может быть строкой или объектом.
  При использовании объекта в качестве ключа поиск выполняется по ссылке на объект.

## Возвращаемое значение

Значение, связанное с ключом, или `null`, если ключ не найден ни в текущем,
ни в родительских контекстах.

## Примеры

### Пример #1 Поиск значения по строковому ключу

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Дочерняя корутина находит значение из родительского контекста
    $id = current_context()->find('request_id');
    echo $id . "\n"; // "abc-123"

    // Поиск несуществующего ключа возвращает null
    $missing = current_context()->find('nonexistent');
    var_dump($missing); // NULL
});
```

### Пример #2 Поиск значения по объектному ключу

```php
<?php

use function Async\current_context;
use function Async\spawn;

$loggerKey = new stdClass();

current_context()->set($loggerKey, new MyLogger());

spawn(function() use ($loggerKey) {
    // Поиск по ссылке на объект-ключ
    $logger = current_context()->find($loggerKey);
    $logger->info('Сообщение из дочерней корутины');
});
```

### Пример #3 Иерархический поиск

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Корневой уровень
current_context()->set('app_name', 'MyApp');

spawn(function() {
    // Уровень 1: добавляем своё значение
    current_context()->set('user_id', 42);

    spawn(function() {
        // Уровень 2: ищем значения из всех уровней
        echo current_context()->find('user_id') . "\n";   // 42
        echo current_context()->find('app_name') . "\n";  // "MyApp"
    });
});
```

## См. также

- [Context::get](/ru/docs/reference/context/get.html) --- Получить значение (с исключением при отсутствии)
- [Context::has](/ru/docs/reference/context/has.html) --- Проверить существование ключа
- [Context::findLocal](/ru/docs/reference/context/find-local.html) --- Поиск только в локальном контексте
- [Context::set](/ru/docs/reference/context/set.html) --- Установить значение в контексте
