---
layout: docs
lang: uk
path_key: "/docs/reference/pool/count.html"
nav_active: docs
permalink: /uk/docs/reference/pool/count.html
page_title: "Pool::count"
description: "Загальна кількість ресурсів у пулі."
---

# Pool::count

(PHP 8.6+, True Async 1.0)

```php
public Pool::count(): int
```

Повертає загальну кількість ресурсів у пулі, включаючи як вільні, так і активні (ті, що використовуються) ресурси.

## Параметри

Цей метод не приймає параметрів.

## Значення, що повертається

Загальна кількість ресурсів у пулі.

## Приклади

### Приклад #1 Моніторинг пулу

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 2,
    max: 10
);

echo "Total resources: " . $pool->count() . "\n";       // 2 (min)
echo "Idle: " . $pool->idleCount() . "\n";               // 2
echo "Active: " . $pool->activeCount() . "\n";           // 0

$conn1 = $pool->acquire();
$conn2 = $pool->acquire();
$conn3 = $pool->acquire(); // a new resource is created

echo "Total resources: " . $pool->count() . "\n";       // 3
echo "Idle: " . $pool->idleCount() . "\n";               // 0
echo "Active: " . $pool->activeCount() . "\n";           // 3
```

## Дивіться також

- [Pool::idleCount](/uk/docs/reference/pool/idle-count.html) --- Кількість вільних ресурсів
- [Pool::activeCount](/uk/docs/reference/pool/active-count.html) --- Кількість активних ресурсів
