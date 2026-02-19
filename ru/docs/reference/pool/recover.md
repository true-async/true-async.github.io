---
layout: docs
lang: ru
path_key: "/docs/reference/pool/recover.html"
nav_active: docs
permalink: /ru/docs/reference/pool/recover.html
page_title: "Pool::recover"
description: "Перевод пула в состояние RECOVERING."
---

# Pool::recover

(PHP 8.6+, True Async 1.0)

```php
public Pool::recover(): void
```

Переводит пул в состояние `RECOVERING`. В этом состоянии пул пропускает
ограниченное количество запросов для проверки доступности сервиса.
Если запросы проходят успешно, Circuit Breaker автоматически переводит
пул в состояние `ACTIVE`. Если запросы продолжают завершаться ошибками,
пул возвращается в `INACTIVE`.

## Параметры

Метод не принимает параметров.

## Возвращаемые значения

Функция не возвращает значения.

## Примеры

### Пример #1 Попытка восстановления

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Пул деактивирован, пробуем восстановить
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    $pool->recover();
    echo "Пул переведён в режим восстановления\n";
    // Circuit Breaker будет пропускать пробные запросы
}
```

### Пример #2 Периодическая попытка восстановления

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

spawn(function() use ($pool) {
    while (!$pool->isClosed()) {
        if ($pool->getState() === CircuitBreakerState::INACTIVE) {
            $pool->recover();
        }

        suspend(delay: 10000); // проверять каждые 10 секунд
    }
});
```

## См. также

- [Pool::activate](/ru/docs/reference/pool/activate.html) — Принудительная активация
- [Pool::deactivate](/ru/docs/reference/pool/deactivate.html) — Принудительная деактивация
- [Pool::getState](/ru/docs/reference/pool/get-state.html) — Текущее состояние
- [Pool::setCircuitBreakerStrategy](/ru/docs/reference/pool/set-circuit-breaker-strategy.html) — Настройка стратегии
