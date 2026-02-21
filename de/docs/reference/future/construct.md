---
layout: docs
lang: de
path_key: "/docs/reference/future/construct.html"
nav_active: docs
permalink: /de/docs/reference/future/construct.html
page_title: "Future::__construct"
description: "Ein Future erstellen, das an einen FutureState gebunden ist."
---

# Future::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct(FutureState $state)
```

Erstellt ein neues `Future`, das an ein `FutureState`-Objekt gebunden ist. `FutureState` verwaltet den Zustand des Future und ermöglicht es, es extern mit einem Ergebnis oder Fehler abzuschließen.

## Parameter

`state` — das `FutureState`-Objekt, das den Zustand dieses Future verwaltet.

## Beispiele

### Beispiel #1 Ein Future über FutureState erstellen

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Das Future von einer anderen Coroutine abschließen
\Async\async(function() use ($state) {
    $result = performComputation();
    $state->complete($result);
});

// Das Ergebnis abwarten
$value = $future->await();
echo "Empfangen: $value\n";
```

### Beispiel #2 Ein Future mit verzögertem Ergebnis erstellen

```php
<?php

use Async\Future;
use Async\FutureState;

function createDeferredFuture(): array {
    $state = new FutureState();
    $future = new Future($state);
    return [$future, $state];
}

[$future, $state] = createDeferredFuture();

// Eine Coroutine wartet auf das Ergebnis
\Async\async(function() use ($future) {
    $result = $future->await();
    echo "Ergebnis: $result\n";
});

// Eine andere Coroutine liefert das Ergebnis
\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("Fertig!");
});
```

## Siehe auch

- [Future::completed](/de/docs/reference/future/completed.html) — Ein bereits abgeschlossenes Future erstellen
- [Future::failed](/de/docs/reference/future/failed.html) — Ein Future mit einem Fehler erstellen
