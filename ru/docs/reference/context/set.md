---
layout: docs
lang: ru
path_key: "/docs/reference/context/set.html"
nav_active: docs
permalink: /ru/docs/reference/context/set.html
page_title: "Context::set"
description: "Установить значение в контексте по ключу."
---

# Context::set

(PHP 8.6+, True Async 1.0)

```php
public Context::set(string|object $key, mixed $value, bool $replace = false): Context
```

Устанавливает значение в текущем контексте по указанному ключу. По умолчанию, если ключ
уже существует, значение **не перезаписывается**. Для принудительной перезаписи используйте
параметр `replace = true`.

Метод возвращает объект `Context`, что позволяет использовать цепочки вызовов (chaining).

## Параметры

**key**
: Ключ для установки значения. Может быть строкой или объектом.
  Объектные ключи полезны для избежания конфликтов имён между библиотеками.

**value**
: Значение для сохранения. Может быть любого типа.

**replace**
: Если `false` (по умолчанию) --- не перезаписывать существующее значение.
  Если `true` --- перезаписать значение, даже если ключ уже существует.

## Возвращаемое значение

Объект `Context` для цепочки вызовов.

## Примеры

### Пример #1 Установка значений со строковыми ключами

```php
<?php

use function Async\current_context;

// Цепочка вызовов
current_context()
    ->set('request_id', 'req-001')
    ->set('user_id', 42)
    ->set('locale', 'ru_RU');

echo current_context()->find('request_id') . "\n"; // "req-001"
echo current_context()->find('user_id') . "\n";    // 42
```

### Пример #2 Поведение без перезаписи

```php
<?php

use function Async\current_context;

current_context()->set('mode', 'production');

// Повторная установка без replace — значение НЕ изменится
current_context()->set('mode', 'debug');
echo current_context()->find('mode') . "\n"; // "production"

// С replace = true — значение перезаписывается
current_context()->set('mode', 'debug', replace: true);
echo current_context()->find('mode') . "\n"; // "debug"
```

### Пример #3 Объектные ключи для изоляции библиотек

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Каждая библиотека использует свой объект-ключ
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

    $logger->info('Кеш инициализирован');
});
```

### Пример #4 Передача контекста в дочерние корутины

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Родительский контекст
current_context()
    ->set('trace_id', bin2hex(random_bytes(8)))
    ->set('service', 'api-gateway');

// Дочерние корутины наследуют значения через find()
spawn(function() {
    $traceId = current_context()->find('trace_id');
    echo "Обработка запроса: {$traceId}\n";

    // Дочерняя корутина добавляет своё значение
    current_context()->set('handler', 'user_controller');
});
```

## См. также

- [Context::unset](/ru/docs/reference/context/unset.html) --- Удалить значение по ключу
- [Context::find](/ru/docs/reference/context/find.html) --- Найти значение по ключу
- [Context::get](/ru/docs/reference/context/get.html) --- Получить значение (с исключением)
- [current_context()](/ru/docs/reference/current-context.html) --- Получить контекст текущего Scope
