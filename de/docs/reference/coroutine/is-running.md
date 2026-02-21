---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/is-running.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/is-running.html
page_title: "Coroutine::isRunning"
description: "Pruefen, ob die Coroutine gerade ausgefuehrt wird."
---

# Coroutine::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isRunning(): bool
```

Prueft, ob die Coroutine gerade ausgefuehrt wird. Eine Coroutine gilt als laufend, wenn sie gestartet wurde und noch nicht abgeschlossen ist.

## Rueckgabewert

`bool` -- `true`, wenn die Coroutine laeuft und nicht abgeschlossen ist.

## Beispiele

### Beispiel #1 Ausfuehrungsstatus pruefen

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    // Innerhalb der Coroutine ist isRunning() == true
    var_dump(\Async\current_coroutine()->isRunning()); // bool(true)
    return "done";
});

// Ausserhalb -- Coroutine ist unterbrochen oder noch nicht gestartet
var_dump($coroutine->isRunning()); // bool(false)
```

## Siehe auch

- [Coroutine::isStarted](/de/docs/reference/coroutine/is-started.html) -- Pruefen, ob gestartet
- [Coroutine::isSuspended](/de/docs/reference/coroutine/is-suspended.html) -- Unterbrechung pruefen
- [Coroutine::isCompleted](/de/docs/reference/coroutine/is-completed.html) -- Abschluss pruefen
