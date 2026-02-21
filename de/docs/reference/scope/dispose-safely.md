---
layout: docs
lang: de
path_key: "/docs/reference/scope/dispose-safely.html"
nav_active: docs
permalink: /de/docs/reference/scope/dispose-safely.html
page_title: "Scope::disposeSafely"
description: "Schliesst den Scope sicher — Koroutinen werden zu Zombies."
---

# Scope::disposeSafely

(PHP 8.6+, True Async 1.0)

```php
public function disposeSafely(): void
```

Schliesst den Scope sicher. Aktive Koroutinen werden **nicht abgebrochen**, sondern werden zu Zombie-Koroutinen: Sie laufen weiter, aber der Scope gilt als geschlossen. Zombie-Koroutinen werden von selbst beendet, wenn sie ihre Arbeit abgeschlossen haben.

Wenn der Scope ueber `asNotSafely()` als "nicht sicher" markiert ist, werden Koroutinen abgebrochen, anstatt zu Zombies zu werden.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(5000);
    echo "Aufgabe als Zombie abgeschlossen\n";
});

// Scope ist geschlossen, aber die Koroutine laeuft weiter
$scope->disposeSafely();

var_dump($scope->isClosed()); // bool(true)
// Koroutine wird im Hintergrund weiter ausgefuehrt
```

### Beispiel #2 Geordnetes Herunterfahren mit Zombie-Warten

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Hintergrundaufgabe abgeschlossen\n";
});

$scope->disposeSafely();

// Auf Zombie-Koroutinen warten
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie-Fehler: " . $e->getMessage());
    }
);
```

## Siehe auch

- [Scope::dispose](/de/docs/reference/scope/dispose.html) — Erzwungenes Schliessen des Scopes
- [Scope::asNotSafely](/de/docs/reference/scope/as-not-safely.html) — Zombie-Verhalten deaktivieren
- [Scope::awaitAfterCancellation](/de/docs/reference/scope/await-after-cancellation.html) — Auf Zombie-Koroutinen warten
