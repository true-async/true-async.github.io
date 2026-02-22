---
layout: docs
lang: uk
path_key: "/docs/reference/pool/recover.html"
nav_active: docs
permalink: /uk/docs/reference/pool/recover.html
page_title: "Pool::recover"
description: "Переведення пулу в стан RECOVERING."
---

# Pool::recover

(PHP 8.6+, True Async 1.0)

```php
public Pool::recover(): void
```

Переводить пул у стан `RECOVERING`. У цьому стані пул пропускає обмежену кількість запитів для перевірки доступності сервісу. Якщо запити успішні, Circuit Breaker автоматично переводить пул у стан `ACTIVE`. Якщо запити продовжують завершуватися з помилками, пул повертається до стану `INACTIVE`.

## Параметри

Цей метод не приймає параметрів.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Спроба відновлення

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Pool is deactivated, try to recover
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    $pool->recover();
    echo "Pool transitioned to recovery mode\n";
    // Circuit Breaker will allow probe requests through
}
```

### Приклад #2 Періодичні спроби відновлення

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

spawn(function() use ($pool) {
    while (!$pool->isClosed()) {
        if ($pool->getState() === CircuitBreakerState::INACTIVE) {
            $pool->recover();
        }

        suspend(delay: 10000); // check every 10 seconds
    }
});
```

## Дивіться також

- [Pool::activate](/uk/docs/reference/pool/activate.html) --- Примусова активація
- [Pool::deactivate](/uk/docs/reference/pool/deactivate.html) --- Примусова деактивація
- [Pool::getState](/uk/docs/reference/pool/get-state.html) --- Поточний стан
- [Pool::setCircuitBreakerStrategy](/uk/docs/reference/pool/set-circuit-breaker-strategy.html) --- Налаштування стратегії
