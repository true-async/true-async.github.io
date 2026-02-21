---
layout: docs
lang: de
path_key: "/docs/reference/pool/get-state.html"
nav_active: docs
permalink: /de/docs/reference/pool/get-state.html
page_title: "Pool::getState"
description: "Den aktuellen Circuit-Breaker-Zustand abrufen."
---

# Pool::getState

(PHP 8.6+, True Async 1.0)

```php
public Pool::getState(): CircuitBreakerState
```

Gibt den aktuellen Circuit-Breaker-Zustand des Pools zurueck.

## Parameter

Diese Methode nimmt keine Parameter entgegen.

## Rueckgabewert

Ein `CircuitBreakerState`-Enum-Wert:

- `CircuitBreakerState::ACTIVE` --- der Pool arbeitet normal, Ressourcen werden ausgegeben.
- `CircuitBreakerState::INACTIVE` --- der Pool ist deaktiviert, Anfragen werden abgelehnt.
- `CircuitBreakerState::RECOVERING` --- der Pool befindet sich im Wiederherstellungsmodus und laesst
  eine begrenzte Anzahl von Anfragen durch, um die Dienstverfuegbarkeit zu pruefen.

## Beispiele

### Beispiel #1 Pool-Zustand pruefen

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

$state = $pool->getState();

match ($state) {
    CircuitBreakerState::ACTIVE => echo "Pool ist aktiv\n",
    CircuitBreakerState::INACTIVE => echo "Dienst nicht verfuegbar\n",
    CircuitBreakerState::RECOVERING => echo "Wiederherstellung...\n",
};
```

### Beispiel #2 Bedingte Logik basierend auf dem Zustand

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

function makeRequest(Pool $pool, string $endpoint): mixed
{
    if ($pool->getState() === CircuitBreakerState::INACTIVE) {
        // Gecachte Daten verwenden, anstatt den Dienst aufzurufen
        return getCachedResponse($endpoint);
    }

    $client = $pool->acquire(timeout: 3000);

    try {
        return $client->get($endpoint);
    } finally {
        $pool->release($client);
    }
}
```

## Siehe auch

- [Pool::setCircuitBreakerStrategy](/de/docs/reference/pool/set-circuit-breaker-strategy.html) --- Strategie festlegen
- [Pool::activate](/de/docs/reference/pool/activate.html) --- Erzwungene Aktivierung
- [Pool::deactivate](/de/docs/reference/pool/deactivate.html) --- Erzwungene Deaktivierung
- [Pool::recover](/de/docs/reference/pool/recover.html) --- In den Wiederherstellungsmodus wechseln
