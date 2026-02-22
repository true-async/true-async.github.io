---
layout: docs
lang: uk
path_key: "/docs/reference/context/has.html"
nav_active: docs
permalink: /uk/docs/reference/context/has.html
page_title: "Context::has"
description: "Перевірити, чи існує ключ у поточному або батьківському контексті."
---

# Context::has

(PHP 8.6+, True Async 1.0)

```php
public Context::has(string|object $key): bool
```

Перевіряє, чи існує значення із зазначеним ключем у поточному контексті або в одному
з батьківських контекстів. Пошук виконується вгору по ієрархії.

## Параметри

**key**
: Ключ для перевірки. Може бути рядком або об'єктом.

## Значення, що повертаються

`true`, якщо ключ знайдено в поточному або будь-якому батьківському контексті, `false` в іншому випадку.

## Приклади

### Приклад #1 Перевірка наявності ключа перед використанням

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('locale', 'ru_RU');

spawn(function() {
    if (current_context()->has('locale')) {
        $locale = current_context()->find('locale');
        echo "Locale: {$locale}\n"; // "Locale: ru_RU"
    } else {
        echo "Locale не встановлено, використовуємо за замовчуванням\n";
    }
});
```

### Приклад #2 Перевірка з ключем-об'єктом

```php
<?php

use function Async\current_context;

$cacheKey = new stdClass();

current_context()->set($cacheKey, new RedisCache());

if (current_context()->has($cacheKey)) {
    echo "Кеш доступний\n";
}

$unknownKey = new stdClass();
var_dump(current_context()->has($unknownKey)); // false
```

### Приклад #3 Ієрархічна перевірка

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('global_flag', true);

spawn(function() {
    current_context()->set('local_flag', true);

    spawn(function() {
        var_dump(current_context()->has('global_flag')); // true (з кореня)
        var_dump(current_context()->has('local_flag'));   // true (від батька)
        var_dump(current_context()->has('unknown'));      // false
    });
});
```

## Дивіться також

- [Context::find](/uk/docs/reference/context/find.html) --- Знайти значення за ключем
- [Context::get](/uk/docs/reference/context/get.html) --- Отримати значення (кидає виключення)
- [Context::hasLocal](/uk/docs/reference/context/has-local.html) --- Перевірити лише в локальному контексті
