---
layout: docs
lang: de
path_key: "/docs/reference/scope/is-finished.html"
nav_active: docs
permalink: /de/docs/reference/scope/is-finished.html
page_title: "Scope::isFinished"
description: "Prueft, ob der Scope beendet ist."
---

# Scope::isFinished

(PHP 8.6+, True Async 1.0)

```php
public function isFinished(): bool
```

Prueft, ob alle Koroutinen im Scope beendet sind. Ein Scope gilt als beendet, wenn alle seine Koroutinen (einschliesslich Kind-Scopes) die Ausfuehrung abgeschlossen haben.

## Rueckgabewert

`bool` — `true`, wenn alle Scope-Koroutinen beendet sind, andernfalls `false`.

## Beispiele

### Beispiel #1 Scope-Abschluss pruefen

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
});

var_dump($scope->isFinished()); // bool(false)

$scope->awaitCompletion();

var_dump($scope->isFinished()); // bool(true)
```

## Siehe auch

- [Scope::isClosed](/de/docs/reference/scope/is-closed.html) — Pruefen, ob der Scope geschlossen ist
- [Scope::isCancelled](/de/docs/reference/scope/is-cancelled.html) — Pruefen, ob der Scope abgebrochen wurde
- [Scope::awaitCompletion](/de/docs/reference/scope/await-completion.html) — Auf Abschluss der Koroutinen warten
