---
layout: docs
lang: de
path_key: "/docs/reference/future/is-cancelled.html"
nav_active: docs
permalink: /de/docs/reference/future/is-cancelled.html
page_title: "Future::isCancelled"
description: "Prüfen, ob das Future abgebrochen wurde."
---

# Future::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Prüft, ob das `Future` abgebrochen wurde. Ein Future gilt als abgebrochen, nachdem die Methode `cancel()` aufgerufen wurde.

## Rückgabewert

`bool` — `true`, wenn das Future abgebrochen wurde, andernfalls `false`.

## Beispiele

### Beispiel #1 Future-Abbruch prüfen

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCancelled()); // bool(false)

$future->cancel();

var_dump($future->isCancelled()); // bool(true)
var_dump($future->isCompleted()); // bool(true)
```

### Beispiel #2 Unterschied zwischen Abschluss und Abbruch

```php
<?php

use Async\Future;

$completed = Future::completed("result");
var_dump($completed->isCancelled()); // bool(false)
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCancelled()); // bool(false)
var_dump($failed->isCompleted()); // bool(true)
```

## Siehe auch

- [Future::cancel](/de/docs/reference/future/cancel.html) — Das Future abbrechen
- [Future::isCompleted](/de/docs/reference/future/is-completed.html) — Prüfen, ob das Future abgeschlossen ist
