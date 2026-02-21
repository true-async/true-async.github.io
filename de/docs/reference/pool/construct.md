---
layout: docs
lang: de
path_key: "/docs/reference/pool/construct.html"
nav_active: docs
permalink: /de/docs/reference/pool/construct.html
page_title: "Pool::__construct"
description: "Einen neuen Ressourcenpool erstellen."
---

# Pool::__construct

(PHP 8.6+, True Async 1.0)

```php
public Pool::__construct(
    callable $factory,
    ?callable $destructor = null,
    ?callable $healthcheck = null,
    ?callable $beforeAcquire = null,
    ?callable $beforeRelease = null,
    int $min = 0,
    int $max = 10,
    int $healthcheckInterval = 0
)
```

Erstellt einen neuen Ressourcenpool. Der Pool verwaltet eine Menge wiederverwendbarer Objekte
(Verbindungen, Clients, Dateideskriptoren usw.) und erstellt sowie zerstoert sie bei Bedarf automatisch.

## Parameter

**factory**
: Eine Factory-Funktion zur Erstellung einer neuen Ressource. Wird jedes Mal aufgerufen,
  wenn der Pool eine neue Ressource benoetigt und die aktuelle Anzahl kleiner als `max` ist.
  Muss eine einsatzbereite Ressource zurueckgeben.

**destructor**
: Eine Funktion zur ordnungsgemaessen Zerstoerung einer Ressource. Wird aufgerufen, wenn der Pool geschlossen
  wird oder wenn eine Ressource entfernt wird (z.B. nach einem fehlgeschlagenen Health-Check).
  `null` --- die Ressource wird ohne zusaetzliche Aktionen einfach aus dem Pool entfernt.

**healthcheck**
: Eine Funktion zur Zustandspruefung der Ressource. Nimmt eine Ressource entgegen und gibt `bool` zurueck.
  `true` --- die Ressource ist funktionsfaehig, `false` --- die Ressource wird zerstoert und ersetzt.
  `null` --- es wird keine Zustandspruefung durchgefuehrt.

**beforeAcquire**
: Ein Hook, der vor der Ausgabe einer Ressource aufgerufen wird. Nimmt die Ressource entgegen.
  Kann zur Vorbereitung der Ressource verwendet werden (z.B. Zustand zuruecksetzen).
  `null` --- kein Hook.

**beforeRelease**
: Ein Hook, der vor der Rueckgabe einer Ressource an den Pool aufgerufen wird. Nimmt die Ressource entgegen
  und gibt `bool` zurueck. Wenn `false` zurueckgegeben wird, wird die Ressource zerstoert, anstatt
  an den Pool zurueckgegeben zu werden.
  `null` --- kein Hook.

**min**
: Die Mindestanzahl von Ressourcen im Pool. Bei der Erstellung des Pools
  werden sofort `min` Ressourcen erstellt. Standardwert ist `0`.

**max**
: Die maximale Anzahl von Ressourcen im Pool. Wenn das Limit erreicht ist,
  blockieren `acquire()`-Aufrufe, bis eine Ressource freigegeben wird.
  Standardwert ist `10`.

**healthcheckInterval**
: Das Intervall fuer Hintergrund-Zustandspruefungen der Ressourcen in Millisekunden.
  `0` --- Hintergrundpruefung ist deaktiviert (Pruefung nur beim Erwerb).

## Beispiele

### Beispiel #1 PDO-Verbindungspool

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: function(): PDO {
        return new PDO('mysql:host=localhost;dbname=app', 'user', 'pass', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    },
    destructor: function(PDO $pdo): void {
        // PDO wird beim Entfernen automatisch geschlossen
    },
    healthcheck: function(PDO $pdo): bool {
        try {
            $pdo->query('SELECT 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    },
    min: 2,
    max: 20,
    healthcheckInterval: 30000 // alle 30 Sekunden pruefen
);

$conn = $pool->acquire();
$result = $conn->query('SELECT * FROM users');
$pool->release($conn);
```

### Beispiel #2 Pool mit Hooks

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new RedisClient('127.0.0.1', 6379),
    destructor: fn(RedisClient $r) => $r->close(),
    beforeAcquire: function(RedisClient $r): void {
        $r->select(0); // auf Standarddatenbank zuruecksetzen
    },
    beforeRelease: function(RedisClient $r): bool {
        // Wenn die Verbindung unterbrochen ist — Ressource zerstoeren
        return $r->isConnected();
    },
    max: 5
);
```

## Siehe auch

- [Pool::acquire](/de/docs/reference/pool/acquire.html) --- Eine Ressource aus dem Pool erwerben
- [Pool::release](/de/docs/reference/pool/release.html) --- Eine Ressource an den Pool zurueckgeben
- [Pool::close](/de/docs/reference/pool/close.html) --- Den Pool schliessen
