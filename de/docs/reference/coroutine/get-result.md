---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/get-result.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/get-result.html
page_title: "Coroutine::getResult"
description: "Das Ergebnis der Coroutine-Ausfuehrung abrufen."
---

# Coroutine::getResult

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getResult(): mixed
```

Gibt das Ergebnis der Coroutine-Ausfuehrung zurueck. Wenn die Coroutine noch nicht abgeschlossen ist, wird `null` zurueckgegeben.

**Wichtig:** Diese Methode wartet nicht auf den Abschluss der Coroutine. Verwenden Sie `await()` zum Warten.

## Rueckgabewert

`mixed` -- das Coroutine-Ergebnis oder `null`, wenn die Coroutine noch nicht abgeschlossen ist.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

// Vor dem Abschluss
var_dump($coroutine->getResult()); // NULL

// Auf Abschluss warten
await($coroutine);

var_dump($coroutine->getResult()); // string(11) "test result"
```

### Beispiel #2 Pruefung mit isCompleted()

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(fn() => 42);

suspend(); // Coroutine abschliessen lassen

if ($coroutine->isCompleted()) {
    echo "Ergebnis: " . $coroutine->getResult() . "\n";
}
```

## Siehe auch

- [Coroutine::getException](/de/docs/reference/coroutine/get-exception.html) -- Die Ausnahme abrufen
- [Coroutine::isCompleted](/de/docs/reference/coroutine/is-completed.html) -- Abschluss pruefen
- [await()](/de/docs/reference/await.html) -- Auf das Ergebnis warten
