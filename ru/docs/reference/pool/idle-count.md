---
layout: docs
lang: ru
path_key: "/docs/reference/pool/idle-count.html"
nav_active: docs
permalink: /ru/docs/reference/pool/idle-count.html
page_title: "Pool::idleCount"
description: "Количество свободных ресурсов в пуле."
---

# Pool::idleCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::idleCount(): int
```

Возвращает количество свободных (неиспользуемых) ресурсов, готовых к выдаче.

## Параметры

Метод не принимает параметров.

## Возвращаемые значения

Количество свободных ресурсов в пуле.

## Примеры

### Пример #1 Отслеживание свободных ресурсов

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

### Пример #2 Адаптивная стратегия

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => createExpensiveResource(),
    min: 1,
    max: 20
);

// Если свободных ресурсов мало — снизить нагрузку
if ($pool->idleCount() < 2 && $pool->count() >= 18) {
    echo "Внимание: пул почти исчерпан\n";
}
```

## См. также

- [Pool::activeCount](/ru/docs/reference/pool/active-count.html) — Количество используемых ресурсов
- [Pool::count](/ru/docs/reference/pool/count.html) — Общее количество ресурсов
