---
layout: docs
lang: de
path_key: "/docs/reference/context/find-local.html"
nav_active: docs
permalink: /de/docs/reference/context/find-local.html
page_title: "Context::findLocal"
description: "Einen Wert nur im lokalen Kontext suchen (ohne uebergeordnete Kontexte zu durchsuchen)."
---

# Context::findLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::findLocal(string|object $key): mixed
```

Sucht einen Wert anhand des Schluessels **nur** im aktuellen (lokalen) Kontext. Im Gegensatz zu `find()`
durchsucht diese Methode nicht die Hierarchie der uebergeordneten Kontexte.

Gibt `null` zurueck, wenn der Schluessel auf der aktuellen Ebene nicht gefunden wird.

## Parameter

**key**
: Der zu suchende Schluessel. Kann ein String oder ein Objekt sein.

## Rueckgabewert

Der mit dem Schluessel verknuepfte Wert im lokalen Kontext oder `null`, wenn der Schluessel nicht gefunden wird.

## Beispiele

### Beispiel #1 Unterschied zwischen find und findLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('config', 'global_value');

spawn(function() {
    current_context()->set('local_data', 'local_value');

    // find() sucht in der Hierarchie nach oben
    echo current_context()->find('config') . "\n";       // "global_value"

    // findLocal() sucht nur auf der aktuellen Ebene
    echo current_context()->findLocal('local_data') . "\n"; // "local_value"
    var_dump(current_context()->findLocal('config'));        // NULL
});
```

### Beispiel #2 Verwendung mit einem Objekt-Schluessel

```php
<?php

use function Async\current_context;
use function Async\spawn;

$parentKey = new stdClass();
$localKey = new stdClass();

current_context()->set($parentKey, 'parent_value');

spawn(function() use ($parentKey, $localKey) {
    current_context()->set($localKey, 'child_value');

    // Objekt-Schluessel vom Eltern-Kontext ist ueber findLocal nicht sichtbar
    var_dump(current_context()->findLocal($parentKey)); // NULL
    var_dump(current_context()->findLocal($localKey));  // "child_value"
});
```

### Beispiel #3 Ueberschreiben eines Eltern-Werts

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('timeout', 5000);

spawn(function() {
    // Pruefen, ob der Wert lokal ueberschrieben wurde
    if (current_context()->findLocal('timeout') === null) {
        // Vererbten Wert verwenden, kann aber ueberschrieben werden
        current_context()->set('timeout', 3000);
    }

    echo current_context()->findLocal('timeout') . "\n"; // 3000
});
```

## Siehe auch

- [Context::find](/de/docs/reference/context/find.html) --- Suche mit hierarchischer Durchquerung
- [Context::getLocal](/de/docs/reference/context/get-local.html) --- Lokalen Wert abrufen (wirft Exception)
- [Context::hasLocal](/de/docs/reference/context/has-local.html) --- Schluessel im lokalen Kontext pruefen
