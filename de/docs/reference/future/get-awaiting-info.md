---
layout: docs
lang: de
path_key: "/docs/reference/future/get-awaiting-info.html"
nav_active: docs
permalink: /de/docs/reference/future/get-awaiting-info.html
page_title: "Future::getAwaitingInfo"
description: "Debug-Informationen über wartende Coroutinen."
---

# Future::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public function getAwaitingInfo(): array
```

Gibt Debug-Informationen über Coroutinen zurück, die derzeit auf den Abschluss dieses `Future` warten. Nützlich zur Diagnose von Deadlocks und zur Analyse von Abhängigkeiten zwischen Coroutinen.

## Rückgabewert

`array` — ein Array mit Informationen über wartende Coroutinen.

## Beispiele

### Beispiel #1 Informationen über Wartende abrufen

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Mehrere Coroutinen starten, die auf ein Future warten
\Async\async(function() use ($future) {
    $future->await();
});

\Async\async(function() use ($future) {
    $future->await();
});

// Den Coroutinen Zeit geben, um in den Wartezustand zu wechseln
\Async\delay(10);

$info = $future->getAwaitingInfo();
var_dump($info);
// Array mit Informationen über wartende Coroutinen

$state->complete("done");
```

## Siehe auch

- [Future::getCreatedFileAndLine](/de/docs/reference/future/get-created-file-and-line.html) — Erstellungsort des Future
- [Future::getCreatedLocation](/de/docs/reference/future/get-created-location.html) — Erstellungsort als Zeichenkette
- [Future::await](/de/docs/reference/future/await.html) — Das Ergebnis abwarten
