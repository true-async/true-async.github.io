---
layout: docs
lang: de
path_key: "/docs/reference/pool/is-closed.html"
nav_active: docs
permalink: /de/docs/reference/pool/is-closed.html
page_title: "Pool::isClosed"
description: "Pruefen, ob der Pool geschlossen ist."
---

# Pool::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Pool::isClosed(): bool
```

Prueft, ob der Pool durch einen `close()`-Aufruf geschlossen wurde.

## Parameter

Diese Methode nimmt keine Parameter entgegen.

## Rueckgabewert

Gibt `true` zurueck, wenn der Pool geschlossen ist, `false` wenn der Pool aktiv ist.

## Beispiele

### Beispiel #1 Pool-Zustand pruefen

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

var_dump($pool->isClosed()); // bool(false)

$pool->close();

var_dump($pool->isClosed()); // bool(true)
```

### Beispiel #2 Bedingte Pool-Nutzung

```php
<?php

use Async\Pool;

function executeQuery(Pool $pool, string $sql): mixed
{
    if ($pool->isClosed()) {
        throw new \RuntimeException('Verbindungspool ist geschlossen');
    }

    $conn = $pool->acquire();

    try {
        return $conn->query($sql)->fetchAll();
    } finally {
        $pool->release($conn);
    }
}
```

## Siehe auch

- [Pool::close](/de/docs/reference/pool/close.html) --- Den Pool schliessen
- [Pool::getState](/de/docs/reference/pool/get-state.html) --- Circuit-Breaker-Zustand
