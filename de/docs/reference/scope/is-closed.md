---
layout: docs
lang: de
path_key: "/docs/reference/scope/is-closed.html"
nav_active: docs
permalink: /de/docs/reference/scope/is-closed.html
page_title: "Scope::isClosed"
description: "Prueft, ob der Scope geschlossen ist."
---

# Scope::isClosed

(PHP 8.6+, True Async 1.0)

```php
public function isClosed(): bool
```

Prueft, ob der Scope geschlossen ist. Ein Scope gilt als geschlossen nach einem Aufruf von `dispose()` oder `disposeSafely()`. Einem geschlossenen Scope koennen keine neuen Koroutinen hinzugefuegt werden.

## Rueckgabewert

`bool` — `true`, wenn der Scope geschlossen ist, andernfalls `false`.

## Beispiele

### Beispiel #1 Scope-Zustand pruefen

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isClosed()); // bool(false)

$scope->dispose();

var_dump($scope->isClosed()); // bool(true)
```

### Beispiel #2 Schutz vor Hinzufuegen zu einem geschlossenen Scope

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->dispose();

if (!$scope->isClosed()) {
    $scope->spawn(function() {
        echo "Diese Koroutine wird nicht erstellt\n";
    });
} else {
    echo "Scope ist bereits geschlossen\n";
}
```

## Siehe auch

- [Scope::isFinished](/de/docs/reference/scope/is-finished.html) — Pruefen, ob der Scope beendet ist
- [Scope::isCancelled](/de/docs/reference/scope/is-cancelled.html) — Pruefen, ob der Scope abgebrochen wurde
- [Scope::dispose](/de/docs/reference/scope/dispose.html) — Den Scope schliessen
