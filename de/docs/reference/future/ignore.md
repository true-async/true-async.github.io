---
layout: docs
lang: de
path_key: "/docs/reference/future/ignore.html"
nav_active: docs
permalink: /de/docs/reference/future/ignore.html
page_title: "Future::ignore"
description: "Unbehandelte Fehler nicht an den Event-Loop-Handler weitergeben."
---

# Future::ignore

(PHP 8.6+, True Async 1.0)

```php
public function ignore(): Future
```

Markiert das `Future` als ignoriert. Wenn das Future mit einem Fehler abgeschlossen wird und der Fehler nicht behandelt wird, wird er nicht an den Handler für unbehandelte Ausnahmen des Event-Loops übergeben. Nützlich für "Fire-and-Forget"-Aufgaben, bei denen das Ergebnis keine Rolle spielt.

## Rückgabewert

`Future` — gibt dasselbe Future für Methodenverkettung zurück.

## Beispiele

### Beispiel #1 Future-Fehler ignorieren

```php
<?php

use Async\Future;

// Eine Aufgabe starten, deren Fehler uns nicht interessieren
\Async\async(function() {
    // Diese Operation kann fehlschlagen
    sendAnalytics(['event' => 'page_view']);
})->ignore();

// Der Fehler wird nicht an den Event-Loop-Handler weitergegeben
```

### Beispiel #2 Ignore mit Methodenverkettung verwenden

```php
<?php

use Async\Future;

function warmupCache(array $keys): void {
    foreach ($keys as $key) {
        \Async\async(function() use ($key) {
            $data = loadFromDatabase($key);
            saveToCache($key, $data);
        })->ignore(); // Cache-Fehler sind nicht kritisch
    }
}

warmupCache(['user:1', 'user:2', 'user:3']);
```

## Siehe auch

- [Future::catch](/de/docs/reference/future/catch.html) — Einen Future-Fehler behandeln
- [Future::finally](/de/docs/reference/future/finally.html) — Callback bei Future-Abschluss
