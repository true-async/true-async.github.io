---
layout: docs
lang: ru
path_key: "/docs/concepts/exceptions.html"
nav_active: docs
permalink: /ru/docs/concepts/exceptions.html
page_title: "Исключения"
description: "Иерархия исключений TrueAsync — CancellationError, TimeoutException, DeadlockError и другие."
---

# Исключения

## Иерархия

TrueAsync определяет специализированную иерархию исключений для разных типов ошибок:

```
\Error
├── Async\CancellationError     — отмена корутины
└── Async\DeadlockError         — обнаружена взаимная блокировка

\Exception
├── Async\AsyncException        — общая ошибка async-операций
│   └── Async\ServiceUnavailableException — сервис недоступен (circuit breaker)
├── Async\InputOutputException  — ошибка ввода-вывода
├── Async\DnsException          — ошибка разрешения DNS
├── Async\TimeoutException      — таймаут операции
├── Async\PollException         — ошибка poll-операции
├── Async\ChannelException      — ошибка канала
├── Async\PoolException         — ошибка пула ресурсов
└── Async\CompositeException    — контейнер множества исключений
```

## CancellationError

```php
class Async\CancellationError extends \Error {}
```

Выбрасывается при отмене корутины. Наследует `\Error`, а не `\Exception`, чтобы обычные `catch (\Exception $e)` блоки **не** перехватывали отмену случайно.

```php
<?php
use Async\CancellationError;
use function Async\spawn;
use function Async\await;
use function Async\delay;

$coroutine = spawn(function() {
    try {
        delay(10000);
    } catch (CancellationError $e) {
        // Корректно завершаем работу
        echo "Отменено: " . $e->getMessage() . "\n";
    }
});

delay(100);
$coroutine->cancel();
?>
```

**Важно:** Не ловите `CancellationError` через `catch (\Throwable $e)` без повторного выброса — это нарушает механизм кооперативной отмены.

## DeadlockError

```php
class Async\DeadlockError extends \Error {}
```

Выбрасывается, когда планировщик обнаруживает взаимную блокировку — ситуацию, когда корутины ожидают друг друга и ни одна не может продолжить выполнение.

```php
<?php
use function Async\spawn;
use function Async\await;

// Классический deadlock: две корутины ждут друг друга
$c1 = spawn(function() use (&$c2) {
    await($c2); // ждёт c2
});

$c2 = spawn(function() use (&$c1) {
    await($c1); // ждёт c1
});
// DeadlockError: A deadlock was detected
?>
```

Планировщик определяет даже простые случаи — когда корутина ожидает саму себя:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() use (&$coroutine) {
    await($coroutine); // ждёт саму себя
});
// DeadlockError
?>
```

## AsyncException

```php
class Async\AsyncException extends \Exception {}
```

Базовое исключение для общих ошибок async-операций. Используется для ошибок, которые не попадают в специализированные категории.

## TimeoutException

```php
class Async\TimeoutException extends \Exception {}
```

Выбрасывается при превышении таймаута. Создаётся автоматически при срабатывании `timeout()`:

```php
<?php
use Async\TimeoutException;
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use function Async\delay;

try {
    $coroutine = spawn(function() {
        delay(10000); // Долгая операция
    });
    await($coroutine, timeout(1000)); // Таймаут 1 секунда
} catch (TimeoutException $e) {
    echo "Операция не завершилась вовремя\n";
}
?>
```

## InputOutputException

```php
class Async\InputOutputException extends \Exception {}
```

Общее исключение для ошибок ввода-вывода: сокеты, файлы, пайпы и другие I/O-дескрипторы.

## DnsException

```php
class Async\DnsException extends \Exception {}
```

Выбрасывается при ошибках DNS-разрешения (`gethostbyname`, `gethostbyaddr`, `gethostbynamel`).

## PollException

```php
class Async\PollException extends \Exception {}
```

Выбрасывается при ошибке poll-операции на дескрипторах.

## ServiceUnavailableException

```php
class Async\ServiceUnavailableException extends Async\AsyncException {}
```

Выбрасывается, когда circuit breaker находится в состоянии `INACTIVE`, и запрос к сервису отклоняется без попытки выполнения.

```php
<?php
use Async\ServiceUnavailableException;

try {
    $resource = $pool->acquire();
} catch (ServiceUnavailableException $e) {
    echo "Сервис временно недоступен\n";
}
?>
```

## ChannelException

```php
class Async\ChannelException extends Async\AsyncException {}
```

Выбрасывается при ошибках работы с каналами: отправка в закрытый канал, получение из закрытого канала и т.д.

## PoolException

```php
class Async\PoolException extends Async\AsyncException {}
```

Выбрасывается при ошибках работы с пулом ресурсов.

## CompositeException

```php
final class Async\CompositeException extends \Exception
{
    public function addException(\Throwable $exception): void;
    public function getExceptions(): array;
}
```

Контейнер для множества исключений. Используется, когда несколько обработчиков (например, `onFinally` в Scope) выбрасывают исключения при завершении:

```php
<?php
use Async\Scope;
use Async\CompositeException;

$scope = new Scope();

$scope->onFinally(function() {
    throw new \Exception('Ошибка очистки 1');
});

$scope->onFinally(function() {
    throw new \RuntimeException('Ошибка очистки 2');
});

$scope->setExceptionHandler(function($scope, $coroutine, $exception) {
    if ($exception instanceof CompositeException) {
        echo "Ошибок: " . count($exception->getExceptions()) . "\n";
        foreach ($exception->getExceptions() as $e) {
            echo "  - " . $e->getMessage() . "\n";
        }
    }
});

$scope->dispose();
// Ошибок: 2
//   - Ошибка очистки 1
//   - Ошибка очистки 2
?>
```

## Рекомендации

### Правильная обработка CancellationError

```php
<?php
// Правильно: ловим конкретные исключения
try {
    await($coroutine);
} catch (\Exception $e) {
    // CancellationError НЕ будет пойман здесь — это \Error
    handleError($e);
}
```

```php
<?php
// Если нужно поймать всё — обязательно пробрасывайте CancellationError
try {
    await($coroutine);
} catch (Async\CancellationError $e) {
    throw $e; // Пробрасываем дальше
} catch (\Throwable $e) {
    handleError($e);
}
```

### Защита критических секций

Используйте `protect()` для операций, которые нельзя прерывать отменой:

```php
<?php
use function Async\protect;

$db->beginTransaction();

protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
});
```

## См. также

- [Отмена](/ru/docs/concepts/cancellation.html) — механизм отмены корутин
- [protect()](/ru/docs/reference/protect.html) — защита от отмены
- [Scope](/ru/docs/concepts/scope.html) — обработка исключений в скоупах
