---
layout: docs
lang: de
path_key: "/docs/reference/scope/await-after-cancellation.html"
nav_active: docs
permalink: /de/docs/reference/scope/await-after-cancellation.html
page_title: "Scope::awaitAfterCancellation"
description: "Wartet nach dem Abbruch des Scopes auf den Abschluss aller Koroutinen einschliesslich Zombies."
---

# Scope::awaitAfterCancellation

(PHP 8.6+, True Async 1.0)

```php
public function awaitAfterCancellation(
    ?callable $errorHandler = null,
    ?Awaitable $cancellation = null
): void
```

Wartet auf den Abschluss **aller** Koroutinen im Scope, einschliesslich Zombie-Koroutinen. Erfordert einen vorherigen Aufruf von `cancel()`. Diese Methode wird fuer ein geordnetes Beenden des Scopes verwendet, wenn Sie warten muessen, bis alle Koroutinen (einschliesslich Zombies) ihre Arbeit abgeschlossen haben.

## Parameter

`errorHandler` — eine Callback-Funktion zur Behandlung von Zombie-Koroutinen-Fehlern. Akzeptiert ein `\Throwable` als Argument. Wenn `null`, werden Fehler ignoriert.

`cancellation` — ein `Awaitable`-Objekt zum Unterbrechen des Wartens. Wenn `null`, ist das Warten nicht zeitlich begrenzt.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Geordnetes Beenden mit Fehlerbehandlung

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Aufgabe abgeschlossen\n";
});

$scope->spawn(function() {
    \Async\delay(5000);
    throw new \RuntimeException("Fehler bei Hintergrundaufgabe");
});

// Zuerst abbrechen
$scope->cancel();

// Dann auf den Abschluss aller Koroutinen warten
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie-Fehler: " . $e->getMessage());
    }
);
```

### Beispiel #2 Warten mit Timeout

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    // Zombie-Koroutine, die lange zum Beenden braucht
    try {
        \Async\delay(30_000);
    } catch (\Async\CancelledException) {
        // Ressourcenbereinigung
        \Async\delay(2000);
    }
});

$scope->cancel();

$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log($e->getMessage());
    },
    cancellation: timeout(5000)
);
```

## Siehe auch

- [Scope::cancel](/de/docs/reference/scope/cancel.html) — Alle Koroutinen abbrechen
- [Scope::awaitCompletion](/de/docs/reference/scope/await-completion.html) — Auf aktive Koroutinen warten
- [Scope::dispose](/de/docs/reference/scope/dispose.html) — Abbrechen und den Scope schliessen
