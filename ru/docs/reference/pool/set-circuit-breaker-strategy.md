---
layout: docs
lang: ru
path_key: "/docs/reference/pool/set-circuit-breaker-strategy.html"
nav_active: docs
permalink: /ru/docs/reference/pool/set-circuit-breaker-strategy.html
page_title: "Pool::setCircuitBreakerStrategy"
description: "Установка стратегии Circuit Breaker для пула."
---

# Pool::setCircuitBreakerStrategy

(PHP 8.6+, True Async 1.0)

```php
public Pool::setCircuitBreakerStrategy(?CircuitBreakerStrategy $strategy): void
```

Устанавливает стратегию Circuit Breaker для пула. Circuit Breaker контролирует
доступность внешнего сервиса: при обнаружении множественных сбоев пул
автоматически переходит в состояние `INACTIVE`, предотвращая лавину ошибок.
При восстановлении сервиса пул возвращается в активное состояние.

## Параметры

**strategy**
: Объект стратегии `CircuitBreakerStrategy`, определяющий правила перехода
  между состояниями. `null` — отключить Circuit Breaker.

## Возвращаемые значения

Функция не возвращает значения.

## Примеры

### Пример #1 Установка стратегии

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
    failureThreshold: 5,       // после 5 ошибок — деактивация
    recoveryTimeout: 30000,    // через 30 секунд — попытка восстановления
    successThreshold: 3        // 3 успешных запроса — полная активация
);

$pool->setCircuitBreakerStrategy($strategy);
```

### Пример #2 Отключение Circuit Breaker

```php
<?php

use Async\Pool;

// Отключить стратегию
$pool->setCircuitBreakerStrategy(null);
```

## См. также

- [Pool::getState](/ru/docs/reference/pool/get-state.html) — Текущее состояние Circuit Breaker
- [Pool::activate](/ru/docs/reference/pool/activate.html) — Принудительная активация
- [Pool::deactivate](/ru/docs/reference/pool/deactivate.html) — Принудительная деактивация
- [Pool::recover](/ru/docs/reference/pool/recover.html) — Перевод в режим восстановления
