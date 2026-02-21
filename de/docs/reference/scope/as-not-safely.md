---
layout: docs
lang: de
path_key: "/docs/reference/scope/as-not-safely.html"
nav_active: docs
permalink: /de/docs/reference/scope/as-not-safely.html
page_title: "Scope::asNotSafely"
description: "Markiert den Scope als nicht sicher — Koroutinen werden abgebrochen, statt zu Zombies zu werden."
---

# Scope::asNotSafely

(PHP 8.6+, True Async 1.0)

```php
public function asNotSafely(): Scope
```

Markiert den Scope als "nicht sicher". Wenn `disposeSafely()` auf einem solchen Scope aufgerufen wird, werden die Koroutinen **nicht** zu Zombies, sondern erhalten ein Abbruchsignal. Dies ist nuetzlich fuer Hintergrundaufgaben, die keine garantierte Fertigstellung erfordern.

Die Methode gibt dasselbe Scope-Objekt zurueck und ermoeglicht so Methodenverkettung (Fluent Interface).

## Rueckgabewert

`Scope` — dasselbe Scope-Objekt (fuer Methodenverkettung).

## Beispiele

### Beispiel #1 Scope fuer Hintergrundaufgaben

```php
<?php

use Async\Scope;

$scope = (new Scope())->asNotSafely();

$scope->spawn(function() {
    while (true) {
        // Hintergrundaufgabe: Cache-Bereinigung
        cleanExpiredCache();
        \Async\delay(60_000);
    }
});

// Bei disposeSafely() werden Koroutinen abgebrochen, statt zu Zombies zu werden
$scope->disposeSafely();
```

### Beispiel #2 Verwendung mit inherit

```php
<?php

use Async\Scope;

$parentScope = new Scope();
$bgScope = Scope::inherit($parentScope)->asNotSafely();

$bgScope->spawn(function() {
    echo "Hintergrundprozess\n";
    \Async\delay(10_000);
});

// Beim Schliessen: Koroutinen werden abgebrochen, nicht in Zombies verwandelt
$bgScope->disposeSafely();
```

## Siehe auch

- [Scope::disposeSafely](/de/docs/reference/scope/dispose-safely.html) — Den Scope sicher schliessen
- [Scope::dispose](/de/docs/reference/scope/dispose.html) — Den Scope erzwungen schliessen
- [Scope::cancel](/de/docs/reference/scope/cancel.html) — Alle Koroutinen abbrechen
