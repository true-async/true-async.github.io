---
layout: docs
lang: ru
path_key: "/docs/reference/pool/active-count.html"
nav_active: docs
permalink: /ru/docs/reference/pool/active-count.html
page_title: "Pool::activeCount"
description: "Количество используемых ресурсов в пуле."
---

# Pool::activeCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::activeCount(): int
```

Возвращает количество ресурсов, которые в данный момент используются
(были получены через `acquire()` или `tryAcquire()` и ещё не возвращены
через `release()`).

## Параметры

Метод не принимает параметров.

## Возвращаемые значения

Количество используемых ресурсов.

## Примеры

### Пример #1 Подсчёт активных ресурсов

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

### Пример #2 Вывод статистики пула

```php
<?php

use Async\Pool;

function poolStats(Pool $pool): string
{
    return sprintf(
        "Пул: всего=%d, активных=%d, свободных=%d",
        $pool->count(),
        $pool->activeCount(),
        $pool->idleCount()
    );
}
```

## См. также

- [Pool::idleCount](/ru/docs/reference/pool/idle-count.html) — Количество свободных ресурсов
- [Pool::count](/ru/docs/reference/pool/count.html) — Общее количество ресурсов
