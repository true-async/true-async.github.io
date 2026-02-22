---
layout: docs
lang: uk
path_key: "/docs/components/exceptions.html"
nav_active: docs
permalink: /uk/docs/components/exceptions.html
page_title: "Винятки"
description: "Ієрархія винятків TrueAsync -- AsyncCancellation, TimeoutException, DeadlockError та інші."
---

# Винятки

## Ієрархія

TrueAsync визначає спеціалізовану ієрархію винятків для різних типів помилок:

```
\Cancellation                              -- базовий клас скасування (нарівні з \Error та \Exception)
+-- Async\AsyncCancellation                -- скасування корутини

\Error
+-- Async\DeadlockError                    -- виявлено взаємне блокування

\Exception
+-- Async\AsyncException                   -- загальна помилка асинхронної операції
|   +-- Async\ServiceUnavailableException  -- сервіс недоступний (circuit breaker)
+-- Async\InputOutputException             -- помилка вводу/виводу
+-- Async\DnsException                     -- помилка розв'язання DNS
+-- Async\TimeoutException                 -- тайм-аут операції
+-- Async\PollException                    -- помилка операції poll
+-- Async\ChannelException                 -- помилка каналу
+-- Async\PoolException                    -- помилка пулу ресурсів
+-- Async\CompositeException               -- контейнер для кількох винятків
```

## AsyncCancellation

```php
class Async\AsyncCancellation extends \Cancellation {}
```

Кидається при скасуванні корутини. `\Cancellation` -- це третій кореневий клас `Throwable` нарівні з `\Error` та `\Exception`, тому звичайні блоки `catch (\Exception $e)` та `catch (\Error $e)` **не** перехоплюють скасування випадково.

```php
<?php
use Async\AsyncCancellation;
use function Async\spawn;
use function Async\await;
use function Async\delay;

$coroutine = spawn(function() {
    try {
        delay(10000);
    } catch (AsyncCancellation $e) {
        // Коректно завершуємо роботу
        echo "Cancelled: " . $e->getMessage() . "\n";
    }
});

delay(100);
$coroutine->cancel();
?>
```

**Важливо:** Не перехоплюйте `AsyncCancellation` через `catch (\Throwable $e)` без повторного кидання -- це порушує механізм кооперативного скасування.

## DeadlockError

```php
class Async\DeadlockError extends \Error {}
```

Кидається, коли планувальник виявляє взаємне блокування -- ситуацію, коли корутини чекають одна на одну і жодна не може продовжити виконання.

```php
<?php
use function Async\spawn;
use function Async\await;

// Класичне взаємне блокування: дві корутини чекають одна на одну
$c1 = spawn(function() use (&$c2) {
    await($c2); // чекає на c2
});

$c2 = spawn(function() use (&$c1) {
    await($c1); // чекає на c1
});
// DeadlockError: A deadlock was detected
?>
```

Приклад, коли корутина очікує саму себе:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() use (&$coroutine) {
    await($coroutine); // очікує саму себе
});
// DeadlockError
?>
```

## AsyncException

```php
class Async\AsyncException extends \Exception {}
```

Базовий виняток для загальних помилок асинхронних операцій. Використовується для помилок, які не належать до спеціалізованих категорій.

## TimeoutException

```php
class Async\TimeoutException extends \Exception {}
```

Кидається при перевищенні тайм-ауту. Створюється автоматично, коли спрацьовує `timeout()`:

```php
<?php
use Async\TimeoutException;
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use function Async\delay;

try {
    $coroutine = spawn(function() {
        delay(10000); // Тривала операція
    });
    await($coroutine, timeout(1000)); // Тайм-аут 1 секунда
} catch (TimeoutException $e) {
    echo "Operation didn't complete in time\n";
}
?>
```

## InputOutputException

```php
class Async\InputOutputException extends \Exception {}
```

Загальний виняток для помилок вводу/виводу: сокети, файли, канали та інші дескриптори вводу/виводу.

## DnsException

```php
class Async\DnsException extends \Exception {}
```

Кидається при помилках розв'язання DNS (`gethostbyname`, `gethostbyaddr`, `gethostbynamel`).

## PollException

```php
class Async\PollException extends \Exception {}
```

Кидається при помилках операцій poll на дескрипторах.

## ServiceUnavailableException

```php
class Async\ServiceUnavailableException extends Async\AsyncException {}
```

Кидається, коли circuit breaker перебуває в стані `INACTIVE` і запит до сервісу відхиляється без спроби виконання.

```php
<?php
use Async\ServiceUnavailableException;

try {
    $resource = $pool->acquire();
} catch (ServiceUnavailableException $e) {
    echo "Service is temporarily unavailable\n";
}
?>
```

## ChannelException

```php
class Async\ChannelException extends Async\AsyncException {}
```

Кидається при помилках операцій з каналами: відправка в закритий канал, отримання із закритого каналу тощо.

## PoolException

```php
class Async\PoolException extends Async\AsyncException {}
```

Кидається при помилках операцій з пулом ресурсів.

## CompositeException

```php
final class Async\CompositeException extends \Exception
{
    public function addException(\Throwable $exception): void;
    public function getExceptions(): array;
}
```

Контейнер для кількох винятків. Використовується, коли кілька обробників (наприклад, `finally` в Scope) кидають винятки під час завершення:

```php
<?php
use Async\Scope;
use Async\CompositeException;

$scope = new Scope();

$scope->finally(function() {
    throw new \Exception('Cleanup error 1');
});

$scope->finally(function() {
    throw new \RuntimeException('Cleanup error 2');
});

$scope->setExceptionHandler(function($scope, $coroutine, $exception) {
    if ($exception instanceof CompositeException) {
        echo "Errors: " . count($exception->getExceptions()) . "\n";
        foreach ($exception->getExceptions() as $e) {
            echo "  - " . $e->getMessage() . "\n";
        }
    }
});

$scope->dispose();
// Errors: 2
//   - Cleanup error 1
//   - Cleanup error 2
?>
```

## Рекомендації

### Правильна обробка AsyncCancellation

```php
<?php
// Правильно: перехоплюємо конкретні винятки
try {
    await($coroutine);
} catch (\Exception $e) {
    // AsyncCancellation НЕ буде перехоплено тут -- це \Cancellation
    handleError($e);
}
```

```php
<?php
// Якщо потрібно перехопити все -- завжди повторно кидайте AsyncCancellation
try {
    await($coroutine);
} catch (Async\AsyncCancellation $e) {
    throw $e; // Повторно кидаємо
} catch (\Throwable $e) {
    handleError($e);
}
```

### Захист критичних секцій

Використовуйте `protect()` для операцій, які не повинні перериватися скасуванням:

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

## Дивіться також

- [Скасування](/uk/docs/components/cancellation.html) -- механізм скасування корутин
- [protect()](/uk/docs/reference/protect.html) -- захист від скасування
- [Scope](/uk/docs/components/scope.html) -- обробка винятків в областях видимості
