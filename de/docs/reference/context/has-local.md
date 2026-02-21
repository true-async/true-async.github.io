---
layout: docs
lang: de
path_key: "/docs/reference/context/has-local.html"
nav_active: docs
permalink: /de/docs/reference/context/has-local.html
page_title: "Context::hasLocal"
description: "Pruefen, ob ein Schluessel nur im lokalen Kontext existiert."
---

# Context::hasLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::hasLocal(string|object $key): bool
```

Prueft, ob ein Wert mit dem angegebenen Schluessel **nur** im aktuellen (lokalen) Kontext existiert.
Im Gegensatz zu `has()` sucht diese Methode nicht in uebergeordneten Kontexten.

## Parameter

**key**
: Der zu pruefende Schluessel. Kann ein String oder ein Objekt sein.

## Rueckgabewert

`true`, wenn der Schluessel im lokalen Kontext gefunden wird, andernfalls `false`.

## Beispiele

### Beispiel #1 Unterschied zwischen has und hasLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('inherited_key', 'value');

spawn(function() {
    current_context()->set('local_key', 'value');

    // has() sucht in der Hierarchie nach oben
    var_dump(current_context()->has('inherited_key'));      // true
    var_dump(current_context()->has('local_key'));          // true

    // hasLocal() prueft nur die aktuelle Ebene
    var_dump(current_context()->hasLocal('inherited_key')); // false
    var_dump(current_context()->hasLocal('local_key'));      // true
});
```

### Beispiel #2 Pruefung mit einem Objekt-Schluessel

```php
<?php

use function Async\current_context;
use function Async\spawn;

$configKey = new stdClass();
current_context()->set($configKey, ['debug' => true]);

spawn(function() use ($configKey) {
    $localKey = new stdClass();
    current_context()->set($localKey, 'local');

    var_dump(current_context()->hasLocal($configKey)); // false
    var_dump(current_context()->hasLocal($localKey));  // true
});
```

### Beispiel #3 Bedingte Initialisierung eines lokalen Werts

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    // Wert nur initialisieren, wenn nicht lokal gesetzt
    if (!current_context()->hasLocal('request_count')) {
        current_context()->set('request_count', 0);
    }

    echo current_context()->getLocal('request_count') . "\n"; // 0
});
```

## Siehe auch

- [Context::has](/de/docs/reference/context/has.html) --- Pruefung mit hierarchischer Durchquerung
- [Context::findLocal](/de/docs/reference/context/find-local.html) --- Wert im lokalen Kontext suchen
- [Context::getLocal](/de/docs/reference/context/get-local.html) --- Lokalen Wert abrufen (wirft Exception)
