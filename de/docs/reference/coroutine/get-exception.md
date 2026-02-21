---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/get-exception.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/get-exception.html
page_title: "Coroutine::getException"
description: "Die in einer Coroutine aufgetretene Ausnahme abrufen."
---

# Coroutine::getException

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getException(): mixed
```

Gibt die in der Coroutine aufgetretene Ausnahme zurueck. Wenn die Coroutine erfolgreich abgeschlossen wurde oder noch nicht abgeschlossen ist, wird `null` zurueckgegeben. Wenn die Coroutine abgebrochen wurde, wird ein `AsyncCancellation`-Objekt zurueckgegeben.

## Rueckgabewert

`mixed` -- die Ausnahme oder `null`.

- `null` -- wenn die Coroutine nicht abgeschlossen wurde oder erfolgreich abgeschlossen wurde
- `Throwable` -- wenn die Coroutine mit einem Fehler abgeschlossen wurde
- `AsyncCancellation` -- wenn die Coroutine abgebrochen wurde

## Fehler

Wirft `RuntimeException`, wenn die Coroutine gerade ausgefuehrt wird.

## Beispiele

### Beispiel #1 Erfolgreicher Abschluss

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "success";
});

await($coroutine);
var_dump($coroutine->getException()); // NULL
```

### Beispiel #2 Abschluss mit Fehler

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    throw new RuntimeException("Testfehler");
});

try {
    await($coroutine);
} catch (RuntimeException $e) {
    // Waehrend await abgefangen
}

$exception = $coroutine->getException();
var_dump($exception instanceof RuntimeException); // bool(true)
var_dump($exception->getMessage());                // string(10) "Testfehler"
```

### Beispiel #3 Abgebrochene Coroutine

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();
$coroutine->cancel();
suspend();

$exception = $coroutine->getException();
var_dump($exception instanceof \Async\AsyncCancellation); // bool(true)
```

## Siehe auch

- [Coroutine::getResult](/de/docs/reference/coroutine/get-result.html) -- Das Ergebnis abrufen
- [Coroutine::isCancelled](/de/docs/reference/coroutine/is-cancelled.html) -- Abbruch pruefen
- [Exceptions](/de/docs/components/exceptions.html) -- Fehlerbehandlung
