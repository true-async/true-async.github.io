---
layout: docs
lang: ru
path_key: "/docs/reference/future/await.html"
nav_active: docs
permalink: /ru/docs/reference/future/await.html
page_title: "Future::await"
description: "Ожидание результата Future."
---

# Future::await

(PHP 8.6+, True Async 1.0)

```php
public function await(?Completable $cancellation = null): mixed
```

Ожидает завершения `Future` и возвращает его результат. Блокирует текущую корутину до тех пор, пока Future не будет завершён. Если Future завершился с ошибкой, метод выбрасывает это исключение. Можно передать `Completable` для отмены ожидания по таймауту или внешнему условию.

## Параметры

`cancellation` — объект отмены ожидания. Если указан и сработает до завершения Future, будет выброшено `CancelledException`. По умолчанию `null`.

## Возвращаемое значение

`mixed` — результат Future.

## Ошибки

Выбрасывает исключение, если Future завершён с ошибкой или был отменён.

## Примеры

### Пример #1 Базовое ожидание результата

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    \Async\delay(100);
    return 42;
});

$result = $future->await();
echo "Результат: $result\n"; // Результат: 42
```

### Пример #2 Обработка ошибки при ожидании

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    throw new \RuntimeException("Что-то пошло не так");
});

try {
    $result = $future->await();
} catch (\RuntimeException $e) {
    echo "Ошибка: " . $e->getMessage() . "\n";
    // Ошибка: Что-то пошло не так
}
```

## См. также

- [Future::isCompleted](/ru/docs/reference/future/is-completed.html) — Проверить завершённость Future
- [Future::cancel](/ru/docs/reference/future/cancel.html) — Отменить Future
- [Future::map](/ru/docs/reference/future/map.html) — Трансформация результата
