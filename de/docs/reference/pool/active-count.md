---
layout: docs
lang: de
path_key: "/docs/reference/pool/active-count.html"
nav_active: docs
permalink: /de/docs/reference/pool/active-count.html
page_title: "Pool::activeCount"
description: "Anzahl aktiver Ressourcen im Pool."
---

# Pool::activeCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::activeCount(): int
```

Gibt die Anzahl der Ressourcen zurueck, die derzeit in Verwendung sind
(ueber `acquire()` oder `tryAcquire()` erworben und noch nicht
ueber `release()` zurueckgegeben).

## Parameter

Diese Methode nimmt keine Parameter entgegen.

## Rueckgabewert

Die Anzahl der aktiven Ressourcen.

## Beispiele

### Beispiel #1 Aktive Ressourcen zaehlen

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

### Beispiel #2 Pool-Statistiken anzeigen

```php
<?php

use Async\Pool;

function poolStats(Pool $pool): string
{
    return sprintf(
        "Pool: gesamt=%d, aktiv=%d, unbenutzt=%d",
        $pool->count(),
        $pool->activeCount(),
        $pool->idleCount()
    );
}
```

## Siehe auch

- [Pool::idleCount](/de/docs/reference/pool/idle-count.html) --- Anzahl unbenutzter Ressourcen
- [Pool::count](/de/docs/reference/pool/count.html) --- Gesamtanzahl der Ressourcen
