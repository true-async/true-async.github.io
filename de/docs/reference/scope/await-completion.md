---
layout: docs
lang: de
path_key: "/docs/reference/scope/await-completion.html"
nav_active: docs
permalink: /de/docs/reference/scope/await-completion.html
page_title: "Scope::awaitCompletion"
description: "Wartet auf den Abschluss aktiver Koroutinen im Scope."
---

# Scope::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public function awaitCompletion(Awaitable $cancellation): void
```

Wartet auf den Abschluss aller **aktiven** Koroutinen im Scope. Zombie-Koroutinen werden beim Warten nicht beruecksichtigt. Der Parameter `$cancellation` ermoeglicht ein vorzeitiges Unterbrechen des Wartens.

## Parameter

`cancellation` — ein `Awaitable`-Objekt, das beim Ausloesen das Warten unterbricht.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Auf alle Koroutinen warten

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Aufgabe 1 abgeschlossen\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Aufgabe 2 abgeschlossen\n";
});

// Mit einem 5-Sekunden-Timeout auf Abschluss warten
$scope->awaitCompletion(timeout(5000));
echo "Alle Aufgaben erledigt\n";
```

### Beispiel #2 Warten unterbrechen

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(60_000); // Sehr lange Aufgabe
});

try {
    $scope->awaitCompletion(timeout(3000));
} catch (\Async\CancelledException $e) {
    echo "Warten durch Timeout unterbrochen\n";
    $scope->cancel();
}
```

## Siehe auch

- [Scope::awaitAfterCancellation](/de/docs/reference/scope/await-after-cancellation.html) — Auf alle Koroutinen einschliesslich Zombies warten
- [Scope::cancel](/de/docs/reference/scope/cancel.html) — Alle Koroutinen abbrechen
- [Scope::isFinished](/de/docs/reference/scope/is-finished.html) — Pruefen, ob der Scope beendet ist
