---
layout: docs
lang: uk
path_key: "/docs/components/context.html"
nav_active: docs
permalink: /uk/docs/components/context.html
page_title: "Контекст"
description: "Контекст у TrueAsync -- зберігання даних в ієрархії областей видимості, локальні та успадковані значення, аналог Go context.Context."
---

# Context: Контексти виконання

## Навіщо це потрібно

Є `API` із сервісним класом, який повинен виконувати дії, прив'язані до токена авторизації.
Однак передавати токен у кожен метод сервісу -- погана ідея.
В `PHP` ця проблема вирішується через глобальні змінні або статичні властивості класів.
Але в асинхронному середовищі, де один процес може обробляти різні запити, цей підхід не працює,
тому що в момент виклику невідомо, який саме запит обробляється.

`Async\Context` дозволяє зберігати дані, пов'язані з корутиною або `Scope`, та будувати логіку застосунку
на основі контексту виконання.

## Що таке контекст

`Async\Context` -- це сховище ключ-значення, прив'язане до `Scope` або корутини.
Контексти утворюють ієрархію: при читанні значення пошук іде вгору по дереву областей видимості.

Це аналог `context.Context` у `Go` або `CoroutineContext` у `Kotlin`.
Механізм передачі даних через ієрархію без явної передачі параметрів.

## Три рівні контексту

`TrueAsync` надає три функції для доступу до контекстів:

```php
<?php
use function Async\current_context;
use function Async\coroutine_context;
use function Async\root_context;

// Контекст поточного Scope
$scopeCtx = current_context();

// Контекст поточної корутини
$coroCtx = coroutine_context();

// Глобальний кореневий контекст
$rootCtx = root_context();
?>
```

### current_context()

Повертає контекст поточного `Scope`. Якщо контекст ще не створено, створює його автоматично.
Значення, встановлені тут, видимі для всіх корутин у цьому Scope.

### coroutine_context()

Повертає контекст поточної корутини. Це **приватний** контекст, що належить лише цій корутині.
Інші корутини не можуть бачити дані, встановлені тут.

### root_context()

Повертає глобальний контекст, спільний для всього запиту. Значення тут видимі через `find()` з будь-якого контексту.

## Ключі

Ключем може бути **рядок** або **об'єкт**:

```php
<?php
use function Async\current_context;

$ctx = current_context();

// Рядковий ключ
$ctx->set('request_id', 'abc-123');

// Об'єкт як ключ (зручно для унікальних токенів)
$key = new stdClass();
$ctx->set($key, 'value');
?>
```

Об'єктні ключі зберігаються за посиланням у контексті, що гарантує їхню унікальність.

## Читання: локальне та ієрархічне

### find() / get() / has() -- Ієрархічний пошук

Шукає значення спочатку в поточному контексті, потім у батьківському, і так до кореня:

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;
use function Async\await;

root_context()->set('app_name', 'MyApp');

$scope = new Async\Scope();

spawn(function() {
    // find() шукає вгору по ієрархії
    $name = current_context()->find('app_name');
    echo $name; // "MyApp" -- знайдено в root_context
});
?>
```

### findLocal() / getLocal() / hasLocal() -- Тільки поточний контекст

Шукає значення **тільки** в поточному контексті, без підйому по ієрархії:

```php
<?php
use function Async\root_context;
use function Async\current_context;

root_context()->set('app_name', 'MyApp');

$local = current_context()->findLocal('app_name');
// null -- це значення не встановлено в поточному Scope

$inherited = current_context()->find('app_name');
// "MyApp" -- знайдено в батьківській області
?>
```

## Запис та видалення

### set()

```php
<?php
$ctx = current_context();

// Встановити значення (за замовчуванням replace = false)
$ctx->set('key', 'value');

// Повторний set без replace -- помилка
$ctx->set('key', 'new_value'); // Error: A context key already exists

// З явним replace = true
$ctx->set('key', 'new_value', replace: true); // OK
```

Метод `set()` повертає `$this`, що дозволяє ланцюжкове виклики:

```php
<?php
current_context()
    ->set('user_id', 42)
    ->set('request_id', 'abc-123')
    ->set('locale', 'en');
?>
```

### unset()

```php
<?php
$ctx = current_context();
$ctx->unset('key');
```

Метод `unset()` також повертає `$this`.

## Практичні приклади

### Передача ідентифікатора запиту

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\current_context;

// Middleware встановлює request_id
current_context()->set('request_id', bin2hex(random_bytes(8)));

// Будь-яка корутина в цій області може його прочитати
spawn(function() {
    $requestId = current_context()->find('request_id');
    // Використання в логуванні
    error_log("[$requestId] Processing request...");
});
?>
```

### Контекст корутини як приватне сховище

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\coroutine_context;

$c1 = spawn(function() {
    coroutine_context()->set('step', 1);
    // ... виконання роботи
    $step = coroutine_context()->getLocal('step');
});

$c2 = spawn(function() {
    // Не може бачити 'step' з c1
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

### Конфігурація через root_context

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Встановлюємо на початку запиту
root_context()
    ->set('db_host', 'localhost')
    ->set('cache_ttl', 3600);

// Доступно з будь-якої корутини
spawn(function() {
    $dbHost = current_context()->find('db_host'); // "localhost"
});
?>
```

## Дивіться також

- [Scope](/uk/docs/components/scope.html) -- керування життєвим циклом корутин
- [Корутини](/uk/docs/components/coroutines.html) -- базова одиниця конкурентності
- [current_context()](/uk/docs/reference/current-context.html) -- отримання контексту поточного Scope
