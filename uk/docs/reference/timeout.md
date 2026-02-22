---
layout: docs
lang: uk
path_key: "/docs/reference/timeout.html"
nav_active: docs
permalink: /uk/docs/reference/timeout.html
page_title: "timeout()"
description: "timeout() — створення об'єкта тайм-ауту для обмеження часу очікування."
---

# timeout

(PHP 8.6+, True Async 1.0)

`timeout()` — Створює об'єкт `Async\Timeout`, який спрацьовує через вказану кількість мілісекунд.

## Опис

```php
timeout(int $ms): Async\Awaitable
```

Створює таймер, який викидає `Async\TimeoutException` через `$ms` мілісекунд.
Використовується як обмежувач часу очікування в `await()` та інших функціях.

## Параметри

**`ms`**
Час у мілісекундах. Має бути більше 0.

## Значення, що повертаються

Повертає об'єкт `Async\Timeout`, що реалізує `Async\Completable`.

## Помилки/Винятки

- `ValueError` — якщо `$ms` <= 0.

## Приклади

### Приклад #1 Тайм-аут для await()

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use Async\TimeoutException;

$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com');
});

try {
    $result = await($coroutine, timeout(3000));
} catch (TimeoutException $e) {
    echo "Запит не завершився за 3 секунди\n";
}
?>
```

### Приклад #2 Тайм-аут для групи задач

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail([
        spawn(file_get_contents(...), 'https://api/a'),
        spawn(file_get_contents(...), 'https://api/b'),
    ], timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Не всі запити завершилися за 5 секунд\n";
}
?>
```

### Приклад #3 Скасування тайм-ауту

```php
<?php
use function Async\timeout;

$timer = timeout(5000);

// Операція завершилася швидше — скасовуємо таймер
$timer->cancel();
?>
```

## Дивіться також

- [delay()](/uk/docs/reference/delay.html) — призупинення корутини
- [await()](/uk/docs/reference/await.html) — очікування зі скасуванням
