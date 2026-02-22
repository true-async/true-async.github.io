---
layout: docs
lang: uk
path_key: "/docs/reference/context/find-local.html"
nav_active: docs
permalink: /uk/docs/reference/context/find-local.html
page_title: "Context::findLocal"
description: "Знайти значення лише в локальному контексті (без пошуку в батьківських контекстах)."
---

# Context::findLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::findLocal(string|object $key): mixed
```

Шукає значення за ключем **лише** в поточному (локальному) контексті. На відміну від `find()`,
цей метод не виконує пошук вгору по ієрархії батьківських контекстів.

Повертає `null`, якщо ключ не знайдено на поточному рівні.

## Параметри

**key**
: Ключ для пошуку. Може бути рядком або об'єктом.

## Значення, що повертаються

Значення, пов'язане з ключем у локальному контексті, або `null`, якщо ключ не знайдено.

## Приклади

### Приклад #1 Різниця між find і findLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('config', 'global_value');

spawn(function() {
    current_context()->set('local_data', 'local_value');

    // find() шукає вгору по ієрархії
    echo current_context()->find('config') . "\n";       // "global_value"

    // findLocal() шукає лише на поточному рівні
    echo current_context()->findLocal('local_data') . "\n"; // "local_value"
    var_dump(current_context()->findLocal('config'));        // NULL
});
```

### Приклад #2 Використання з ключем-об'єктом

```php
<?php

use function Async\current_context;
use function Async\spawn;

$parentKey = new stdClass();
$localKey = new stdClass();

current_context()->set($parentKey, 'parent_value');

spawn(function() use ($parentKey, $localKey) {
    current_context()->set($localKey, 'child_value');

    // Ключ-об'єкт з батьківського контексту не видно через findLocal
    var_dump(current_context()->findLocal($parentKey)); // NULL
    var_dump(current_context()->findLocal($localKey));  // "child_value"
});
```

### Приклад #3 Перевизначення батьківського значення

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('timeout', 5000);

spawn(function() {
    // Перевіряємо, чи значення перевизначено локально
    if (current_context()->findLocal('timeout') === null) {
        // Використовуємо успадковане значення, але можемо перевизначити
        current_context()->set('timeout', 3000);
    }

    echo current_context()->findLocal('timeout') . "\n"; // 3000
});
```

## Дивіться також

- [Context::find](/uk/docs/reference/context/find.html) --- Пошук з обходом ієрархії
- [Context::getLocal](/uk/docs/reference/context/get-local.html) --- Отримати локальне значення (кидає виключення)
- [Context::hasLocal](/uk/docs/reference/context/has-local.html) --- Перевірити ключ у локальному контексті
