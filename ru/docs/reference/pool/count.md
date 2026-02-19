---
layout: docs
lang: ru
path_key: "/docs/reference/pool/count.html"
nav_active: docs
permalink: /ru/docs/reference/pool/count.html
page_title: "Pool::count"
description: "Общее количество ресурсов в пуле."
---

# Pool::count

(PHP 8.6+, True Async 1.0)

```php
public Pool::count(): int
```

Возвращает общее количество ресурсов в пуле, включая как свободные (idle),
так и используемые (active) ресурсы.

## Параметры

Метод не принимает параметров.

## Возвращаемые значения

Общее количество ресурсов в пуле.

## Примеры

### Пример #1 Мониторинг пула

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 2,
    max: 10
);

echo "Всего ресурсов: " . $pool->count() . "\n";       // 2 (min)
echo "Свободных: " . $pool->idleCount() . "\n";         // 2
echo "Используемых: " . $pool->activeCount() . "\n";    // 0

$conn1 = $pool->acquire();
$conn2 = $pool->acquire();
$conn3 = $pool->acquire(); // создаётся новый ресурс

echo "Всего ресурсов: " . $pool->count() . "\n";       // 3
echo "Свободных: " . $pool->idleCount() . "\n";         // 0
echo "Используемых: " . $pool->activeCount() . "\n";    // 3
```

## См. также

- [Pool::idleCount](/ru/docs/reference/pool/idle-count.html) — Количество свободных ресурсов
- [Pool::activeCount](/ru/docs/reference/pool/active-count.html) — Количество используемых ресурсов
