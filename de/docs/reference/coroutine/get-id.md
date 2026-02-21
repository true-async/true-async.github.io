---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/get-id.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/get-id.html
page_title: "Coroutine::getId"
description: "Den eindeutigen Bezeichner einer Coroutine abrufen."
---

# Coroutine::getId

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getId(): int
```

Gibt den eindeutigen ganzzahligen Bezeichner der Coroutine zurueck. Der Bezeichner ist innerhalb des aktuellen PHP-Prozesses eindeutig.

## Rueckgabewert

`int` -- eindeutiger Coroutine-Bezeichner.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use function Async\spawn;

$coroutine1 = spawn(function() {
    return "task 1";
});

$coroutine2 = spawn(function() {
    return "task 2";
});

$id1 = $coroutine1->getId();
$id2 = $coroutine2->getId();

var_dump(is_int($id1));     // bool(true)
var_dump($id1 !== $id2);    // bool(true)
```

### Beispiel #2 Protokollierung mit Bezeichner

```php
<?php

use function Async\spawn;

function loggedTask(string $name): \Async\Coroutine {
    return spawn(function() use ($name) {
        $id = \Async\current_coroutine()->getId();
        echo "[coro:$id] Aufgabe '$name' gestartet\n";
        \Async\delay(1000);
        echo "[coro:$id] Aufgabe '$name' abgeschlossen\n";
    });
}
```

## Siehe auch

- [Coroutine::getSpawnLocation](/de/docs/reference/coroutine/get-spawn-location.html) -- Erstellungsort der Coroutine
- [current_coroutine()](/de/docs/reference/current-coroutine.html) -- Die aktuelle Coroutine abrufen
