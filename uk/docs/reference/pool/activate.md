---
layout: docs
lang: uk
path_key: "/docs/reference/pool/activate.html"
nav_active: docs
permalink: /uk/docs/reference/pool/activate.html
page_title: "Pool::activate"
description: "Примусове переведення пулу в стан ACTIVE."
---

# Pool::activate

(PHP 8.6+, True Async 1.0)

```php
public Pool::activate(): void
```

Примусово переводить пул у стан `ACTIVE`. Ресурси знову стають доступними для отримання. Використовується для ручного керування Circuit Breaker, наприклад, після підтвердження відновлення роботи сервісу.

## Параметри

Цей метод не приймає параметрів.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Ручна активація після перевірки

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 5
);

// Suppose the pool was deactivated
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    // Manually check service availability
    if (checkServiceHealth('https://api.example.com/health')) {
        $pool->activate();
        echo "Pool activated\n";
    }
}
```

### Приклад #2 Активація за зовнішнім сигналом

```php
<?php

use Async\Pool;

// Webhook handler from the monitoring system
function onServiceRestored(Pool $pool): void
{
    $pool->activate();
    echo "Service restored, pool activated\n";
}
```

## Дивіться також

- [Pool::deactivate](/uk/docs/reference/pool/deactivate.html) --- Перехід у стан INACTIVE
- [Pool::recover](/uk/docs/reference/pool/recover.html) --- Перехід у стан RECOVERING
- [Pool::getState](/uk/docs/reference/pool/get-state.html) --- Поточний стан
