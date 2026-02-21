---
layout: docs
lang: de
path_key: "/docs/reference/pool/close.html"
nav_active: docs
permalink: /de/docs/reference/pool/close.html
page_title: "Pool::close"
description: "Den Pool schliessen und alle Ressourcen zerstoeren."
---

# Pool::close

(PHP 8.6+, True Async 1.0)

```php
public Pool::close(): void
```

Schliesst den Ressourcenpool. Alle unbenutzten Ressourcen werden ueber den `destructor`
zerstoert (falls einer angegeben wurde). Alle Coroutinen, die ueber `acquire()` auf eine Ressource warten,
erhalten eine `PoolException`. Nach dem Schliessen werfen alle Aufrufe von `acquire()` und `tryAcquire()`
eine Ausnahme.

## Parameter

Diese Methode nimmt keine Parameter entgegen.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Ordnungsgemaesses Herunterfahren

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    destructor: function(PDO $pdo): void {
        // Alle vorbereiteten Anweisungen und Verbindung schliessen
    },
    min: 2,
    max: 10
);

// ... mit dem Pool arbeiten ...

// Pool beim Herunterfahren der Anwendung schliessen
$pool->close();
```

### Beispiel #2 Wartende Coroutinen erhalten eine Ausnahme

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 1
);

$resource = $pool->acquire(); // die einzige Ressource genommen

spawn(function() use ($pool) {
    try {
        $pool->acquire(); // wartet auf Freigabe
    } catch (PoolException $e) {
        echo "Pool geschlossen: {$e->getMessage()}\n";
    }
});

$pool->close(); // wartende Coroutine erhaelt PoolException
```

## Siehe auch

- [Pool::isClosed](/de/docs/reference/pool/is-closed.html) --- Pruefen, ob der Pool geschlossen ist
- [Pool::__construct](/de/docs/reference/pool/construct.html) --- Einen Pool erstellen
