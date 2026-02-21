---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/is-suspended.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/is-suspended.html
page_title: "Coroutine::isSuspended"
description: "Pruefen, ob die Coroutine unterbrochen ist."
---

# Coroutine::isSuspended

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isSuspended(): bool
```

Prueft, ob die Coroutine unterbrochen ist. Eine Coroutine wird unterbrochen, wenn `suspend()` aufgerufen wird, waehrend I/O-Operationen oder beim Warten mit `await()`.

## Rueckgabewert

`bool` -- `true`, wenn die Coroutine unterbrochen ist.

## Beispiele

### Beispiel #1 Unterbrechung pruefen

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

suspend(); // Coroutine starten und unterbrechen lassen

var_dump($coroutine->isSuspended()); // bool(true)
var_dump($coroutine->isStarted());   // bool(true)
var_dump($coroutine->isCompleted()); // bool(false)
```

## Siehe auch

- [Coroutine::isRunning](/de/docs/reference/coroutine/is-running.html) -- Ausfuehrung pruefen
- [Coroutine::getTrace](/de/docs/reference/coroutine/get-trace.html) -- Aufrufstapel einer unterbrochenen Coroutine
- [suspend()](/de/docs/reference/suspend.html) -- Die aktuelle Coroutine unterbrechen
