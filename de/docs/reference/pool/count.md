---
layout: docs
lang: de
path_key: "/docs/reference/pool/count.html"
nav_active: docs
permalink: /de/docs/reference/pool/count.html
page_title: "Pool::count"
description: "Gesamtanzahl der Ressourcen im Pool."
---

# Pool::count

(PHP 8.6+, True Async 1.0)

```php
public Pool::count(): int
```

Gibt die Gesamtanzahl der Ressourcen im Pool zurueck, einschliesslich sowohl
unbenutzter als auch aktiver (in Verwendung befindlicher) Ressourcen.

## Parameter

Diese Methode nimmt keine Parameter entgegen.

## Rueckgabewert

Die Gesamtanzahl der Ressourcen im Pool.

## Beispiele

### Beispiel #1 Pool ueberwachen

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 2,
    max: 10
);

echo "Ressourcen gesamt: " . $pool->count() . "\n";       // 2 (min)
echo "Unbenutzt: " . $pool->idleCount() . "\n";            // 2
echo "Aktiv: " . $pool->activeCount() . "\n";              // 0

$conn1 = $pool->acquire();
$conn2 = $pool->acquire();
$conn3 = $pool->acquire(); // eine neue Ressource wird erstellt

echo "Ressourcen gesamt: " . $pool->count() . "\n";       // 3
echo "Unbenutzt: " . $pool->idleCount() . "\n";            // 0
echo "Aktiv: " . $pool->activeCount() . "\n";              // 3
```

## Siehe auch

- [Pool::idleCount](/de/docs/reference/pool/idle-count.html) --- Anzahl unbenutzter Ressourcen
- [Pool::activeCount](/de/docs/reference/pool/active-count.html) --- Anzahl aktiver Ressourcen
