---
layout: docs
lang: uk
path_key: "/docs/reference/spawn-with.html"
nav_active: docs
permalink: /uk/docs/reference/spawn-with.html
page_title: "spawn_with()"
description: "spawn_with() — запуск корутини у вказаному Scope або через ScopeProvider."
---

# spawn_with

(PHP 8.6+, True Async 1.0)

`spawn_with()` — Запускає функцію в новій корутині, прив'язаній до вказаного `Scope` або `ScopeProvider`.

## Опис

```php
spawn_with(Async\ScopeProvider $provider, callable $task, mixed ...$args): Async\Coroutine
```

Створює та запускає нову корутину в Scope, наданому `$provider`. Це дозволяє явно контролювати, в якому Scope виконуватиметься корутина.

## Параметри

**`provider`**
Об'єкт, що реалізує інтерфейс `Async\ScopeProvider`. Зазвичай це:
- `Async\Scope` — напряму, оскільки `Scope` реалізує `ScopeProvider`
- Користувацький клас, що реалізує `ScopeProvider`
- Об'єкт, що реалізує `SpawnStrategy` для управління життєвим циклом

**`task`**
Функція або замикання для виконання в корутині.

**`args`**
Необов'язкові параметри, що передаються в `task`.

## Значення, що повертаються

Повертає об'єкт `Async\Coroutine`, що представляє запущену корутину.

## Помилки/Винятки

- `Async\AsyncException` — якщо Scope закрито або скасовано
- `TypeError` — якщо `$provider` не реалізує `ScopeProvider`

## Приклади

### Приклад #1 Запуск у конкретному Scope

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$c1 = spawn_with($scope, function() {
    return file_get_contents('https://php.net');
});

$c2 = spawn_with($scope, function() {
    return file_get_contents('https://github.com');
});

// Чекати завершення всіх корутин у scope
$scope->awaitCompletion();
?>
```

### Приклад #2 Успадкований Scope

```php
<?php
use Async\Scope;
use function Async\spawn_with;

$parentScope = new Scope();
$childScope = Scope::inherit($parentScope);

spawn_with($childScope, function() {
    echo "Working in child Scope\n";
});

// Скасування батьківського scope також скасовує дочірній
$parentScope->cancel();
?>
```

### Приклад #3 Використання з ScopeProvider

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class WorkerScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
        $this->scope->setExceptionHandler(function(\Throwable $e) {
            error_log("Worker error: " . $e->getMessage());
        });
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function shutdown(): void
    {
        $this->scope->disposeSafely();
    }
}

$worker = new WorkerScope();

spawn_with($worker, function() {
    // Робота в керованому scope
});

$worker->shutdown();
?>
```

### Приклад #4 Передача аргументів

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$coroutine = spawn_with($scope, function(string $url, int $timeout) {
    // Використовуємо передані аргументи
    return file_get_contents($url);
}, 'https://php.net', 5000);

$result = await($coroutine);
?>
```

## Примітки

> **Примітка:** Якщо `ScopeProvider::provideScope()` повертає `null`, корутина створюється в поточному Scope.

> **Примітка:** Не можна створити корутину в закритому або скасованому Scope — буде викинуто виняток.

## Дивіться також

- [spawn()](/uk/docs/reference/spawn.html) — запуск корутини в поточному Scope
- [Scope](/uk/docs/components/scope.html) — управління часом життя корутин
- [Interfaces](/uk/docs/components/interfaces.html) — ScopeProvider та SpawnStrategy
