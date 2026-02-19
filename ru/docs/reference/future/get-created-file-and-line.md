---
layout: docs
lang: ru
path_key: "/docs/reference/future/get-created-file-and-line.html"
nav_active: docs
permalink: /ru/docs/reference/future/get-created-file-and-line.html
page_title: "Future::getCreatedFileAndLine"
description: "Место создания Future в виде массива."
---

# Future::getCreatedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedFileAndLine(): array
```

Возвращает информацию о месте создания `Future` в виде массива. Содержит имя файла и номер строки, где был создан данный Future. Полезно для отладки и трассировки.

## Возвращаемое значение

`array` — массив с ключами `file` (строка, путь к файлу) и `line` (целое число, номер строки).

## Примеры

### Пример #1 Получение места создания

```php
<?php

use Async\Future;

$future = Future::completed(42); // строка 5

$location = $future->getCreatedFileAndLine();
echo "Файл: " . $location['file'] . "\n";
echo "Строка: " . $location['line'] . "\n";
// Файл: /app/script.php
// Строка: 5
```

### Пример #2 Логирование информации о Future

```php
<?php

use Async\Future;
use Async\FutureState;

function createTrackedFuture(): Future {
    $state = new FutureState();
    $future = new Future($state);

    $info = $future->getCreatedFileAndLine();
    error_log(sprintf(
        "Future создан в %s:%d",
        $info['file'],
        $info['line']
    ));

    return $future;
}
```

## См. также

- [Future::getCreatedLocation](/ru/docs/reference/future/get-created-location.html) — Место создания как строка
- [Future::getCompletedFileAndLine](/ru/docs/reference/future/get-completed-file-and-line.html) — Место завершения Future
- [Future::getAwaitingInfo](/ru/docs/reference/future/get-awaiting-info.html) — Информация об ожидающих
