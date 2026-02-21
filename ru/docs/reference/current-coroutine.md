---
layout: docs
lang: ru
path_key: "/docs/reference/current-coroutine.html"
nav_active: docs
permalink: /ru/docs/reference/current-coroutine.html
page_title: "current_coroutine()"
description: "current_coroutine() — получение объекта текущей выполняющейся корутины."
---

# current_coroutine

(PHP 8.6+, True Async 1.0)

`current_coroutine()` — Возвращает объект текущей выполняющейся корутины.

## Описание

```php
current_coroutine(): Async\Coroutine
```

## Возвращаемое значение

Объект `Async\Coroutine`, представляющий текущую корутину.

## Ошибки/Исключения

`Async\AsyncException` — если вызвано вне корутины.

## Примеры

### Пример #1 Получение ID корутины

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();
    echo "Корутина #" . $coro->getId() . "\n";
});
?>
```

### Пример #2 Диагностика

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();

    echo "Запущена из: " . $coro->getSpawnLocation() . "\n";
    echo "Статус: " . ($coro->isRunning() ? 'работает' : 'приостановлена') . "\n";
});
?>
```

## См. также

- [get_coroutines()](/ru/docs/reference/get-coroutines.html) — список всех корутин
- [Корутины](/ru/docs/components/coroutines.html) — концепция корутин
