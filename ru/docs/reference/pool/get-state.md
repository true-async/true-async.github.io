---
layout: docs
lang: ru
path_key: "/docs/reference/pool/get-state.html"
nav_active: docs
permalink: /ru/docs/reference/pool/get-state.html
page_title: "Pool::getState"
description: "Получение текущего состояния Circuit Breaker."
---

# Pool::getState

(PHP 8.6+, True Async 1.0)

```php
public Pool::getState(): CircuitBreakerState
```

Возвращает текущее состояние Circuit Breaker пула.

## Параметры

Метод не принимает параметров.

## Возвращаемые значения

Значение перечисления `CircuitBreakerState`:

- `CircuitBreakerState::ACTIVE` — пул работает нормально, ресурсы выдаются.
- `CircuitBreakerState::INACTIVE` — пул деактивирован, запросы отклоняются.
- `CircuitBreakerState::RECOVERING` — пул в режиме восстановления, пропускает
  ограниченное число запросов для проверки доступности сервиса.

## Примеры

### Пример #1 Проверка состояния пула

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
    CircuitBreakerState::ACTIVE => echo "Пул активен\n",
    CircuitBreakerState::INACTIVE => echo "Сервис недоступен\n",
    CircuitBreakerState::RECOVERING => echo "Восстановление...\n",
};
```

### Пример #2 Условная логика на основе состояния

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

function makeRequest(Pool $pool, string $endpoint): mixed
{
    if ($pool->getState() === CircuitBreakerState::INACTIVE) {
        // Использовать кэшированные данные вместо обращения к сервису
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

## См. также

- [Pool::setCircuitBreakerStrategy](/ru/docs/reference/pool/set-circuit-breaker-strategy.html) — Установить стратегию
- [Pool::activate](/ru/docs/reference/pool/activate.html) — Принудительная активация
- [Pool::deactivate](/ru/docs/reference/pool/deactivate.html) — Принудительная деактивация
- [Pool::recover](/ru/docs/reference/pool/recover.html) — Перевод в режим восстановления
