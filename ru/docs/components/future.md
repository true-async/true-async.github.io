---
layout: docs
lang: ru
path_key: "/docs/components/future.html"
nav_active: docs
permalink: /ru/docs/components/future.html
page_title: "Future"
description: "Future в TrueAsync — обещание результата, цепочки трансформаций map/catch/finally, FutureState и диагностика."
---

# Future: обещание результата

## Что такое Future

`Async\Future` — это объект, представляющий результат операции, который может быть ещё не готов.
Future позволяет:

- Ожидать результат через `await()` или `$future->await()`
- Строить цепочки трансформаций через `map()`, `catch()`, `finally()`
- Отменять операцию через `cancel()`
- Создавать уже завершённые Future через статические фабрики

Future похож на `Promise` в JavaScript, но интегрирован с корутинами TrueAsync.

## Future и FutureState

Future разделён на два класса с чётким разделением ответственности:

- **`FutureState`** — мутабельный контейнер, через который результат записывается
- **`Future`** — readonly-обёртка, через которую результат читается и трансформируется

```php
<?php
use Async\Future;
use Async\FutureState;

// Создаём FutureState — он владеет состоянием
$state = new FutureState();

// Создаём Future — он даёт доступ к результату
$future = new Future($state);

// Передаём $future потребителю
// Передаём $state продюсеру

// Продюсер завершает операцию
$state->complete(42);

// Потребитель получает результат
$result = $future->await(); // 42
?>
```

Такое разделение гарантирует, что потребитель не может случайно завершить Future — только держатель `FutureState` имеет на это право.

## Создание Future

### Через FutureState

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

$state = new FutureState();
$future = new Future($state);

// Завершаем в другой корутине
spawn(function() use ($state) {
    $data = file_get_contents('https://api.example.com/data');
    $state->complete(json_decode($data, true));
});

$result = $future->await();
?>
```

### Статические фабрики

Для создания уже завершённых Future:

```php
<?php
use Async\Future;

// Успешно завершённый Future
$future = Future::completed(42);
$result = $future->await(); // 42

// Future с ошибкой
$future = Future::failed(new \RuntimeException('Что-то пошло не так'));
$result = $future->await(); // выбросит RuntimeException
?>
```

## Цепочки трансформаций

Future поддерживает три метода трансформации, работающих аналогично Promise в JavaScript:

### map() — трансформация результата

Вызывается только при успешном завершении. Возвращает новый Future с трансформированным результатом:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$doubled = $future->map(fn($value) => $value * 2);
$asString = $doubled->map(fn($value) => "Результат: $value");

$state->complete(21);

echo $asString->await(); // "Результат: 42"
?>
```

### catch() — обработка ошибок

Вызывается только при ошибке. Позволяет восстановиться после исключения:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$safe = $future->catch(function(\Throwable $e) {
    return 'Значение по умолчанию';
});

$state->error(new \RuntimeException('Ошибка'));

echo $safe->await(); // "Значение по умолчанию"
?>
```

### finally() — выполнение при любом исходе

Вызывается всегда — и при успехе, и при ошибке. Результат родительского Future передаётся дочернему без изменений:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$withCleanup = $future->finally(function($resultOrException) {
    // Освобождаем ресурсы
    echo "Операция завершена\n";
});

$state->complete('данные');

echo $withCleanup->await(); // "данные" (результат передаётся без изменений)
?>
```

### Составные цепочки

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(fn($data) => json_decode($data, true))
    ->map(fn($parsed) => $parsed['name'] ?? 'Неизвестно')
    ->catch(fn(\Throwable $e) => 'Ошибка: ' . $e->getMessage())
    ->finally(function($value) {
        // Логирование
    });

$state->complete('{"name": "PHP"}');
echo $result->await(); // "PHP"
?>
```

### Независимые подписчики

Каждый вызов `map()` на одном и том же Future создаёт **независимую** цепочку. Подписчики не влияют друг на друга:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

// Две независимые цепочки от одного Future
$doubled = $future->map(fn($x) => $x * 2);
$tripled = $future->map(fn($x) => $x * 3);

$state->complete(10);

echo await($doubled) . "\n"; // 20
echo await($tripled) . "\n"; // 30
?>
```

### Распространение ошибок в цепочке

Если исходный Future завершается с ошибкой, `map()` **пропускается**, а ошибка передаётся напрямую в `catch()`:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($value) {
        echo "Этот код не выполнится\n";
        return $value;
    })
    ->catch(function(\Throwable $e) {
        return 'Восстановлено: ' . $e->getMessage();
    });

$state->error(new \RuntimeException('Ошибка источника'));

echo await($result) . "\n"; // "Восстановлено: Ошибка источника"
?>
```

Если исключение возникает **внутри** `map()`, оно перехватывается последующим `catch()`:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($x) {
        throw new \RuntimeException('Ошибка в map');
    })
    ->catch(function(\Throwable $e) {
        return 'Перехвачено: ' . $e->getMessage();
    });

$state->complete(42);

echo await($result) . "\n"; // "Перехвачено: Ошибка в map"
?>
```

## Ожидание результата

### Через функцию await()

```php
<?php
use function Async\await;

$result = await($future);
```

### Через метод $future->await()

```php
<?php
$result = $future->await();

// С таймаутом отмены
$result = $future->await(Async\timeout(5000));
```

## Отмена Future

```php
<?php
use Async\AsyncCancellation;

// Отмена с сообщением по умолчанию
$future->cancel();

// Отмена с кастомной ошибкой
$future->cancel(new AsyncCancellation('Операция больше не нужна'));
```

## Подавление предупреждений: ignore()

Если Future не используется (не вызван `await()`, `map()`, `catch()` или `finally()`), TrueAsync выдаст предупреждение.
Чтобы явно подавить это предупреждение:

```php
<?php
$future->ignore();
```

Также, если Future завершился с ошибкой и эта ошибка не была обработана, TrueAsync предупредит об этом. `ignore()` подавляет и это предупреждение.

## FutureState: завершение операции

### complete() — успешное завершение

```php
<?php
$state->complete($result);
```

### error() — завершение с ошибкой

```php
<?php
$state->error(new \RuntimeException('Ошибка'));
```

### Ограничения

- `complete()` и `error()` можно вызвать **только один раз**. Повторный вызов выбросит `AsyncException`.
- После вызова `complete()` или `error()` состояние Future неизменно.

```php
<?php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

## Диагностика

Оба класса (`Future` и `FutureState`) предоставляют методы диагностики:

```php
<?php
// Проверка состояния
$future->isCompleted(); // bool
$future->isCancelled(); // bool

// Где был создан Future
$future->getCreatedFileAndLine();  // [string $file, int $line]
$future->getCreatedLocation();     // "file.php:42"

// Где был завершён Future
$future->getCompletedFileAndLine(); // [string|null $file, int $line]
$future->getCompletedLocation();    // "file.php:55" или "unknown"

// Информация об ожидании
$future->getAwaitingInfo(); // array
```

## Практический пример: HTTP-клиент

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

// Использование
$userFuture = httpGet('https://api.example.com/user/1')
    ->map(fn($json) => json_decode($json, true))
    ->catch(fn($e) => ['error' => $e->getMessage()]);

$result = $userFuture->await();
?>
```

## См. также

- [await()](/ru/docs/reference/await.html) — ожидание завершения
- [Корутины](/ru/docs/components/coroutines.html) — базовая единица конкурентности
- [Отмена](/ru/docs/components/cancellation.html) — механизм отмены операций
