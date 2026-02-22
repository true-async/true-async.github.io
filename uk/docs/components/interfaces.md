---
layout: docs
lang: uk
path_key: "/docs/components/interfaces.html"
nav_active: docs
permalink: /uk/docs/components/interfaces.html
page_title: "Інтерфейси"
description: "Базові інтерфейси TrueAsync -- Awaitable, Completable, Timeout, ScopeProvider та SpawnStrategy."
---

# Базові інтерфейси

## Awaitable

```php
interface Async\Awaitable {}
```

Маркерний інтерфейс для всіх об'єктів, які можна очікувати. Не містить методів -- служить для перевірки типів.
Об'єкти Awaitable можуть змінювати стани кілька разів, тобто вони є `multiple-shot` об'єктами.

Реалізується: `Coroutine`, `Future`, `Channel`, `Timeout`.

## Completable

```php
interface Async\Completable extends Async\Awaitable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Розширює `Awaitable`. Об'єкти `Async\Completable` змінюють стан лише один раз (`one-shot`).

Реалізується: `Coroutine`, `Future`, `Timeout`.

### cancel()

Скасовує об'єкт. Необов'язковий параметр `$cancellation` дозволяє передати конкретну помилку скасування.

### isCompleted()

Повертає `true`, якщо об'єкт вже завершився (успішно або з помилкою).

### isCancelled()

Повертає `true`, якщо об'єкт було скасовано.

## Timeout

```php
final class Async\Timeout implements Async\Completable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Об'єкт таймауту. Створюється через функцію `timeout()`:

```php
<?php
use function Async\timeout;
use function Async\await;

// Створюємо таймаут на 5 секунд
$timer = timeout(5000);

// Використовуємо як обмежувач очікування
$result = await($coroutine, $timer);
```

`Timeout` не можна створити через `new` -- тільки через `timeout()`.

Коли таймаут спрацьовує, кидається `Async\TimeoutException`.

### Скасування таймауту

Якщо таймаут більше не потрібен, його можна скасувати:

```php
<?php
$timer = timeout(5000);

// ... операція завершилась швидше
$timer->cancel(); // Звільняємо таймер
```

## ScopeProvider

```php
interface Async\ScopeProvider
{
    public function provideScope(): ?Scope;
}
```

Інтерфейс, що дозволяє надавати `Scope` для створення корутин. Використовується з `spawn_with()`:

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
    echo "Working in the provided Scope\n";
});
?>
```

Якщо `provideScope()` повертає `null`, корутина створюється в поточному Scope.

## SpawnStrategy

```php
interface Async\SpawnStrategy extends Async\ScopeProvider
{
    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array;
    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void;
}
```

Розширює `ScopeProvider` хуками життєвого циклу -- дозволяє виконувати код до і після додавання корутини в чергу.

### beforeCoroutineEnqueue()

Викликається **до** того, як корутина буде додана в чергу планувальника. Повертає масив параметрів.

### afterCoroutineEnqueue()

Викликається **після** додавання корутини в чергу.

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
        echo "Coroutine #{$coroutine->getId()} will be created\n";
        return [];
    }

    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void
    {
        echo "Coroutine #{$coroutine->getId()} added to queue\n";
    }
}

$strategy = new LoggingStrategy();
spawn_with($strategy, function() {
    echo "Executing\n";
});
?>
```

## CircuitBreaker та CircuitBreakerStrategy

Ці інтерфейси описані в документації [Async\Pool](/uk/docs/components/pool.html).

## Дивіться також

- [Корутини](/uk/docs/components/coroutines.html) -- базова одиниця конкурентності
- [Scope](/uk/docs/components/scope.html) -- управління часом життя корутин
- [Future](/uk/docs/components/future.html) -- обіцянка результату
- [spawn_with()](/uk/docs/reference/spawn-with.html) -- запуск корутини з провайдером
