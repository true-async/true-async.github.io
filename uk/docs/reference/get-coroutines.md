---
layout: docs
lang: uk
path_key: "/docs/reference/get-coroutines.html"
nav_active: docs
permalink: /uk/docs/reference/get-coroutines.html
page_title: "get_coroutines()"
description: "get_coroutines() — отримання списку всіх активних корутин для діагностики."
---

# get_coroutines

(PHP 8.6+, True Async 1.0)

`get_coroutines()` — Повертає масив усіх активних корутин. Корисно для діагностики та моніторингу.

## Опис

```php
get_coroutines(): array
```

## Значення, що повертаються

Масив об'єктів `Async\Coroutine` — усі корутини, зареєстровані в поточному запиті.

## Приклади

### Приклад #1 Моніторинг корутин

```php
<?php
use function Async\spawn;
use function Async\get_coroutines;
use function Async\delay;

spawn(function() { delay(10000); });
spawn(function() { delay(10000); });

// Дозволити корутинам запуститися
delay(10);

foreach (get_coroutines() as $coro) {
    echo sprintf(
        "Coroutine #%d: %s, spawned at %s\n",
        $coro->getId(),
        $coro->isSuspended() ? 'suspended' : 'running',
        $coro->getSpawnLocation()
    );
}
?>
```

### Приклад #2 Виявлення витоків

```php
<?php
use function Async\get_coroutines;

// Наприкінці запиту перевірити наявність незавершених корутин
$active = get_coroutines();
if (count($active) > 0) {
    foreach ($active as $coro) {
        error_log("Unfinished coroutine: " . $coro->getSpawnLocation());
    }
}
?>
```

## Дивіться також

- [current_coroutine()](/uk/docs/reference/current-coroutine.html) — поточна корутина
- [Coroutines](/uk/docs/components/coroutines.html) — концепція корутин
