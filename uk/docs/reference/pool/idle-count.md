---
layout: docs
lang: uk
path_key: "/docs/reference/pool/idle-count.html"
nav_active: docs
permalink: /uk/docs/reference/pool/idle-count.html
page_title: "Pool::idleCount"
description: "Кількість вільних ресурсів у пулі."
---

# Pool::idleCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::idleCount(): int
```

Повертає кількість вільних (невикористовуваних) ресурсів, готових до отримання.

## Параметри

Цей метод не приймає параметрів.

## Значення, що повертається

Кількість вільних ресурсів у пулі.

## Приклади

### Приклад #1 Відстеження вільних ресурсів

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 3,
    max: 10
);

echo $pool->idleCount() . "\n"; // 3

$conn = $pool->acquire();
echo $pool->idleCount() . "\n"; // 2

$pool->release($conn);
echo $pool->idleCount() . "\n"; // 3
```

### Приклад #2 Адаптивна стратегія

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => createExpensiveResource(),
    min: 1,
    max: 20
);

// If few idle resources remain — reduce load
if ($pool->idleCount() < 2 && $pool->count() >= 18) {
    echo "Warning: pool is nearly exhausted\n";
}
```

## Дивіться також

- [Pool::activeCount](/uk/docs/reference/pool/active-count.html) --- Кількість активних ресурсів
- [Pool::count](/uk/docs/reference/pool/count.html) --- Загальна кількість ресурсів
