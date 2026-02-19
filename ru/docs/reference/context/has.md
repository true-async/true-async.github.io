---
layout: docs
lang: ru
path_key: "/docs/reference/context/has.html"
nav_active: docs
permalink: /ru/docs/reference/context/has.html
page_title: "Context::has"
description: "Проверить существование ключа в текущем или родительском контексте."
---

# Context::has

(PHP 8.6+, True Async 1.0)

```php
public Context::has(string|object $key): bool
```

Проверяет, существует ли значение с указанным ключом в текущем контексте или в одном
из родительских контекстов. Поиск выполняется вверх по иерархии.

## Параметры

**key**
: Ключ для проверки. Может быть строкой или объектом.

## Возвращаемое значение

`true`, если ключ найден в текущем или любом родительском контексте, `false` --- в противном случае.

## Примеры

### Пример #1 Проверка наличия ключа перед использованием

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('locale', 'ru_RU');

spawn(function() {
    if (current_context()->has('locale')) {
        $locale = current_context()->find('locale');
        echo "Локаль: {$locale}\n"; // "Локаль: ru_RU"
    } else {
        echo "Локаль не задана, используем значение по умолчанию\n";
    }
});
```

### Пример #2 Проверка с объектным ключом

```php
<?php

use function Async\current_context;

$cacheKey = new stdClass();

current_context()->set($cacheKey, new RedisCache());

if (current_context()->has($cacheKey)) {
    echo "Кеш доступен\n";
}

$unknownKey = new stdClass();
var_dump(current_context()->has($unknownKey)); // false
```

### Пример #3 Иерархическая проверка

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('global_flag', true);

spawn(function() {
    current_context()->set('local_flag', true);

    spawn(function() {
        var_dump(current_context()->has('global_flag')); // true (из корневого)
        var_dump(current_context()->has('local_flag'));   // true (из родителя)
        var_dump(current_context()->has('unknown'));      // false
    });
});
```

## См. также

- [Context::find](/ru/docs/reference/context/find.html) --- Найти значение по ключу
- [Context::get](/ru/docs/reference/context/get.html) --- Получить значение (с исключением)
- [Context::hasLocal](/ru/docs/reference/context/has-local.html) --- Проверка только в локальном контексте
