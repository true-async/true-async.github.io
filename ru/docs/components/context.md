---
layout: docs
lang: ru
path_key: "/docs/components/context.html"
nav_active: docs
permalink: /ru/docs/components/context.html
page_title: "Context"
description: "Context в TrueAsync — хранение данных в иерархии скоупов, локальные и наследуемые значения, аналог Go context.Context."
---

# Context: контексты выполнения

## Зачем это нужно

Есть `API` с классом-сервисом, которому требуется выполнять действия, привязанные к токену авторизации.
Однако в каждый метод сервиса передавать токен плохая идея.
В `PHP` данная задача решается через глобальную переменную или статическое свойство класса.
Однако в асинхронной среде, где один процесс может обрабатывать разные запросы, такой подход не сработает, 
так как в момент вызова неизвестно какой запрос будет обрабатываться.

`Async\Context` позволяет хранить данные, связанные с корутиной или `Scope` и строить логику приложения,
основанную на контексте выполнения.

## Что такое Context

`Async\Context` — это хранилище ключ-значение, привязанное к `Scope` или корутине.
Контексты образуют иерархию: при чтении значения поиск идёт вверх по дереву scope.

Это аналог `context.Context` в `Go` или `CoroutineContext` в `Kotlin`. 
Механизм передачи данных по иерархии без явной передачи параметров.

## Три уровня контекста

`TrueAsync` предоставляет три функции для доступа к контекстам:

```php
<?php
use function Async\current_context;
use function Async\coroutine_context;
use function Async\root_context;

// Контекст текущего Scope
$scopeCtx = current_context();

// Контекст текущей корутины
$coroCtx = coroutine_context();

// Глобальный корневой контекст
$rootCtx = root_context();
?>
```

### current_context()

Возвращает контекст текущего `Scope`. Если контекст ещё не создан — создаёт его автоматически.
Значения, установленные здесь, видны всем корутинам в этом Scope.

### coroutine_context()

Возвращает контекст текущей корутины. Это **приватный** контекст, принадлежащий только этой корутине.
Другие корутины не видят данные, установленные здесь.

### root_context()

Возвращает глобальный контекст, общий для всего запроса. Значения здесь видны через `find()` из любого контекста.

## Ключи

Ключом может быть **строка** или **объект**:

```php
<?php
use function Async\current_context;

$ctx = current_context();

// Строковый ключ
$ctx->set('request_id', 'abc-123');

// Объект как ключ (полезно для уникальных токенов)
$key = new stdClass();
$ctx->set($key, 'значение');
?>
```

Объекты-ключи хранятся по ссылке в контексте, что гарантирует их уникальность.

## Чтение: локальное и иерархическое

### find() / get() / has() — поиск по иерархии

Ищет значение сначала в текущем контексте, затем в родительском, и так до корня:

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;
use function Async\await;

root_context()->set('app_name', 'MyApp');

$scope = new Async\Scope();

spawn(function() {
    // find() ищет вверх по иерархии
    $name = current_context()->find('app_name');
    echo $name; // "MyApp" — найдено в root_context
});
?>
```

### findLocal() / getLocal() / hasLocal() — только текущий контекст

Ищет значение **только** в текущем контексте, не поднимаясь по иерархии:

```php
<?php
use function Async\root_context;
use function Async\current_context;

root_context()->set('app_name', 'MyApp');

$local = current_context()->findLocal('app_name');
// null — в текущем Scope это значение не установлено

$inherited = current_context()->find('app_name');
// "MyApp" — найдено в parent scope
?>
```

## Запись и удаление

### set()

```php
<?php
$ctx = current_context();

// Установить значение (по умолчанию replace = false)
$ctx->set('key', 'value');

// Повторная установка без replace — ошибка
$ctx->set('key', 'new_value'); // Error: A context key already exists

// С явным replace = true
$ctx->set('key', 'new_value', replace: true); // OK
```

Метод `set()` возвращает `$this`, позволяя цепочки вызовов:

```php
<?php
current_context()
    ->set('user_id', 42)
    ->set('request_id', 'abc-123')
    ->set('locale', 'ru');
?>
```

### unset()

```php
<?php
$ctx = current_context();
$ctx->unset('key');
```

Метод `unset()` также возвращает `$this`.

## Практические примеры

### Передача ID запроса

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\current_context;

// Middleware устанавливает request_id
current_context()->set('request_id', bin2hex(random_bytes(8)));

// Любая корутина в этом скоупе может прочитать
spawn(function() {
    $requestId = current_context()->find('request_id');
    // Используем в логировании
    error_log("[$requestId] Обработка запроса...");
});
?>
```

### Контекст корутины как приватное хранилище

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\coroutine_context;

$c1 = spawn(function() {
    coroutine_context()->set('step', 1);
    // ... выполняем работу
    $step = coroutine_context()->getLocal('step');
});

$c2 = spawn(function() {
    // Не видит 'step' из c1
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

### Конфигурация через root_context

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Устанавливаем в начале запроса
root_context()
    ->set('db_host', 'localhost')
    ->set('cache_ttl', 3600);

// Доступно из любой корутины
spawn(function() {
    $dbHost = current_context()->find('db_host'); // "localhost"
});
?>
```

## См. также

- [Scope](/ru/docs/components/scope.html) — управление временем жизни корутин
- [Корутины](/ru/docs/components/coroutines.html) — базовая единица конкурентности
- [current_context()](/ru/docs/reference/current-context.html) — получение контекста текущего Scope
