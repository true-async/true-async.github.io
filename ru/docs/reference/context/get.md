---
layout: docs
lang: ru
path_key: "/docs/reference/context/get.html"
nav_active: docs
permalink: /ru/docs/reference/context/get.html
page_title: "Context::get"
description: "Получить значение из контекста. Бросает исключение, если ключ не найден."
---

# Context::get

(PHP 8.6+, True Async 1.0)

```php
public Context::get(string|object $key): mixed
```

Получает значение по ключу из текущего контекста. Если ключ не найден на текущем уровне ---
продолжает поиск вверх по иерархии родительских контекстов.

В отличие от `find()`, этот метод бросает исключение, если ключ не найден ни на одном уровне.
Используйте `get()`, когда наличие значения является обязательным условием.

## Параметры

**key**
: Ключ для поиска. Может быть строкой или объектом.
  При использовании объекта в качестве ключа поиск выполняется по ссылке на объект.

## Возвращаемое значение

Значение, связанное с ключом.

## Ошибки

- Выбрасывает `Async\ContextException`, если ключ не найден ни в текущем,
  ни в родительских контекстах.

## Примеры

### Пример #1 Получение обязательного значения

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('db_connection', $pdo);

spawn(function() {
    // Получаем значение, которое обязательно должно существовать
    $db = current_context()->get('db_connection');
    $db->query('SELECT 1');
});
```

### Пример #2 Обработка отсутствующего ключа

```php
<?php

use function Async\current_context;

try {
    $value = current_context()->get('missing_key');
} catch (\Async\ContextException $e) {
    echo "Ключ не найден: " . $e->getMessage() . "\n";
}
```

### Пример #3 Использование объектного ключа

```php
<?php

use function Async\current_context;
use function Async\spawn;

class DatabaseKey {}

$dbKey = new DatabaseKey();
current_context()->set($dbKey, new PDO('sqlite::memory:'));

spawn(function() use ($dbKey) {
    // Объектный ключ обеспечивает уникальность без конфликтов имён
    $pdo = current_context()->get($dbKey);
    $pdo->exec('CREATE TABLE test (id INTEGER)');
});
```

## См. также

- [Context::find](/ru/docs/reference/context/find.html) --- Безопасный поиск (возвращает null)
- [Context::has](/ru/docs/reference/context/has.html) --- Проверить существование ключа
- [Context::getLocal](/ru/docs/reference/context/get-local.html) --- Получить значение только из локального контекста
- [Context::set](/ru/docs/reference/context/set.html) --- Установить значение в контексте
