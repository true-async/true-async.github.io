---
layout: docs
lang: de
path_key: "/docs/reference/pool/recover.html"
nav_active: docs
permalink: /de/docs/reference/pool/recover.html
page_title: "Pool::recover"
description: "Den Pool in den RECOVERING-Zustand versetzen."
---

# Pool::recover

(PHP 8.6+, True Async 1.0)

```php
public Pool::recover(): void
```

Versetzt den Pool in den `RECOVERING`-Zustand. In diesem Zustand laesst der Pool
eine begrenzte Anzahl von Anfragen durch, um die Dienstverfuegbarkeit zu pruefen.
Wenn die Anfragen erfolgreich sind, wechselt der Circuit Breaker automatisch
den Pool in den `ACTIVE`-Zustand. Wenn die Anfragen weiterhin fehlschlagen,
kehrt der Pool zu `INACTIVE` zurueck.

## Parameter

Diese Methode nimmt keine Parameter entgegen.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Wiederherstellungsversuch

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Pool ist deaktiviert, Wiederherstellung versuchen
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    $pool->recover();
    echo "Pool in Wiederherstellungsmodus gewechselt\n";
    // Circuit Breaker laesst Testanfragen durch
}
```

### Beispiel #2 Periodische Wiederherstellungsversuche

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

spawn(function() use ($pool) {
    while (!$pool->isClosed()) {
        if ($pool->getState() === CircuitBreakerState::INACTIVE) {
            $pool->recover();
        }

        suspend(delay: 10000); // alle 10 Sekunden pruefen
    }
});
```

## Siehe auch

- [Pool::activate](/de/docs/reference/pool/activate.html) --- Erzwungene Aktivierung
- [Pool::deactivate](/de/docs/reference/pool/deactivate.html) --- Erzwungene Deaktivierung
- [Pool::getState](/de/docs/reference/pool/get-state.html) --- Aktueller Zustand
- [Pool::setCircuitBreakerStrategy](/de/docs/reference/pool/set-circuit-breaker-strategy.html) --- Strategie konfigurieren
