---
layout: docs
lang: de
path_key: "/docs/reference/scope/dispose-after-timeout.html"
nav_active: docs
permalink: /de/docs/reference/scope/dispose-after-timeout.html
page_title: "Scope::disposeAfterTimeout"
description: "Schliesst den Scope nach einem angegebenen Timeout."
---

# Scope::disposeAfterTimeout

(PHP 8.6+, True Async 1.0)

```php
public function disposeAfterTimeout(int $timeout): void
```

Plant das Schliessen des Scopes nach einem angegebenen Timeout. Wenn das Timeout ablaeuft, wird `dispose()` aufgerufen, wodurch alle Koroutinen abgebrochen und der Scope geschlossen wird. Dies ist praktisch, um eine maximale Scope-Lebensdauer festzulegen.

## Parameter

`timeout` — Zeit in Millisekunden, bevor der Scope automatisch geschlossen wird.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Ausfuehrungszeit begrenzen

```php
<?php

use Async\Scope;

$scope = new Scope();

// Scope wird nach 10 Sekunden geschlossen
$scope->disposeAfterTimeout(10_000);

$scope->spawn(function() {
    try {
        // Lange Operation
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Aufgabe durch Scope-Timeout abgebrochen\n";
    }
});

$scope->awaitCompletion();
```

### Beispiel #2 Scope mit begrenzter Lebensdauer

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->disposeAfterTimeout(5000); // 5 Sekunden fuer alle Arbeiten

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Aufgabe 1: OK\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Aufgabe 2: OK\n";
});

$scope->spawn(function() {
    \Async\delay(30_000); // Wird nicht rechtzeitig fertig
    echo "Aufgabe 3: OK\n"; // Wird nicht ausgegeben
});

$scope->awaitCompletion();
```

## Siehe auch

- [Scope::dispose](/de/docs/reference/scope/dispose.html) — Sofortiges Schliessen des Scopes
- [Scope::disposeSafely](/de/docs/reference/scope/dispose-safely.html) — Sicheres Schliessen des Scopes
- [timeout()](/de/docs/reference/timeout.html) — Globale Timeout-Funktion
