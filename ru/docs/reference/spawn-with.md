---
layout: docs
lang: ru
path_key: "/docs/reference/spawn-with.html"
nav_active: docs
permalink: /ru/docs/reference/spawn-with.html
page_title: "spawn_with()"
description: "spawn_with() — запуск корутины в указанном Scope или через ScopeProvider."
---

# spawn_with

(PHP 8.6+, True Async 1.0)

`spawn_with()` — Запускает функцию в новой корутине, привязанной к указанному `Scope` или `ScopeProvider`.

## Описание

```php
spawn_with(Async\ScopeProvider $provider, callable $task, mixed ...$args): Async\Coroutine
```

Создаёт и запускает новую корутину в Scope, предоставленном через `$provider`. Это позволяет явно контролировать, в каком Scope будет выполняться корутина.

## Параметры

**`provider`**
Объект, реализующий интерфейс `Async\ScopeProvider`. Обычно это:
- `Async\Scope` — напрямую, так как `Scope` реализует `ScopeProvider`
- Пользовательский класс, реализующий `ScopeProvider`
- Объект, реализующий `SpawnStrategy` для управления жизненным циклом

**`task`**
Функция или замыкание для выполнения в корутине.

**`args`**
Необязательные параметры, передаваемые в `task`.

## Возвращаемое значение

Возвращает объект `Async\Coroutine`, представляющий запущенную корутину.

## Ошибки/Исключения

- `Async\AsyncException` — если Scope закрыт или отменён
- `TypeError` — если `$provider` не реализует `ScopeProvider`

## Примеры

### Пример #1 Запуск в конкретном Scope

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

// Ожидаем завершения всех корутин в scope
$scope->awaitCompletion();
?>
```

### Пример #2 Наследуемый Scope

```php
<?php
use Async\Scope;
use function Async\spawn_with;

$parentScope = new Scope();
$childScope = Scope::inherit($parentScope);

spawn_with($childScope, function() {
    echo "Работаю в дочернем Scope\n";
});

// Отмена parent отменяет и child
$parentScope->cancel();
?>
```

### Пример #3 Использование с ScopeProvider

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
    // Работаем в managed scope
});

$worker->shutdown();
?>
```

### Пример #4 Передача аргументов

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$coroutine = spawn_with($scope, function(string $url, int $timeout) {
    // Используем переданные аргументы
    return file_get_contents($url);
}, 'https://php.net', 5000);

$result = await($coroutine);
?>
```

## Примечания

> **Примечание:** Если `ScopeProvider::provideScope()` возвращает `null`, корутина создаётся в текущем Scope.

> **Примечание:** Нельзя создать корутину в закрытом или отменённом Scope — будет выброшено исключение.

## См. также

- [spawn()](/ru/docs/reference/spawn.html) — запуск корутины в текущем Scope
- [Scope](/ru/docs/concepts/scope.html) — управление временем жизни корутин
- [Интерфейсы](/ru/docs/concepts/interfaces.html) — ScopeProvider и SpawnStrategy
