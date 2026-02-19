---
layout: docs
lang: ru
path_key: "/docs/reference/pool/activate.html"
nav_active: docs
permalink: /ru/docs/reference/pool/activate.html
page_title: "Pool::activate"
description: "Принудительный перевод пула в состояние ACTIVE."
---

# Pool::activate

(PHP 8.6+, True Async 1.0)

```php
public Pool::activate(): void
```

Принудительно переводит пул в состояние `ACTIVE`. Ресурсы снова доступны
для выдачи. Используется для ручного управления Circuit Breaker, например,
после подтверждения восстановления сервиса.

## Параметры

Метод не принимает параметров.

## Возвращаемые значения

Функция не возвращает значения.

## Примеры

### Пример #1 Ручная активация после проверки

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 5
);

// Предположим, пул был деактивирован
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    // Проверяем доступность сервиса вручную
    if (checkServiceHealth('https://api.example.com/health')) {
        $pool->activate();
        echo "Пул активирован\n";
    }
}
```

### Пример #2 Активация по внешнему сигналу

```php
<?php

use Async\Pool;

// Обработчик webhook от системы мониторинга
function onServiceRestored(Pool $pool): void
{
    $pool->activate();
    echo "Сервис восстановлен, пул активирован\n";
}
```

## См. также

- [Pool::deactivate](/ru/docs/reference/pool/deactivate.html) — Перевести в состояние INACTIVE
- [Pool::recover](/ru/docs/reference/pool/recover.html) — Перевести в состояние RECOVERING
- [Pool::getState](/ru/docs/reference/pool/get-state.html) — Текущее состояние
