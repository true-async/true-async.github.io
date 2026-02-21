---
layout: docs
lang: de
path_key: "/docs/reference/pool/idle-count.html"
nav_active: docs
permalink: /de/docs/reference/pool/idle-count.html
page_title: "Pool::idleCount"
description: "Anzahl unbenutzter Ressourcen im Pool."
---

# Pool::idleCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::idleCount(): int
```

Gibt die Anzahl der unbenutzten (freien) Ressourcen zurueck, die zum Erwerb bereitstehen.

## Parameter

Diese Methode nimmt keine Parameter entgegen.

## Rueckgabewert

Die Anzahl der unbenutzten Ressourcen im Pool.

## Beispiele

### Beispiel #1 Unbenutzte Ressourcen verfolgen

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

### Beispiel #2 Adaptive Strategie

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => createExpensiveResource(),
    min: 1,
    max: 20
);

// Wenn wenige unbenutzte Ressourcen verbleiben — Last reduzieren
if ($pool->idleCount() < 2 && $pool->count() >= 18) {
    echo "Warnung: Pool ist nahezu erschoepft\n";
}
```

## Siehe auch

- [Pool::activeCount](/de/docs/reference/pool/active-count.html) --- Anzahl aktiver Ressourcen
- [Pool::count](/de/docs/reference/pool/count.html) --- Gesamtanzahl der Ressourcen
