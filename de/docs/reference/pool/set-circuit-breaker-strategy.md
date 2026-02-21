---
layout: docs
lang: de
path_key: "/docs/reference/pool/set-circuit-breaker-strategy.html"
nav_active: docs
permalink: /de/docs/reference/pool/set-circuit-breaker-strategy.html
page_title: "Pool::setCircuitBreakerStrategy"
description: "Die Circuit-Breaker-Strategie fuer den Pool festlegen."
---

# Pool::setCircuitBreakerStrategy

(PHP 8.6+, True Async 1.0)

```php
public Pool::setCircuitBreakerStrategy(?CircuitBreakerStrategy $strategy): void
```

Legt die Circuit-Breaker-Strategie fuer den Pool fest. Der Circuit Breaker ueberwacht
die Verfuegbarkeit eines externen Dienstes: Bei mehreren Ausfaellen wechselt der Pool
automatisch in den `INACTIVE`-Zustand und verhindert so eine Fehlerkaskade.
Wenn der Dienst wiederhergestellt ist, kehrt der Pool in den aktiven Zustand zurueck.

## Parameter

**strategy**
: Ein `CircuitBreakerStrategy`-Objekt, das die Regeln fuer den Uebergang
  zwischen Zustaenden definiert. `null` --- Circuit Breaker deaktivieren.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Eine Strategie festlegen

```php
<?php

use Async\Pool;
use Async\CircuitBreakerStrategy;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    destructor: fn(HttpClient $c) => $c->close(),
    max: 10
);

$strategy = new CircuitBreakerStrategy(
    failureThreshold: 5,       // nach 5 Fehlern — deaktivieren
    recoveryTimeout: 30000,    // nach 30 Sekunden — Wiederherstellung versuchen
    successThreshold: 3        // 3 erfolgreiche Anfragen — vollstaendige Aktivierung
);

$pool->setCircuitBreakerStrategy($strategy);
```

### Beispiel #2 Circuit Breaker deaktivieren

```php
<?php

use Async\Pool;

// Strategie deaktivieren
$pool->setCircuitBreakerStrategy(null);
```

## Siehe auch

- [Pool::getState](/de/docs/reference/pool/get-state.html) --- Aktueller Circuit-Breaker-Zustand
- [Pool::activate](/de/docs/reference/pool/activate.html) --- Erzwungene Aktivierung
- [Pool::deactivate](/de/docs/reference/pool/deactivate.html) --- Erzwungene Deaktivierung
- [Pool::recover](/de/docs/reference/pool/recover.html) --- In den Wiederherstellungsmodus wechseln
