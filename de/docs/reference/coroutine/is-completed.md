---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/is-completed.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/is-completed.html
page_title: "Coroutine::isCompleted"
description: "Pruefen, ob die Coroutine abgeschlossen ist."
---

# Coroutine::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCompleted(): bool
```

Prueft, ob die Coroutine die Ausfuehrung beendet hat. Eine Coroutine gilt als abgeschlossen bei erfolgreichem Abschluss, bei Abschluss mit einem Fehler oder bei Abbruch.

## Rueckgabewert

`bool` -- `true`, wenn die Coroutine die Ausfuehrung beendet hat.

## Beispiele

### Beispiel #1 Abschluss pruefen

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isCompleted()); // bool(false)

await($coroutine);

var_dump($coroutine->isCompleted()); // bool(true)
```

### Beispiel #2 Nicht-blockierende Bereitschaftspruefung

```php
<?php

use function Async\spawn;
use function Async\suspend;

$tasks = [
    spawn(fn() => file_get_contents('https://api1.example.com')),
    spawn(fn() => file_get_contents('https://api2.example.com')),
];

// Warten, bis alle abgeschlossen sind
while (true) {
    $allDone = true;
    foreach ($tasks as $task) {
        if (!$task->isCompleted()) {
            $allDone = false;
            break;
        }
    }
    if ($allDone) break;
    suspend();
}
```

## Siehe auch

- [Coroutine::getResult](/de/docs/reference/coroutine/get-result.html) -- Das Ergebnis abrufen
- [Coroutine::getException](/de/docs/reference/coroutine/get-exception.html) -- Die Ausnahme abrufen
- [Coroutine::isCancelled](/de/docs/reference/coroutine/is-cancelled.html) -- Abbruch pruefen
