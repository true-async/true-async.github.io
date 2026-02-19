---
layout: docs
lang: ru
path_key: "/docs/reference/future/get-completed-file-and-line.html"
nav_active: docs
permalink: /ru/docs/reference/future/get-completed-file-and-line.html
page_title: "Future::getCompletedFileAndLine"
description: "Место завершения Future в виде массива."
---

# Future::getCompletedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedFileAndLine(): array
```

Возвращает информацию о месте, где `Future` был завершён (где вызвался `complete()` или `fail()` у связанного `FutureState`). Содержит имя файла и номер строки. Полезно для отладки и трассировки асинхронных цепочек.

## Возвращаемое значение

`array` — массив с ключами `file` (строка, путь к файлу) и `line` (целое число, номер строки). Если Future ещё не завершён, возвращает пустой массив.

## Примеры

### Пример #1 Получение места завершения

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete(42); // строка 8

$location = $future->getCompletedFileAndLine();
echo "Файл: " . $location['file'] . "\n";
echo "Строка: " . $location['line'] . "\n";
// Файл: /app/script.php
// Строка: 8
```

### Пример #2 Сравнение мест создания и завершения

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("result");
});

$future->await();

echo "Создан в: " . $future->getCreatedLocation() . "\n";
$completed = $future->getCompletedFileAndLine();
echo "Завершён в: " . $completed['file'] . ":" . $completed['line'] . "\n";
```

## См. также

- [Future::getCompletedLocation](/ru/docs/reference/future/get-completed-location.html) — Место завершения как строка
- [Future::getCreatedFileAndLine](/ru/docs/reference/future/get-created-file-and-line.html) — Место создания Future
- [Future::getAwaitingInfo](/ru/docs/reference/future/get-awaiting-info.html) — Информация об ожидающих
