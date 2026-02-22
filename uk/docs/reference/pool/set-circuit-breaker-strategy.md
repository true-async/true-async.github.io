---
layout: docs
lang: uk
path_key: "/docs/reference/pool/set-circuit-breaker-strategy.html"
nav_active: docs
permalink: /uk/docs/reference/pool/set-circuit-breaker-strategy.html
page_title: "Pool::setCircuitBreakerStrategy"
description: "Встановлення стратегії Circuit Breaker для пулу."
---

# Pool::setCircuitBreakerStrategy

(PHP 8.6+, True Async 1.0)

```php
public Pool::setCircuitBreakerStrategy(?CircuitBreakerStrategy $strategy): void
```

Встановлює стратегію Circuit Breaker для пулу. Circuit Breaker відстежує доступність зовнішнього сервісу: при виявленні кількох збоїв пул автоматично переходить у стан `INACTIVE`, запобігаючи каскаду помилок. Коли сервіс відновлюється, пул повертається до активного стану.

## Параметри

**strategy**
: Об'єкт `CircuitBreakerStrategy`, що визначає правила переходу між станами. `null` --- вимкнути Circuit Breaker.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Встановлення стратегії

```php
<?php

use Async\Pool;
use Async\CircuitBreakerStrategy;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    destructor: fn(HttpClient $c) => $c->close(),
    max: 10
);

$strategy = new CircuitBreakerStrategy(
    failureThreshold: 5,       // after 5 errors — deactivate
    recoveryTimeout: 30000,    // after 30 seconds — attempt recovery
    successThreshold: 3        // 3 successful requests — full activation
);

$pool->setCircuitBreakerStrategy($strategy);
```

### Приклад #2 Вимкнення Circuit Breaker

```php
<?php

use Async\Pool;

// Disable the strategy
$pool->setCircuitBreakerStrategy(null);
```

## Дивіться також

- [Pool::getState](/uk/docs/reference/pool/get-state.html) --- Поточний стан Circuit Breaker
- [Pool::activate](/uk/docs/reference/pool/activate.html) --- Примусова активація
- [Pool::deactivate](/uk/docs/reference/pool/deactivate.html) --- Примусова деактивація
- [Pool::recover](/uk/docs/reference/pool/recover.html) --- Перехід у режим відновлення
