---
layout: docs
lang: de
path_key: "/docs/reference/context/find.html"
nav_active: docs
permalink: /de/docs/reference/context/find.html
page_title: "Context::find"
description: "Einen Wert anhand des Schluessels im aktuellen oder uebergeordneten Kontext suchen."
---

# Context::find

(PHP 8.6+, True Async 1.0)

```php
public Context::find(string|object $key): mixed
```

Sucht einen Wert anhand des Schluessels im aktuellen Kontext. Wenn der Schluessel nicht gefunden wird, wird die Suche
in der Hierarchie der uebergeordneten Kontexte fortgesetzt. Gibt `null` zurueck, wenn der Wert auf keiner Ebene gefunden wird.

Dies ist eine sichere Suchmethode: Sie wirft niemals eine Exception, wenn ein Schluessel fehlt.

## Parameter

**key**
: Der zu suchende Schluessel. Kann ein String oder ein Objekt sein.
  Bei Verwendung eines Objekts als Schluessel wird die Suche anhand der Objektreferenz durchgefuehrt.

## Rueckgabewert

Der mit dem Schluessel verknuepfte Wert oder `null`, wenn der Schluessel im aktuellen
oder einem uebergeordneten Kontext nicht gefunden wird.

## Beispiele

### Beispiel #1 Suche nach einem Wert mit String-Schluessel

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Kind-Koroutine findet Wert aus dem Eltern-Kontext
    $id = current_context()->find('request_id');
    echo $id . "\n"; // "abc-123"

    // Suche nach einem nicht existierenden Schluessel gibt null zurueck
    $missing = current_context()->find('nonexistent');
    var_dump($missing); // NULL
});
```

### Beispiel #2 Suche nach einem Wert mit Objekt-Schluessel

```php
<?php

use function Async\current_context;
use function Async\spawn;

$loggerKey = new stdClass();

current_context()->set($loggerKey, new MyLogger());

spawn(function() use ($loggerKey) {
    // Suche anhand der Objekt-Schluessel-Referenz
    $logger = current_context()->find($loggerKey);
    $logger->info('Nachricht aus Kind-Koroutine');
});
```

### Beispiel #3 Hierarchische Suche

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Root-Ebene
current_context()->set('app_name', 'MyApp');

spawn(function() {
    // Ebene 1: eigenen Wert hinzufuegen
    current_context()->set('user_id', 42);

    spawn(function() {
        // Ebene 2: Werte von allen Ebenen suchen
        echo current_context()->find('user_id') . "\n";   // 42
        echo current_context()->find('app_name') . "\n";  // "MyApp"
    });
});
```

## Siehe auch

- [Context::get](/de/docs/reference/context/get.html) --- Wert abrufen (wirft Exception, wenn nicht vorhanden)
- [Context::has](/de/docs/reference/context/has.html) --- Pruefen, ob ein Schluessel existiert
- [Context::findLocal](/de/docs/reference/context/find-local.html) --- Nur im lokalen Kontext suchen
- [Context::set](/de/docs/reference/context/set.html) --- Wert im Kontext setzen
