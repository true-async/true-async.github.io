---
layout: docs
lang: de
path_key: "/docs/reference/context/has.html"
nav_active: docs
permalink: /de/docs/reference/context/has.html
page_title: "Context::has"
description: "Pruefen, ob ein Schluessel im aktuellen oder uebergeordneten Kontext existiert."
---

# Context::has

(PHP 8.6+, True Async 1.0)

```php
public Context::has(string|object $key): bool
```

Prueft, ob ein Wert mit dem angegebenen Schluessel im aktuellen Kontext oder in einem
der uebergeordneten Kontexte existiert. Die Suche wird in der Hierarchie nach oben durchgefuehrt.

## Parameter

**key**
: Der zu pruefende Schluessel. Kann ein String oder ein Objekt sein.

## Rueckgabewert

`true`, wenn der Schluessel im aktuellen oder einem uebergeordneten Kontext gefunden wird, andernfalls `false`.

## Beispiele

### Beispiel #1 Schluessel vor der Verwendung pruefen

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('locale', 'ru_RU');

spawn(function() {
    if (current_context()->has('locale')) {
        $locale = current_context()->find('locale');
        echo "Locale: {$locale}\n"; // "Locale: ru_RU"
    } else {
        echo "Locale nicht gesetzt, Standardwert wird verwendet\n";
    }
});
```

### Beispiel #2 Pruefung mit einem Objekt-Schluessel

```php
<?php

use function Async\current_context;

$cacheKey = new stdClass();

current_context()->set($cacheKey, new RedisCache());

if (current_context()->has($cacheKey)) {
    echo "Cache ist verfuegbar\n";
}

$unknownKey = new stdClass();
var_dump(current_context()->has($unknownKey)); // false
```

### Beispiel #3 Hierarchische Pruefung

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('global_flag', true);

spawn(function() {
    current_context()->set('local_flag', true);

    spawn(function() {
        var_dump(current_context()->has('global_flag')); // true (von Root)
        var_dump(current_context()->has('local_flag'));   // true (vom Eltern-Kontext)
        var_dump(current_context()->has('unknown'));      // false
    });
});
```

## Siehe auch

- [Context::find](/de/docs/reference/context/find.html) --- Wert anhand des Schluessels suchen
- [Context::get](/de/docs/reference/context/get.html) --- Wert abrufen (wirft Exception)
- [Context::hasLocal](/de/docs/reference/context/has-local.html) --- Nur im lokalen Kontext pruefen
