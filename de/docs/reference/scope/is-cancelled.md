---
layout: docs
lang: de
path_key: "/docs/reference/scope/is-cancelled.html"
nav_active: docs
permalink: /de/docs/reference/scope/is-cancelled.html
page_title: "Scope::isCancelled"
description: "Prueft, ob der Scope abgebrochen wurde."
---

# Scope::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Prueft, ob der Scope abgebrochen wurde. Ein Scope wird nach einem Aufruf von `cancel()` oder `dispose()` als abgebrochen markiert.

## Rueckgabewert

`bool` — `true`, wenn der Scope abgebrochen wurde, andernfalls `false`.

## Beispiele

### Beispiel #1 Scope-Abbruch pruefen

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isCancelled()); // bool(false)

$scope->cancel();

var_dump($scope->isCancelled()); // bool(true)
```

## Siehe auch

- [Scope::cancel](/de/docs/reference/scope/cancel.html) — Den Scope abbrechen
- [Scope::isFinished](/de/docs/reference/scope/is-finished.html) — Pruefen, ob der Scope beendet ist
- [Scope::isClosed](/de/docs/reference/scope/is-closed.html) — Pruefen, ob der Scope geschlossen ist
