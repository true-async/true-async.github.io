---
layout: docs
lang: uk
path_key: "/docs/reference/context/find.html"
nav_active: docs
permalink: /uk/docs/reference/context/find.html
page_title: "Context::find"
description: "Знайти значення за ключем у поточному або батьківському контексті."
---

# Context::find

(PHP 8.6+, True Async 1.0)

```php
public Context::find(string|object $key): mixed
```

Шукає значення за ключем у поточному контексті. Якщо ключ не знайдено, пошук продовжується
вгору по ієрархії батьківських контекстів. Повертає `null`, якщо значення не знайдено на жодному рівні.

Це безпечний метод пошуку: він ніколи не кидає виключення при відсутності ключа.

## Параметри

**key**
: Ключ для пошуку. Може бути рядком або об'єктом.
  При використанні об'єкта як ключа пошук виконується за посиланням на об'єкт.

## Значення, що повертаються

Значення, пов'язане з ключем, або `null`, якщо ключ не знайдено в поточному
чи будь-якому батьківському контексті.

## Приклади

### Приклад #1 Пошук значення за рядковим ключем

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Дочірня корутина знаходить значення з батьківського контексту
    $id = current_context()->find('request_id');
    echo $id . "\n"; // "abc-123"

    // Пошук неіснуючого ключа повертає null
    $missing = current_context()->find('nonexistent');
    var_dump($missing); // NULL
});
```

### Приклад #2 Пошук значення за ключем-об'єктом

```php
<?php

use function Async\current_context;
use function Async\spawn;

$loggerKey = new stdClass();

current_context()->set($loggerKey, new MyLogger());

spawn(function() use ($loggerKey) {
    // Пошук за посиланням на ключ-об'єкт
    $logger = current_context()->find($loggerKey);
    $logger->info('Message from child coroutine');
});
```

### Приклад #3 Ієрархічний пошук

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Кореневий рівень
current_context()->set('app_name', 'MyApp');

spawn(function() {
    // Рівень 1: додаємо власне значення
    current_context()->set('user_id', 42);

    spawn(function() {
        // Рівень 2: пошук значень з усіх рівнів
        echo current_context()->find('user_id') . "\n";   // 42
        echo current_context()->find('app_name') . "\n";  // "MyApp"
    });
});
```

## Дивіться також

- [Context::get](/uk/docs/reference/context/get.html) --- Отримати значення (кидає виключення, якщо відсутнє)
- [Context::has](/uk/docs/reference/context/has.html) --- Перевірити наявність ключа
- [Context::findLocal](/uk/docs/reference/context/find-local.html) --- Пошук лише в локальному контексті
- [Context::set](/uk/docs/reference/context/set.html) --- Встановити значення в контексті
