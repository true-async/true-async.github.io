---
layout: docs
lang: uk
path_key: "/docs/reference/pool/deactivate.html"
nav_active: docs
permalink: /uk/docs/reference/pool/deactivate.html
page_title: "Pool::deactivate"
description: "Примусове переведення пулу в стан INACTIVE."
---

# Pool::deactivate

(PHP 8.6+, True Async 1.0)

```php
public Pool::deactivate(): void
```

Примусово переводить пул у стан `INACTIVE`. У цьому стані пул відхиляє всі запити на отримання ресурсів. Використовується для ручної деактивації при виявленні проблем із зовнішнім сервісом.

На відміну від `close()`, деактивація є оборотною --- пул можна повернути до робочого стану через `activate()` або `recover()`.

## Параметри

Цей метод не приймає параметрів.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Деактивація при виявленні проблеми

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Upon detecting a critical error
try {
    $client = $pool->acquire();
    $response = $client->get('/critical-endpoint');
    $pool->release($client);
} catch (ServiceUnavailableException $e) {
    $pool->deactivate();
    echo "Service unavailable, pool deactivated\n";
}
```

### Приклад #2 Планове технічне обслуговування

```php
<?php

use Async\Pool;

function startMaintenance(Pool $pool): void
{
    $pool->deactivate();
    echo "Pool deactivated for maintenance\n";
}

function endMaintenance(Pool $pool): void
{
    $pool->activate();
    echo "Maintenance complete, pool activated\n";
}
```

## Дивіться також

- [Pool::activate](/uk/docs/reference/pool/activate.html) --- Перехід у стан ACTIVE
- [Pool::recover](/uk/docs/reference/pool/recover.html) --- Перехід у стан RECOVERING
- [Pool::getState](/uk/docs/reference/pool/get-state.html) --- Поточний стан
- [Pool::close](/uk/docs/reference/pool/close.html) --- Остаточне закриття пулу (незворотне)
