---
layout: docs
lang: de
path_key: "/docs/reference/pool/release.html"
nav_active: docs
permalink: /de/docs/reference/pool/release.html
page_title: "Pool::release"
description: "Eine Ressource an den Pool zurueckgeben."
---

# Pool::release

(PHP 8.6+, True Async 1.0)

```php
public Pool::release(mixed $resource): void
```

Gibt eine zuvor erworbene Ressource an den Pool zurueck. Wenn beim Erstellen des Pools ein `beforeRelease`-Hook
gesetzt wurde, wird dieser vor der Rueckgabe aufgerufen. Wenn der Hook
`false` zurueckgibt, wird die Ressource zerstoert, anstatt an den Pool zurueckgegeben zu werden.

Wenn Coroutinen ueber `acquire()` auf eine Ressource warten, wird die Ressource
sofort an die erste wartende Coroutine uebergeben.

## Parameter

**resource**
: Eine zuvor ueber `acquire()` oder `tryAcquire()` erworbene Ressource.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Sichere Rueckgabe ueber finally

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 10
);

$conn = $pool->acquire();

try {
    $conn->beginTransaction();
    $conn->exec("INSERT INTO logs (message) VALUES ('event')");
    $conn->commit();
} catch (\Throwable $e) {
    $conn->rollBack();
    throw $e;
} finally {
    $pool->release($conn);
}
```

### Beispiel #2 Automatische Zerstoerung ueber beforeRelease

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new TcpClient('api.example.com', 443),
    destructor: fn(TcpClient $c) => $c->disconnect(),
    beforeRelease: function(TcpClient $client): bool {
        // Wenn die Verbindung unterbrochen ist — nicht an den Pool zurueckgeben
        return $client->isAlive();
    },
    max: 5
);

$client = $pool->acquire();

try {
    $client->send('PING');
} finally {
    // Wenn isAlive() false zurueckgibt, wird der Client zerstoert
    $pool->release($client);
}
```

## Siehe auch

- [Pool::acquire](/de/docs/reference/pool/acquire.html) --- Eine Ressource aus dem Pool erwerben
- [Pool::tryAcquire](/de/docs/reference/pool/try-acquire.html) --- Nicht-blockierender Erwerb
- [Pool::close](/de/docs/reference/pool/close.html) --- Den Pool schliessen
