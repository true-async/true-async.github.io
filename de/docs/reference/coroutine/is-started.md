---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/is-started.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/is-started.html
page_title: "Coroutine::isStarted"
description: "Pruefen, ob die Coroutine vom Scheduler gestartet wurde."
---

# Coroutine::isStarted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isStarted(): bool
```

Prueft, ob die Coroutine vom Scheduler gestartet wurde. Eine Coroutine gilt als gestartet, nachdem der Scheduler ihre Ausfuehrung begonnen hat.

## Rueckgabewert

`bool` -- `true`, wenn die Coroutine gestartet wurde.

## Beispiele

### Beispiel #1 Vor und nach dem Start pruefen

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isStarted()); // bool(false) -- noch in der Warteschlange

suspend(); // Scheduler die Coroutine starten lassen

var_dump($coroutine->isStarted()); // bool(true)

await($coroutine);

var_dump($coroutine->isStarted()); // bool(true) -- nach dem Abschluss immer noch true
```

## Siehe auch

- [Coroutine::isQueued](/de/docs/reference/coroutine/is-queued.html) -- Warteschlangenstatus pruefen
- [Coroutine::isRunning](/de/docs/reference/coroutine/is-running.html) -- Pruefen, ob gerade ausgefuehrt
- [Coroutine::isCompleted](/de/docs/reference/coroutine/is-completed.html) -- Abschluss pruefen
