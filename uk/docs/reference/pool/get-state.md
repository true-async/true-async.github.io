---
layout: docs
lang: uk
path_key: "/docs/reference/pool/get-state.html"
nav_active: docs
permalink: /uk/docs/reference/pool/get-state.html
page_title: "Pool::getState"
description: "Отримання поточного стану Circuit Breaker."
---

# Pool::getState

(PHP 8.6+, True Async 1.0)

```php
public Pool::getState(): CircuitBreakerState
```

Повертає поточний стан Circuit Breaker пулу.

## Параметри

Цей метод не приймає параметрів.

## Значення, що повертається

Значення enum `CircuitBreakerState`:

- `CircuitBreakerState::ACTIVE` --- пул працює нормально, ресурси видаються.
- `CircuitBreakerState::INACTIVE` --- пул деактивовано, запити відхиляються.
- `CircuitBreakerState::RECOVERING` --- пул у режимі відновлення, пропускає обмежену кількість запитів для перевірки доступності сервісу.

## Приклади

### Приклад #1 Перевірка стану пулу

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

$state = $pool->getState();

match ($state) {
    CircuitBreakerState::ACTIVE => echo "Pool is active\n",
    CircuitBreakerState::INACTIVE => echo "Service unavailable\n",
    CircuitBreakerState::RECOVERING => echo "Recovering...\n",
};
```

### Приклад #2 Умовна логіка на основі стану

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

function makeRequest(Pool $pool, string $endpoint): mixed
{
    if ($pool->getState() === CircuitBreakerState::INACTIVE) {
        // Use cached data instead of calling the service
        return getCachedResponse($endpoint);
    }

    $client = $pool->acquire(timeout: 3000);

    try {
        return $client->get($endpoint);
    } finally {
        $pool->release($client);
    }
}
```

## Дивіться також

- [Pool::setCircuitBreakerStrategy](/uk/docs/reference/pool/set-circuit-breaker-strategy.html) --- Встановити стратегію
- [Pool::activate](/uk/docs/reference/pool/activate.html) --- Примусова активація
- [Pool::deactivate](/uk/docs/reference/pool/deactivate.html) --- Примусова деактивація
- [Pool::recover](/uk/docs/reference/pool/recover.html) --- Перехід у режим відновлення
