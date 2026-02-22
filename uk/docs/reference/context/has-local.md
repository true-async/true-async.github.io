---
layout: docs
lang: uk
path_key: "/docs/reference/context/has-local.html"
nav_active: docs
permalink: /uk/docs/reference/context/has-local.html
page_title: "Context::hasLocal"
description: "Перевірити, чи існує ключ лише в локальному контексті."
---

# Context::hasLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::hasLocal(string|object $key): bool
```

Перевіряє, чи існує значення із зазначеним ключем **лише** в поточному (локальному) контексті.
На відміну від `has()`, цей метод не шукає в батьківських контекстах.

## Параметри

**key**
: Ключ для перевірки. Може бути рядком або об'єктом.

## Значення, що повертаються

`true`, якщо ключ знайдено в локальному контексті, `false` в іншому випадку.

## Приклади

### Приклад #1 Різниця між has і hasLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('inherited_key', 'value');

spawn(function() {
    current_context()->set('local_key', 'value');

    // has() шукає вгору по ієрархії
    var_dump(current_context()->has('inherited_key'));      // true
    var_dump(current_context()->has('local_key'));          // true

    // hasLocal() перевіряє лише поточний рівень
    var_dump(current_context()->hasLocal('inherited_key')); // false
    var_dump(current_context()->hasLocal('local_key'));      // true
});
```

### Приклад #2 Перевірка з ключем-об'єктом

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

### Приклад #3 Умовна ініціалізація локального значення

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    // Ініціалізуємо значення лише якщо воно не встановлено локально
    if (!current_context()->hasLocal('request_count')) {
        current_context()->set('request_count', 0);
    }

    echo current_context()->getLocal('request_count') . "\n"; // 0
});
```

## Дивіться також

- [Context::has](/uk/docs/reference/context/has.html) --- Перевірка з обходом ієрархії
- [Context::findLocal](/uk/docs/reference/context/find-local.html) --- Знайти значення в локальному контексті
- [Context::getLocal](/uk/docs/reference/context/get-local.html) --- Отримати локальне значення (кидає виключення)
