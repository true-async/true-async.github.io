---
layout: docs
lang: de
path_key: "/docs/reference/get-coroutines.html"
nav_active: docs
permalink: /de/docs/reference/get-coroutines.html
page_title: "get_coroutines()"
description: "get_coroutines() — eine Liste aller aktiven Coroutinen fuer Diagnose abrufen."
---

# get_coroutines

(PHP 8.6+, True Async 1.0)

`get_coroutines()` — Gibt ein Array aller aktiven Coroutinen zurueck. Nuetzlich fuer Diagnose und Ueberwachung.

## Beschreibung

```php
get_coroutines(): array
```

## Rueckgabewerte

Ein Array von `Async\Coroutine`-Objekten — alle in der aktuellen Anfrage registrierten Coroutinen.

## Beispiele

### Beispiel #1 Coroutinen ueberwachen

```php
<?php
use function Async\spawn;
use function Async\get_coroutines;
use function Async\delay;

spawn(function() { delay(10000); });
spawn(function() { delay(10000); });

// Coroutinen starten lassen
delay(10);

foreach (get_coroutines() as $coro) {
    echo sprintf(
        "Coroutine #%d: %s, gestartet bei %s\n",
        $coro->getId(),
        $coro->isSuspended() ? 'unterbrochen' : 'laufend',
        $coro->getSpawnLocation()
    );
}
?>
```

### Beispiel #2 Lecks erkennen

```php
<?php
use function Async\get_coroutines;

// Am Ende einer Anfrage auf nicht beendete Coroutinen pruefen
$active = get_coroutines();
if (count($active) > 0) {
    foreach ($active as $coro) {
        error_log("Nicht beendete Coroutine: " . $coro->getSpawnLocation());
    }
}
?>
```

## Siehe auch

- [current_coroutine()](/de/docs/reference/current-coroutine.html) — aktuelle Coroutine
- [Coroutines](/de/docs/components/coroutines.html) — das Coroutine-Konzept
