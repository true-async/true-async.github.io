---
layout: docs
lang: ru
path_key: "/docs/components/interfaces.html"
nav_active: docs
permalink: /ru/docs/components/interfaces.html
page_title: "Интерфейсы"
description: "Базовые интерфейсы TrueAsync — Awaitable, Completable, Timeout, ScopeProvider и SpawnStrategy."
---

# Базовые интерфейсы

## Awaitable

```php
interface Async\Awaitable {}
```

Маркерный интерфейс для всех объектов, которые можно ожидать. Не содержит методов — служит для типизации.
Awaitable-объекты могут менять состояния много раз, то есть являются `multiple-shot` объектами.

Реализуют: `Coroutine`, `Future`, `Channel`, `Timeout`.

## Completable

```php
interface Async\Completable extends Async\Awaitable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Расширяет `Awaitable`. `Async\Completable` объекты изменяют состояние лишь один раз (`one-shot`).

Реализуют: `Coroutine`, `Future`, `Timeout`.

### cancel()

Отменяет объект. Опциональный параметр `$cancellation` позволяет передать конкретную ошибку отмены.

### isCompleted()

Возвращает `true`, если объект уже завершён (успешно или с ошибкой).

### isCancelled()

Возвращает `true`, если объект был отменён.

## Timeout

```php
final class Async\Timeout implements Async\Completable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Объект таймаута. Создаётся через функцию `timeout()`:

```php
<?php
use function Async\timeout;
use function Async\await;

// Создаём таймаут на 5 секунд
$timer = timeout(5000);

// Используем как ограничитель ожидания
$result = await($coroutine, $timer);
```

`Timeout` нельзя создать через `new` — только через `timeout()`.

При срабатывании тайм-аута выбрасывается `Async\TimeoutException`.

### Отмена таймаута

Если тайм-аут больше не нужен, его можно отменить:

```php
<?php
$timer = timeout(5000);

// ... операция завершилась быстрее
$timer->cancel(); // Освобождаем таймер
```

## ScopeProvider

```php
interface Async\ScopeProvider
{
    public function provideScope(): ?Scope;
}
```

Интерфейс, позволяющий предоставить `Scope` для создания корутин. Используется с `spawn_with()`:

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class RequestScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }
}

$provider = new RequestScope();
$coroutine = spawn_with($provider, function() {
    echo "Работаю в предоставленном Scope\n";
});
?>
```

Если `provideScope()` возвращает `null`, корутина создаётся в текущем Scope.

## SpawnStrategy

```php
interface Async\SpawnStrategy extends Async\ScopeProvider
{
    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array;
    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void;
}
```

Расширяет `ScopeProvider` хуками жизненного цикла — позволяет выполнять код до и после постановки корутины в очередь.

### beforeCoroutineEnqueue()

Вызывается **перед** тем, как корутина будет добавлена в очередь планировщика. Возвращает массив параметров.

### afterCoroutineEnqueue()

Вызывается **после** добавления корутины в очередь.

```php
<?php
use Async\SpawnStrategy;
use Async\Coroutine;
use Async\Scope;
use function Async\spawn_with;

class LoggingStrategy implements SpawnStrategy
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array
    {
        echo "Корутина #{$coroutine->getId()} будет создана\n";
        return [];
    }

    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void
    {
        echo "Корутина #{$coroutine->getId()} добавлена в очередь\n";
    }
}

$strategy = new LoggingStrategy();
spawn_with($strategy, function() {
    echo "Выполняюсь\n";
});
?>
```

## CircuitBreaker и CircuitBreakerStrategy

Эти интерфейсы описаны в документации [Async\Pool](/ru/docs/components/pool.html).

## См. также

- [Корутины](/ru/docs/components/coroutines.html) — базовая единица конкурентности
- [Scope](/ru/docs/components/scope.html) — управление временем жизни корутин
- [Future](/ru/docs/components/future.html) — обещание результата
- [spawn_with()](/ru/docs/reference/spawn-with.html) — запуск корутины с провайдером
