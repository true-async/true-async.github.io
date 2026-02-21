---
layout: docs
lang: de
path_key: "/docs/reference/future/is-completed.html"
nav_active: docs
permalink: /de/docs/reference/future/is-completed.html
page_title: "Future::isCompleted"
description: "Prüfen, ob das Future abgeschlossen ist."
---

# Future::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public function isCompleted(): bool
```

Prüft, ob das `Future` abgeschlossen ist. Ein Future gilt als abgeschlossen, wenn es ein Ergebnis, einen Fehler enthält oder abgebrochen wurde.

## Rückgabewert

`bool` — `true`, wenn das Future abgeschlossen ist (erfolgreich, mit Fehler oder abgebrochen), andernfalls `false`.

## Beispiele

### Beispiel #1 Future-Abschluss prüfen

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCompleted()); // bool(false)

$state->complete(42);

var_dump($future->isCompleted()); // bool(true)
```

### Beispiel #2 Statische Factory-Methoden prüfen

```php
<?php

use Async\Future;

$completed = Future::completed("done");
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCompleted()); // bool(true)
```

## Siehe auch

- [Future::isCancelled](/de/docs/reference/future/is-cancelled.html) — Prüfen, ob das Future abgebrochen ist
- [Future::await](/de/docs/reference/future/await.html) — Das Future-Ergebnis abwarten
