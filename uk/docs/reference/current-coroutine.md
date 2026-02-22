---
layout: docs
lang: uk
path_key: "/docs/reference/current-coroutine.html"
nav_active: docs
permalink: /uk/docs/reference/current-coroutine.html
page_title: "current_coroutine()"
description: "current_coroutine() — отримання об'єкта поточної виконуваної корутини."
---

# current_coroutine

(PHP 8.6+, True Async 1.0)

`current_coroutine()` — Повертає об'єкт поточної виконуваної корутини.

## Опис

```php
current_coroutine(): Async\Coroutine
```

## Значення, що повертаються

Об'єкт `Async\Coroutine`, що представляє поточну корутину.

## Помилки/Винятки

`Async\AsyncException` — якщо викликано поза корутиною.

## Приклади

### Приклад #1 Отримання ідентифікатора корутини

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();
    echo "Coroutine #" . $coro->getId() . "\n";
});
?>
```

### Приклад #2 Діагностика

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();

    echo "Spawned from: " . $coro->getSpawnLocation() . "\n";
    echo "Status: " . ($coro->isRunning() ? 'running' : 'suspended') . "\n";
});
?>
```

## Дивіться також

- [get_coroutines()](/uk/docs/reference/get-coroutines.html) — список усіх корутин
- [Coroutines](/uk/docs/components/coroutines.html) — концепція корутин
