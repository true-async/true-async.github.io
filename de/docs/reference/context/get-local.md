---
layout: docs
lang: de
path_key: "/docs/reference/context/get-local.html"
nav_active: docs
permalink: /de/docs/reference/context/get-local.html
page_title: "Context::getLocal"
description: "Einen Wert nur aus dem lokalen Kontext abrufen. Wirft eine Exception, wenn nicht gefunden."
---

# Context::getLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::getLocal(string|object $key): mixed
```

Ruft einen Wert anhand des Schluessels **nur** aus dem aktuellen (lokalen) Kontext ab.
Im Gegensatz zu `get()` sucht diese Methode nicht in uebergeordneten Kontexten.

Wenn der Schluessel auf der aktuellen Ebene nicht gefunden wird, wird eine Exception geworfen.

## Parameter

**key**
: Der zu suchende Schluessel. Kann ein String oder ein Objekt sein.

## Rueckgabewert

Der mit dem Schluessel verknuepfte Wert im lokalen Kontext.

## Fehler

- Wirft `Async\ContextException`, wenn der Schluessel im lokalen Kontext nicht gefunden wird.

## Beispiele

### Beispiel #1 Einen lokalen Wert abrufen

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    current_context()->set('task_id', 42);

    // Wert ist lokal gesetzt — getLocal funktioniert
    $taskId = current_context()->getLocal('task_id');
    echo "Aufgabe: {$taskId}\n"; // "Aufgabe: 42"
});
```

### Beispiel #2 Exception beim Zugriff auf einen vererbten Schluessel

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('parent_value', 'hello');

spawn(function() {
    // find() wuerde den Wert im Eltern-Kontext finden
    echo current_context()->find('parent_value') . "\n"; // "hello"

    // getLocal() wirft eine Exception — Wert ist nicht im lokalen Kontext
    try {
        current_context()->getLocal('parent_value');
    } catch (\Async\ContextException $e) {
        echo "Lokal nicht gefunden: " . $e->getMessage() . "\n";
    }
});
```

### Beispiel #3 Verwendung mit einem Objekt-Schluessel

```php
<?php

use function Async\current_context;
use function Async\spawn;

class SessionKey {}

spawn(function() {
    $key = new SessionKey();
    current_context()->set($key, ['user' => 'admin', 'role' => 'superuser']);

    $session = current_context()->getLocal($key);
    echo "Benutzer: " . $session['user'] . "\n"; // "Benutzer: admin"
});
```

## Siehe auch

- [Context::get](/de/docs/reference/context/get.html) --- Wert mit hierarchischer Suche abrufen
- [Context::findLocal](/de/docs/reference/context/find-local.html) --- Sichere Suche im lokalen Kontext
- [Context::hasLocal](/de/docs/reference/context/has-local.html) --- Schluessel im lokalen Kontext pruefen
