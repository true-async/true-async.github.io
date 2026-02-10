---
layout: docs
lang: ru
path_key: "/docs/reference/timeout.html"
nav_active: docs
permalink: /ru/docs/reference/timeout.html
page_title: "timeout()"
description: "timeout() — создание объекта таймаута для ограничения времени ожидания."
---

# timeout

(PHP 8.6+, True Async 1.0)

`timeout()` — Создаёт объект `Async\Timeout`, который срабатывает через указанное количество миллисекунд.

## Описание

```php
timeout(int $ms): Async\Awaitable
```

Создаёт таймер, который через `$ms` миллисекунд выбрасывает `Async\TimeoutException`. 
Используется как ограничитель времени ожидания в `await()` и других функциях.

## Параметры

**`ms`**
Время в миллисекундах. Должно быть больше 0.

## Возвращаемое значение

Возвращает объект `Async\Timeout`, реализующий `Async\Completable`.

## Ошибки/Исключения

- `ValueError` — если `$ms` <= 0.

## Примеры

### Пример #1 Таймаут на await()

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
    echo "Запрос не завершился за 3 секунды\n";
}
?>
```

### Пример #2 Таймаут на группу задач

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
    echo "Не все запросы завершились за 5 секунд\n";
}
?>
```

### Пример #3 Отмена таймаута

```php
<?php
use function Async\timeout;

$timer = timeout(5000);

// Операция завершилась быстрее — отменяем таймер
$timer->cancel();
?>
```

## См. также

- [delay()](/ru/docs/reference/delay.html) — приостановка корутины
- [await()](/ru/docs/reference/await.html) — ожидание с отменой
