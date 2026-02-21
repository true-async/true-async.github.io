---
layout: docs
lang: de
path_key: "/docs/reference/pool/acquire.html"
nav_active: docs
permalink: /de/docs/reference/pool/acquire.html
page_title: "Pool::acquire"
description: "Eine Ressource aus dem Pool mit Wartezeit erwerben."
---

# Pool::acquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::acquire(int $timeout = 0): mixed
```

Erwirbt eine Ressource aus dem Pool. Wenn keine freien Ressourcen verfuegbar sind und das
maximale Limit erreicht ist, blockiert die Coroutine, bis eine Ressource verfuegbar wird.

Wenn der Pool eine freie Ressource hat, wird sie sofort zurueckgegeben. Wenn es keine freien Ressourcen
gibt, aber das `max`-Limit noch nicht erreicht ist, wird eine neue Ressource ueber `factory` erstellt. Andernfalls
wartet der Aufruf auf die Freigabe einer Ressource.

## Parameter

**timeout**
: Maximale Wartezeit in Millisekunden.
  `0` --- unbegrenzt warten.
  Wenn das Timeout ueberschritten wird, wird eine `PoolException` geworfen.

## Rueckgabewert

Gibt eine Ressource aus dem Pool zurueck.

## Fehler

Wirft `Async\PoolException` wenn:
- Das Warte-Timeout ueberschritten wird.
- Der Pool geschlossen ist.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

// Verbindung holen (wartet bei Bedarf)
$conn = $pool->acquire();

try {
    $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([42]);
    $user = $stmt->fetch();
} finally {
    $pool->release($conn);
}
```

### Beispiel #2 Mit Timeout

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 2
);

try {
    $conn = $pool->acquire(timeout: 5000); // maximal 5 Sekunden warten
    // mit der Verbindung arbeiten...
    $pool->release($conn);
} catch (PoolException $e) {
    echo "Ressource konnte nicht erworben werden: {$e->getMessage()}\n";
}
```

## Siehe auch

- [Pool::tryAcquire](/de/docs/reference/pool/try-acquire.html) --- Nicht-blockierender Ressourcenerwerb
- [Pool::release](/de/docs/reference/pool/release.html) --- Eine Ressource an den Pool zurueckgeben
- [Pool::__construct](/de/docs/reference/pool/construct.html) --- Einen Pool erstellen
