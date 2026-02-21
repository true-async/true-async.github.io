---
layout: docs
lang: de
path_key: "/docs/reference/pool/activate.html"
nav_active: docs
permalink: /de/docs/reference/pool/activate.html
page_title: "Pool::activate"
description: "Den Pool erzwungen in den ACTIVE-Zustand versetzen."
---

# Pool::activate

(PHP 8.6+, True Async 1.0)

```php
public Pool::activate(): void
```

Versetzt den Pool erzwungen in den `ACTIVE`-Zustand. Ressourcen stehen wieder
zum Erwerb zur Verfuegung. Wird fuer die manuelle Circuit-Breaker-Verwaltung verwendet, z.B.
nach der Bestaetigung, dass der Dienst wiederhergestellt wurde.

## Parameter

Diese Methode nimmt keine Parameter entgegen.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Manuelle Aktivierung nach Ueberpruefung

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 5
);

// Angenommen, der Pool wurde deaktiviert
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    // Dienstverfuegbarkeit manuell pruefen
    if (checkServiceHealth('https://api.example.com/health')) {
        $pool->activate();
        echo "Pool aktiviert\n";
    }
}
```

### Beispiel #2 Aktivierung durch externes Signal

```php
<?php

use Async\Pool;

// Webhook-Handler vom Ueberwachungssystem
function onServiceRestored(Pool $pool): void
{
    $pool->activate();
    echo "Dienst wiederhergestellt, Pool aktiviert\n";
}
```

## Siehe auch

- [Pool::deactivate](/de/docs/reference/pool/deactivate.html) --- In den INACTIVE-Zustand wechseln
- [Pool::recover](/de/docs/reference/pool/recover.html) --- In den RECOVERING-Zustand wechseln
- [Pool::getState](/de/docs/reference/pool/get-state.html) --- Aktueller Zustand
