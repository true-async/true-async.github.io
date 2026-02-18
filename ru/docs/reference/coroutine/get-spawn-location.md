---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/get-spawn-location.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/get-spawn-location.html
page_title: "Coroutine::getSpawnLocation"
description: "Получить место создания корутины как строку."
---

# Coroutine::getSpawnLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnLocation(): string
```

Возвращает место создания корутины в формате `"файл:строка"`. Если информация недоступна, возвращает `"unknown"`.

## Возвращаемое значение

`string` — строка вида `"/app/script.php:42"` или `"unknown"`.

## Примеры

### Пример #1 Отладочный вывод

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test");

echo "Создана в: " . $coroutine->getSpawnLocation() . "\n";
// Вывод: "Создана в: /app/script.php:5"
```

### Пример #2 Логирование всех корутин

```php
<?php

use function Async\spawn;
use function Async\get_coroutines;

spawn(fn() => Async\delay(1000));
spawn(fn() => Async\delay(2000));

foreach (get_coroutines() as $coro) {
    echo "Корутина #{$coro->getId()} создана в {$coro->getSpawnLocation()}\n";
}
```

## См. также

- [Coroutine::getSpawnFileAndLine](/ru/docs/reference/coroutine/get-spawn-file-and-line.html) — Файл и строка как массив
- [Coroutine::getSuspendLocation](/ru/docs/reference/coroutine/get-suspend-location.html) — Место приостановки
- [get_coroutines()](/ru/docs/reference/get-coroutines.html) — Все активные корутины
