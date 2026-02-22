---
layout: docs
lang: uk
path_key: "/docs/reference/pool/active-count.html"
nav_active: docs
permalink: /uk/docs/reference/pool/active-count.html
page_title: "Pool::activeCount"
description: "Кількість активних ресурсів у пулі."
---

# Pool::activeCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::activeCount(): int
```

Повертає кількість ресурсів, що наразі використовуються (отримані через `acquire()` або `tryAcquire()` і ще не повернуті через `release()`).

## Параметри

Цей метод не приймає параметрів.

## Значення, що повертається

Кількість активних ресурсів.

## Приклади

### Приклад #1 Підрахунок активних ресурсів

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

echo $pool->activeCount() . "\n"; // 0

$r1 = $pool->acquire();
$r2 = $pool->acquire();
echo $pool->activeCount() . "\n"; // 2

$pool->release($r1);
echo $pool->activeCount() . "\n"; // 1
```

### Приклад #2 Відображення статистики пулу

```php
<?php

use Async\Pool;

function poolStats(Pool $pool): string
{
    return sprintf(
        "Pool: total=%d, active=%d, idle=%d",
        $pool->count(),
        $pool->activeCount(),
        $pool->idleCount()
    );
}
```

## Дивіться також

- [Pool::idleCount](/uk/docs/reference/pool/idle-count.html) --- Кількість вільних ресурсів
- [Pool::count](/uk/docs/reference/pool/count.html) --- Загальна кількість ресурсів
