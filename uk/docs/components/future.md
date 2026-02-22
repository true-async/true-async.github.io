---
layout: docs
lang: uk
path_key: "/docs/components/future.html"
nav_active: docs
permalink: /uk/docs/components/future.html
page_title: "Future"
description: "Future у TrueAsync -- обіцянка результату, ланцюги перетворень map/catch/finally, FutureState та діагностика."
---

# Future: Обіцянка результату

## Що таке Future

`Async\Future` -- це об'єкт, що представляє результат операції, який може бути ще не готовий.
Future дозволяє:

- Очікувати результат через `await()` або `$future->await()`
- Будувати ланцюги перетворень через `map()`, `catch()`, `finally()`
- Скасовувати операцію через `cancel()`
- Створювати вже завершені Future через статичні фабрики

Future схожий на `Promise` у JavaScript, але інтегрований з корутинами TrueAsync.

## Future і FutureState

Future розділений на два класи з чітким розмежуванням відповідальності:

- **`FutureState`** -- змінюваний контейнер, через який записується результат
- **`Future`** -- обгортка тільки для читання, через яку результат зчитується та перетворюється

```php
<?php
use Async\Future;
use Async\FutureState;

// Створюємо FutureState -- він володіє станом
$state = new FutureState();

// Створюємо Future -- він надає доступ до результату
$future = new Future($state);

// Передаємо $future споживачу
// Передаємо $state виробнику

// Виробник завершує операцію
$state->complete(42);

// Споживач отримує результат
$result = $future->await(); // 42
?>
```

Таке розділення гарантує, що споживач не зможе випадково завершити Future -- тільки власник `FutureState` має на це право.

## Створення Future

### Через FutureState

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

$state = new FutureState();
$future = new Future($state);

// Завершуємо в іншій корутині
spawn(function() use ($state) {
    $data = file_get_contents('https://api.example.com/data');
    $state->complete(json_decode($data, true));
});

$result = $future->await();
?>
```

### Статичні фабрики

Для створення вже завершених Future:

```php
<?php
use Async\Future;

// Успішно завершений Future
$future = Future::completed(42);
$result = $future->await(); // 42

// Future з помилкою
$future = Future::failed(new \RuntimeException('Something went wrong'));
$result = $future->await(); // кидає RuntimeException
?>
```

## Ланцюги перетворень

Future підтримує три методи перетворення, що працюють аналогічно Promise у JavaScript:

### map() -- Перетворення результату

Викликається тільки при успішному завершенні. Повертає новий Future з перетвореним результатом:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$doubled = $future->map(fn($value) => $value * 2);
$asString = $doubled->map(fn($value) => "Result: $value");

$state->complete(21);

echo $asString->await(); // "Result: 42"
?>
```

### catch() -- Обробка помилок

Викликається тільки при помилці. Дозволяє відновитися після виключення:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$safe = $future->catch(function(\Throwable $e) {
    return 'Default value';
});

$state->error(new \RuntimeException('Error'));

echo $safe->await(); // "Default value"
?>
```

### finally() -- Виконання за будь-якого результату

Викликається завжди -- і при успіху, і при помилці. Результат батьківського Future передається дочірньому без змін:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$withCleanup = $future->finally(function($resultOrException) {
    // Звільнення ресурсів
    echo "Operation completed\n";
});

$state->complete('data');

echo $withCleanup->await(); // "data" (результат передається без змін)
?>
```

### Складені ланцюги

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(fn($data) => json_decode($data, true))
    ->map(fn($parsed) => $parsed['name'] ?? 'Unknown')
    ->catch(fn(\Throwable $e) => 'Error: ' . $e->getMessage())
    ->finally(function($value) {
        // Логування
    });

$state->complete('{"name": "PHP"}');
echo $result->await(); // "PHP"
?>
```

### Незалежні підписники

Кожен виклик `map()` на одному й тому ж Future створює **незалежний** ланцюг. Підписники не впливають один на одного:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

// Два незалежних ланцюги від одного Future
$doubled = $future->map(fn($x) => $x * 2);
$tripled = $future->map(fn($x) => $x * 3);

$state->complete(10);

echo await($doubled) . "\n"; // 20
echo await($tripled) . "\n"; // 30
?>
```

### Поширення помилок у ланцюгах

Якщо джерельний Future завершується з помилкою, `map()` **пропускається**, і помилка передається безпосередньо в `catch()`:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($value) {
        echo "This code won't execute\n";
        return $value;
    })
    ->catch(function(\Throwable $e) {
        return 'Recovered: ' . $e->getMessage();
    });

$state->error(new \RuntimeException('Source error'));

echo await($result) . "\n"; // "Recovered: Source error"
?>
```

Якщо виключення виникає **всередині** `map()`, воно перехоплюється наступним `catch()`:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($x) {
        throw new \RuntimeException('Error in map');
    })
    ->catch(function(\Throwable $e) {
        return 'Caught: ' . $e->getMessage();
    });

$state->complete(42);

echo await($result) . "\n"; // "Caught: Error in map"
?>
```

## Очікування результату

### Через функцію await()

```php
<?php
use function Async\await;

$result = await($future);
```

### Через метод $future->await()

```php
<?php
$result = $future->await();

// З таймаутом скасування
$result = $future->await(Async\timeout(5000));
```

## Скасування Future

```php
<?php
use Async\AsyncCancellation;

// Скасувати з повідомленням за замовчуванням
$future->cancel();

// Скасувати з користувацькою помилкою
$future->cancel(new AsyncCancellation('Operation is no longer needed'));
```

## Придушення попереджень: ignore()

Якщо Future не використовується (не було виклику `await()`, `map()`, `catch()` чи `finally()`), TrueAsync видасть попередження.
Щоб явно придушити це попередження:

```php
<?php
$future->ignore();
```

Також якщо Future завершився з помилкою і ця помилка не була оброблена, TrueAsync попередить про це. `ignore()` придушує і це попередження.

## FutureState: Завершення операції

### complete() -- Успішне завершення

```php
<?php
$state->complete($result);
```

### error() -- Завершення з помилкою

```php
<?php
$state->error(new \RuntimeException('Error'));
```

### Обмеження

- `complete()` і `error()` можна викликати тільки **один раз**. Повторний виклик кине `AsyncException`.
- Після виклику `complete()` або `error()` стан Future є незмінним.

```php
<?php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

## Діагностика

Обидва класи (`Future` і `FutureState`) надають діагностичні методи:

```php
<?php
// Перевірка стану
$future->isCompleted(); // bool
$future->isCancelled(); // bool

// Де було створено Future
$future->getCreatedFileAndLine();  // [string $file, int $line]
$future->getCreatedLocation();     // "file.php:42"

// Де було завершено Future
$future->getCompletedFileAndLine(); // [string|null $file, int $line]
$future->getCompletedLocation();    // "file.php:55" або "unknown"

// Інформація про очікування
$future->getAwaitingInfo(); // array
```

## Практичний приклад: HTTP-клієнт

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function httpGet(string $url): Future {
    $state = new FutureState();
    $future = new Future($state);

    spawn(function() use ($state, $url) {
        try {
            $response = file_get_contents($url);
            $state->complete($response);
        } catch (\Throwable $e) {
            $state->error($e);
        }
    });

    return $future;
}

// Використання
$userFuture = httpGet('https://api.example.com/user/1')
    ->map(fn($json) => json_decode($json, true))
    ->catch(fn($e) => ['error' => $e->getMessage()]);

$result = $userFuture->await();
?>
```

## Дивіться також

- [await()](/uk/docs/reference/await.html) -- очікування завершення
- [Корутини](/uk/docs/components/coroutines.html) -- базова одиниця конкурентності
- [Скасування](/uk/docs/components/cancellation.html) -- механізм скасування
