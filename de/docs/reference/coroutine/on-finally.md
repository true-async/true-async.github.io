---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/on-finally.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/on-finally.html
page_title: "Coroutine::finally"
description: "Einen Handler registrieren, der beim Abschluss der Coroutine aufgerufen wird."
---

# Coroutine::finally

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::finally(\Closure $callback): void
```

Registriert eine Callback-Funktion, die beim Abschluss der Coroutine aufgerufen wird, unabhaengig vom Ergebnis (Erfolg, Fehler oder Abbruch).

Wenn die Coroutine zum Zeitpunkt des `finally()`-Aufrufs bereits abgeschlossen ist, wird der Callback sofort ausgefuehrt.

Es koennen mehrere Handler registriert werden -- sie werden in der Reihenfolge ausgefuehrt, in der sie hinzugefuegt wurden.

## Parameter

**callback**
: Die Handler-Funktion. Erhaelt das Coroutine-Objekt als Argument.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

$coroutine->finally(function() {
    echo "Coroutine abgeschlossen\n";
});

await($coroutine);
```

### Beispiel #2 Ressourcenbereinigung

```php
<?php

use function Async\spawn;
use function Async\await;

$connection = connectToDatabase();

$coroutine = spawn(function() use ($connection) {
    return $connection->query('SELECT * FROM users');
});

$coroutine->finally(function() use ($connection) {
    $connection->close();
    echo "Verbindung geschlossen\n";
});

$result = await($coroutine);
```

### Beispiel #3 Mehrere Handler

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "done");

$coroutine->finally(fn() => echo "Handler 1\n");
$coroutine->finally(fn() => echo "Handler 2\n");
$coroutine->finally(fn() => echo "Handler 3\n");

await($coroutine);
// Ausgabe:
// Handler 1
// Handler 2
// Handler 3
```

### Beispiel #4 Registrierung nach Abschluss

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => 42);
await($coroutine);

// Coroutine bereits abgeschlossen -- Callback wird sofort ausgefuehrt
$coroutine->finally(function() {
    echo "Sofort aufgerufen\n";
});
```

## Siehe auch

- [Coroutine::isCompleted](/de/docs/reference/coroutine/is-completed.html) -- Abschluss pruefen
- [Coroutine::getResult](/de/docs/reference/coroutine/get-result.html) -- Das Ergebnis abrufen
