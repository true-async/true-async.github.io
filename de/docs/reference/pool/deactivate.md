---
layout: docs
lang: de
path_key: "/docs/reference/pool/deactivate.html"
nav_active: docs
permalink: /de/docs/reference/pool/deactivate.html
page_title: "Pool::deactivate"
description: "Den Pool erzwungen in den INACTIVE-Zustand versetzen."
---

# Pool::deactivate

(PHP 8.6+, True Async 1.0)

```php
public Pool::deactivate(): void
```

Versetzt den Pool erzwungen in den `INACTIVE`-Zustand. In diesem Zustand
lehnt der Pool alle Anfragen zum Ressourcenerwerb ab. Wird fuer die manuelle
Deaktivierung verwendet, wenn Probleme mit einem externen Dienst erkannt werden.

Im Gegensatz zu `close()` ist die Deaktivierung reversibel --- der Pool kann ueber
`activate()` oder `recover()` wieder in einen funktionsfaehigen Zustand versetzt werden.

## Parameter

Diese Methode nimmt keine Parameter entgegen.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Deaktivierung bei Problemerkennung

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Bei Erkennung eines kritischen Fehlers
try {
    $client = $pool->acquire();
    $response = $client->get('/critical-endpoint');
    $pool->release($client);
} catch (ServiceUnavailableException $e) {
    $pool->deactivate();
    echo "Dienst nicht verfuegbar, Pool deaktiviert\n";
}
```

### Beispiel #2 Geplante Wartung

```php
<?php

use Async\Pool;

function startMaintenance(Pool $pool): void
{
    $pool->deactivate();
    echo "Pool fuer Wartung deaktiviert\n";
}

function endMaintenance(Pool $pool): void
{
    $pool->activate();
    echo "Wartung abgeschlossen, Pool aktiviert\n";
}
```

## Siehe auch

- [Pool::activate](/de/docs/reference/pool/activate.html) --- In den ACTIVE-Zustand wechseln
- [Pool::recover](/de/docs/reference/pool/recover.html) --- In den RECOVERING-Zustand wechseln
- [Pool::getState](/de/docs/reference/pool/get-state.html) --- Aktueller Zustand
- [Pool::close](/de/docs/reference/pool/close.html) --- Dauerhafte Schliessung des Pools (irreversibel)
