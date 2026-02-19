---
layout: docs
lang: ru
path_key: "/docs/reference/context/unset.html"
nav_active: docs
permalink: /ru/docs/reference/context/unset.html
page_title: "Context::unset"
description: "Удалить значение по ключу из контекста."
---

# Context::unset

(PHP 8.6+, True Async 1.0)

```php
public Context::unset(string|object $key): Context
```

Удаляет значение по ключу из текущего контекста. Удаление затрагивает только локальный
контекст --- значения в родительских контекстах не изменяются.

Метод возвращает объект `Context`, что позволяет использовать цепочки вызовов (chaining).

## Параметры

**key**
: Ключ для удаления. Может быть строкой или объектом.

## Возвращаемое значение

Объект `Context` для цепочки вызовов.

## Примеры

### Пример #1 Удаление значения из контекста

```php
<?php

use function Async\current_context;

current_context()
    ->set('temp_data', 'значение')
    ->set('keep_data', 'сохранить');

echo current_context()->find('temp_data') . "\n"; // "значение"

// Удаляем временные данные
current_context()->unset('temp_data');

var_dump(current_context()->find('temp_data')); // NULL
echo current_context()->find('keep_data') . "\n"; // "сохранить"
```

### Пример #2 Удаление с объектным ключом

```php
<?php

use function Async\current_context;

$tokenKey = new stdClass();

current_context()->set($tokenKey, 'secret-token-123');
echo current_context()->find($tokenKey) . "\n"; // "secret-token-123"

// Удаляем чувствительные данные после использования
current_context()->unset($tokenKey);
var_dump(current_context()->find($tokenKey)); // NULL
```

### Пример #3 Удаление не затрагивает родительский контекст

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('shared', 'parent_value');

spawn(function() {
    // Дочерний контекст видит значение из родителя
    echo current_context()->find('shared') . "\n"; // "parent_value"

    // Устанавливаем локальное значение с тем же ключом
    current_context()->set('shared', 'child_value', replace: true);
    echo current_context()->findLocal('shared') . "\n"; // "child_value"

    // Удаляем локальное значение
    current_context()->unset('shared');

    // После удаления локального — снова видим родительское через find()
    echo current_context()->find('shared') . "\n"; // "parent_value"
    var_dump(current_context()->findLocal('shared')); // NULL
});
```

### Пример #4 Цепочка вызовов с unset

```php
<?php

use function Async\current_context;

current_context()
    ->set('a', 1)
    ->set('b', 2)
    ->set('c', 3);

// Очистка нескольких ключей цепочкой
current_context()
    ->unset('a')
    ->unset('b');

var_dump(current_context()->find('a')); // NULL
var_dump(current_context()->find('b')); // NULL
echo current_context()->find('c') . "\n"; // 3
```

## См. также

- [Context::set](/ru/docs/reference/context/set.html) --- Установить значение в контексте
- [Context::find](/ru/docs/reference/context/find.html) --- Найти значение по ключу
- [Context::findLocal](/ru/docs/reference/context/find-local.html) --- Найти значение в локальном контексте
