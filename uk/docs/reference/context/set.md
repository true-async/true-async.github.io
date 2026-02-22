---
layout: docs
lang: uk
path_key: "/docs/reference/context/set.html"
nav_active: docs
permalink: /uk/docs/reference/context/set.html
page_title: "Context::set"
description: "Встановити значення в контексті за ключем."
---

# Context::set

(PHP 8.6+, True Async 1.0)

```php
public Context::set(string|object $key, mixed $value, bool $replace = false): Context
```

Встановлює значення в поточному контексті із зазначеним ключем. За замовчуванням, якщо ключ
вже існує, значення **не перезаписується**. Для примусового перезапису використовуйте
параметр `replace = true`.

Метод повертає об'єкт `Context`, що дозволяє ланцюжкові виклики методів.

## Параметри

**key**
: Ключ для встановлення значення. Може бути рядком або об'єктом.
  Ключі-об'єкти корисні для уникнення конфліктів імен між бібліотеками.

**value**
: Значення для збереження. Може бути будь-якого типу.

**replace**
: Якщо `false` (за замовчуванням) --- не перезаписувати існуюче значення.
  Якщо `true` --- перезаписати значення, навіть якщо ключ вже існує.

## Значення, що повертаються

Об'єкт `Context` для ланцюжкових викликів методів.

## Приклади

### Приклад #1 Встановлення значень з рядковими ключами

```php
<?php

use function Async\current_context;

// Ланцюжкові виклики
current_context()
    ->set('request_id', 'req-001')
    ->set('user_id', 42)
    ->set('locale', 'ru_RU');

echo current_context()->find('request_id') . "\n"; // "req-001"
echo current_context()->find('user_id') . "\n";    // 42
```

### Приклад #2 Поведінка без перезапису

```php
<?php

use function Async\current_context;

current_context()->set('mode', 'production');

// Повторне встановлення без replace — значення НЕ змінюється
current_context()->set('mode', 'debug');
echo current_context()->find('mode') . "\n"; // "production"

// З replace = true — значення перезаписується
current_context()->set('mode', 'debug', replace: true);
echo current_context()->find('mode') . "\n"; // "debug"
```

### Приклад #3 Ключі-об'єкти для ізоляції бібліотек

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Кожна бібліотека використовує свій ключ-об'єкт
class LoggerContext {
    public static object $key;
}
LoggerContext::$key = new stdClass();

class CacheContext {
    public static object $key;
}
CacheContext::$key = new stdClass();

current_context()
    ->set(LoggerContext::$key, new FileLogger('/var/log/app.log'))
    ->set(CacheContext::$key, new RedisCache('localhost:6379'));

spawn(function() {
    $logger = current_context()->find(LoggerContext::$key);
    $cache = current_context()->find(CacheContext::$key);

    $logger->info('Cache initialized');
});
```

### Приклад #4 Передача контексту дочірнім корутинам

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Батьківський контекст
current_context()
    ->set('trace_id', bin2hex(random_bytes(8)))
    ->set('service', 'api-gateway');

// Дочірні корутини успадковують значення через find()
spawn(function() {
    $traceId = current_context()->find('trace_id');
    echo "Обробка запиту: {$traceId}\n";

    // Дочірня корутина додає власне значення
    current_context()->set('handler', 'user_controller');
});
```

## Дивіться також

- [Context::unset](/uk/docs/reference/context/unset.html) --- Видалити значення за ключем
- [Context::find](/uk/docs/reference/context/find.html) --- Знайти значення за ключем
- [Context::get](/uk/docs/reference/context/get.html) --- Отримати значення (кидає виключення)
- [current_context()](/uk/docs/reference/current-context.html) --- Отримати контекст поточного Scope
