---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/get-trace.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/get-trace.html
page_title: "Coroutine::getTrace"
description: "Den Aufrufstapel einer unterbrochenen Coroutine abrufen."
---

# Coroutine::getTrace

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getTrace(
    int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT,
    int $limit = 0
): ?array
```

Gibt den Aufrufstapel (Backtrace) einer unterbrochenen Coroutine zurueck. Wenn die Coroutine nicht unterbrochen ist (noch nicht gestartet, gerade ausgefuehrt oder abgeschlossen), wird `null` zurueckgegeben.

## Parameter

**options**
: Eine Bitmaske von Optionen, aehnlich wie bei `debug_backtrace()`:
  - `DEBUG_BACKTRACE_PROVIDE_OBJECT` -- `$this` in den Trace einbeziehen
  - `DEBUG_BACKTRACE_IGNORE_ARGS` -- Funktionsargumente nicht einbeziehen

**limit**
: Maximale Anzahl von Stapelrahmen. `0` -- keine Begrenzung.

## Rueckgabewert

`?array` -- ein Array von Stapelrahmen oder `null`, wenn die Coroutine nicht unterbrochen ist.

## Beispiele

### Beispiel #1 Stapel einer unterbrochenen Coroutine abrufen

```php
<?php

use function Async\spawn;
use function Async\suspend;

function innerFunction() {
    suspend();
}

function outerFunction() {
    innerFunction();
}

$coroutine = spawn(function() {
    outerFunction();
});

suspend(); // Coroutine starten und unterbrechen lassen

$trace = $coroutine->getTrace();

if ($trace !== null) {
    foreach ($trace as $frame) {
        echo ($frame['file'] ?? '?') . ':' . ($frame['line'] ?? '?');
        echo ' ' . ($frame['function'] ?? '') . "\n";
    }
}
```

### Beispiel #2 Trace fuer eine abgeschlossene Coroutine -- null

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "test");

// Vor dem Start -- null
var_dump($coroutine->getTrace()); // NULL

await($coroutine);

// Nach dem Abschluss -- null
var_dump($coroutine->getTrace()); // NULL
```

## Siehe auch

- [Coroutine::isSuspended](/de/docs/reference/coroutine/is-suspended.html) -- Unterbrechung pruefen
- [Coroutine::getSuspendLocation](/de/docs/reference/coroutine/get-suspend-location.html) -- Unterbrechungsort
- [Coroutine::getSpawnLocation](/de/docs/reference/coroutine/get-spawn-location.html) -- Erstellungsort
