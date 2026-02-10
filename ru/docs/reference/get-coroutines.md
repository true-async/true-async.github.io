---
layout: docs
lang: ru
path_key: "/docs/reference/get-coroutines.html"
nav_active: docs
permalink: /ru/docs/reference/get-coroutines.html
page_title: "get_coroutines()"
description: "get_coroutines() — получение списка всех активных корутин для диагностики."
---

# get_coroutines

(PHP 8.6+, True Async 1.0)

`get_coroutines()` — Возвращает массив всех активных корутин. Полезно для диагностики и мониторинга.

## Описание

```php
get_coroutines(): array
```

## Возвращаемое значение

Массив объектов `Async\Coroutine` — все корутины, зарегистрированные в текущем запросе.

## Примеры

### Пример #1 Мониторинг корутин

```php
<?php
use function Async\spawn;
use function Async\get_coroutines;
use function Async\delay;

spawn(function() { delay(10000); });
spawn(function() { delay(10000); });

// Даём корутинам запуститься
delay(10);

foreach (get_coroutines() as $coro) {
    echo sprintf(
        "Корутина #%d: %s, запущена в %s\n",
        $coro->getId(),
        $coro->isSuspended() ? 'приостановлена' : 'работает',
        $coro->getSpawnLocation()
    );
}
?>
```

### Пример #2 Обнаружение утечек

```php
<?php
use function Async\get_coroutines;

// В конце запроса проверяем — не осталось ли незавершённых корутин
$active = get_coroutines();
if (count($active) > 0) {
    foreach ($active as $coro) {
        error_log("Незавершённая корутина: " . $coro->getSpawnLocation());
    }
}
?>
```

## См. также

- [current_coroutine()](/ru/docs/reference/current-coroutine.html) — текущая корутина
- [Корутины](/ru/docs/concepts/coroutines.html) — концепция корутин
