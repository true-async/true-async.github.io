---
layout: docs
lang: uk
path_key: "/docs/reference/context/unset.html"
nav_active: docs
permalink: /uk/docs/reference/context/unset.html
page_title: "Context::unset"
description: "Видалити значення за ключем з контексту."
---

# Context::unset

(PHP 8.6+, True Async 1.0)

```php
public Context::unset(string|object $key): Context
```

Видаляє значення за ключем з поточного контексту. Видалення впливає лише на локальний
контекст --- значення в батьківських контекстах не змінюються.

Метод повертає об'єкт `Context`, що дозволяє ланцюжкові виклики методів.

## Параметри

**key**
: Ключ для видалення. Може бути рядком або об'єктом.

## Значення, що повертаються

Об'єкт `Context` для ланцюжкових викликів методів.

## Приклади

### Приклад #1 Видалення значення з контексту

```php
<?php

use function Async\current_context;

current_context()
    ->set('temp_data', 'value')
    ->set('keep_data', 'preserve');

echo current_context()->find('temp_data') . "\n"; // "value"

// Видаляємо тимчасові дані
current_context()->unset('temp_data');

var_dump(current_context()->find('temp_data')); // NULL
echo current_context()->find('keep_data') . "\n"; // "preserve"
```

### Приклад #2 Видалення з ключем-об'єктом

```php
<?php

use function Async\current_context;

$tokenKey = new stdClass();

current_context()->set($tokenKey, 'secret-token-123');
echo current_context()->find($tokenKey) . "\n"; // "secret-token-123"

// Видаляємо конфіденційні дані після використання
current_context()->unset($tokenKey);
var_dump(current_context()->find($tokenKey)); // NULL
```

### Приклад #3 Видалення не впливає на батьківський контекст

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('shared', 'parent_value');

spawn(function() {
    // Дочірній контекст бачить значення від батька
    echo current_context()->find('shared') . "\n"; // "parent_value"

    // Встановлюємо локальне значення з тим самим ключем
    current_context()->set('shared', 'child_value', replace: true);
    echo current_context()->findLocal('shared') . "\n"; // "child_value"

    // Видаляємо локальне значення
    current_context()->unset('shared');

    // Після видалення локального значення — батьківське знову видно через find()
    echo current_context()->find('shared') . "\n"; // "parent_value"
    var_dump(current_context()->findLocal('shared')); // NULL
});
```

### Приклад #4 Ланцюжкові виклики з unset

```php
<?php

use function Async\current_context;

current_context()
    ->set('a', 1)
    ->set('b', 2)
    ->set('c', 3);

// Очищуємо кілька ключів ланцюжком
current_context()
    ->unset('a')
    ->unset('b');

var_dump(current_context()->find('a')); // NULL
var_dump(current_context()->find('b')); // NULL
echo current_context()->find('c') . "\n"; // 3
```

## Дивіться також

- [Context::set](/uk/docs/reference/context/set.html) --- Встановити значення в контексті
- [Context::find](/uk/docs/reference/context/find.html) --- Знайти значення за ключем
- [Context::findLocal](/uk/docs/reference/context/find-local.html) --- Знайти значення в локальному контексті
