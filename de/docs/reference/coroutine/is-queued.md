---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/is-queued.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/is-queued.html
page_title: "Coroutine::isQueued"
description: "Pruefen, ob sich die Coroutine in der Scheduler-Warteschlange befindet."
---

# Coroutine::isQueued

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isQueued(): bool
```

Prueft, ob sich die Coroutine in der Scheduler-Warteschlange zur Ausfuehrung befindet.

## Rueckgabewert

`bool` -- `true`, wenn sich die Coroutine in der Warteschlange befindet.

## Beispiele

### Beispiel #1 Warteschlangenstatus

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

var_dump($coroutine->isQueued()); // bool(true) -- wartet auf den Start

suspend(); // Scheduler die Coroutine starten lassen

// Coroutine gestartet, bleibt aber nach internem suspend() in der Warteschlange
var_dump($coroutine->isStarted()); // bool(true)
```

## Siehe auch

- [Coroutine::isStarted](/de/docs/reference/coroutine/is-started.html) -- Pruefen, ob gestartet
- [Coroutine::isSuspended](/de/docs/reference/coroutine/is-suspended.html) -- Unterbrechung pruefen
