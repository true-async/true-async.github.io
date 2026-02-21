---
layout: docs
lang: de
path_key: "/docs/reference/current-coroutine.html"
nav_active: docs
permalink: /de/docs/reference/current-coroutine.html
page_title: "current_coroutine()"
description: "current_coroutine() — das Objekt der aktuell ausgefuehrten Coroutine abrufen."
---

# current_coroutine

(PHP 8.6+, True Async 1.0)

`current_coroutine()` — Gibt das Objekt der aktuell ausgefuehrten Coroutine zurueck.

## Beschreibung

```php
current_coroutine(): Async\Coroutine
```

## Rueckgabewerte

Ein `Async\Coroutine`-Objekt, das die aktuelle Coroutine repraesentiert.

## Fehler/Ausnahmen

`Async\AsyncException` — wenn ausserhalb einer Coroutine aufgerufen.

## Beispiele

### Beispiel #1 Coroutine-ID abrufen

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();
    echo "Coroutine #" . $coro->getId() . "\n";
});
?>
```

### Beispiel #2 Diagnose

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();

    echo "Gestartet von: " . $coro->getSpawnLocation() . "\n";
    echo "Status: " . ($coro->isRunning() ? 'laufend' : 'unterbrochen') . "\n";
});
?>
```

## Siehe auch

- [get_coroutines()](/de/docs/reference/get-coroutines.html) — Liste aller Coroutinen
- [Coroutines](/de/docs/components/coroutines.html) — das Coroutine-Konzept
