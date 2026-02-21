---
layout: docs
lang: de
path_key: "/docs/reference/pool/try-acquire.html"
nav_active: docs
permalink: /de/docs/reference/pool/try-acquire.html
page_title: "Pool::tryAcquire"
description: "Nicht-blockierender Ressourcenerwerb aus dem Pool."
---

# Pool::tryAcquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::tryAcquire(): mixed
```

Versucht, eine Ressource aus dem Pool ohne Blockierung zu erwerben. Wenn eine freie Ressource
verfuegbar ist oder das `max`-Limit noch nicht erreicht wurde, wird die Ressource sofort zurueckgegeben.
Andernfalls wird `null` zurueckgegeben.

## Parameter

Diese Methode nimmt keine Parameter entgegen.

## Rueckgabewert

Gibt eine Ressource aus dem Pool oder `null` zurueck, wenn keine freien Ressourcen verfuegbar sind
und das maximale Limit erreicht wurde.

## Beispiele

### Beispiel #1 Versuch, eine Ressource zu erwerben

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

$conn = $pool->tryAcquire();

if ($conn === null) {
    echo "Alle Verbindungen sind belegt, versuchen Sie es spaeter erneut\n";
} else {
    try {
        $result = $conn->query('SELECT COUNT(*) FROM orders');
        echo "Bestellungen: " . $result->fetchColumn() . "\n";
    } finally {
        $pool->release($conn);
    }
}
```

### Beispiel #2 Fallback wenn der Pool nicht verfuegbar ist

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new CacheClient('127.0.0.1', 11211),
    max: 3
);

function getData(Pool $pool, string $key): mixed
{
    $client = $pool->tryAcquire();

    if ($client === null) {
        // Cache nicht verfuegbar — Datenbank direkt abfragen
        return fetchFromDatabase($key);
    }

    try {
        return $client->get($key) ?? fetchFromDatabase($key);
    } finally {
        $pool->release($client);
    }
}
```

## Siehe auch

- [Pool::acquire](/de/docs/reference/pool/acquire.html) --- Blockierender Ressourcenerwerb
- [Pool::release](/de/docs/reference/pool/release.html) --- Eine Ressource an den Pool zurueckgeben
