---
layout: docs
lang: de
path_key: "/docs/reference/context/unset.html"
nav_active: docs
permalink: /de/docs/reference/context/unset.html
page_title: "Context::unset"
description: "Einen Wert anhand des Schluessels aus dem Kontext entfernen."
---

# Context::unset

(PHP 8.6+, True Async 1.0)

```php
public Context::unset(string|object $key): Context
```

Entfernt einen Wert anhand des Schluessels aus dem aktuellen Kontext. Die Entfernung betrifft nur den lokalen
Kontext --- Werte in uebergeordneten Kontexten werden nicht geaendert.

Die Methode gibt das `Context`-Objekt zurueck und ermoeglicht so Methodenverkettung.

## Parameter

**key**
: Der zu entfernende Schluessel. Kann ein String oder ein Objekt sein.

## Rueckgabewert

Das `Context`-Objekt fuer Methodenverkettung.

## Beispiele

### Beispiel #1 Einen Wert aus dem Kontext entfernen

```php
<?php

use function Async\current_context;

current_context()
    ->set('temp_data', 'value')
    ->set('keep_data', 'preserve');

echo current_context()->find('temp_data') . "\n"; // "value"

// Temporaere Daten entfernen
current_context()->unset('temp_data');

var_dump(current_context()->find('temp_data')); // NULL
echo current_context()->find('keep_data') . "\n"; // "preserve"
```

### Beispiel #2 Entfernen mit einem Objekt-Schluessel

```php
<?php

use function Async\current_context;

$tokenKey = new stdClass();

current_context()->set($tokenKey, 'secret-token-123');
echo current_context()->find($tokenKey) . "\n"; // "secret-token-123"

// Sensible Daten nach der Verwendung entfernen
current_context()->unset($tokenKey);
var_dump(current_context()->find($tokenKey)); // NULL
```

### Beispiel #3 Entfernung beeinflusst den Eltern-Kontext nicht

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('shared', 'parent_value');

spawn(function() {
    // Kind-Kontext sieht den Wert vom Eltern-Kontext
    echo current_context()->find('shared') . "\n"; // "parent_value"

    // Lokalen Wert mit demselben Schluessel setzen
    current_context()->set('shared', 'child_value', replace: true);
    echo current_context()->findLocal('shared') . "\n"; // "child_value"

    // Lokalen Wert entfernen
    current_context()->unset('shared');

    // Nach dem Entfernen des lokalen Werts — Eltern-Wert ist ueber find() wieder sichtbar
    echo current_context()->find('shared') . "\n"; // "parent_value"
    var_dump(current_context()->findLocal('shared')); // NULL
});
```

### Beispiel #4 Methodenverkettung mit unset

```php
<?php

use function Async\current_context;

current_context()
    ->set('a', 1)
    ->set('b', 2)
    ->set('c', 3);

// Mehrere Schluessel mit Verkettung loeschen
current_context()
    ->unset('a')
    ->unset('b');

var_dump(current_context()->find('a')); // NULL
var_dump(current_context()->find('b')); // NULL
echo current_context()->find('c') . "\n"; // 3
```

## Siehe auch

- [Context::set](/de/docs/reference/context/set.html) --- Wert im Kontext setzen
- [Context::find](/de/docs/reference/context/find.html) --- Wert anhand des Schluessels suchen
- [Context::findLocal](/de/docs/reference/context/find-local.html) --- Wert im lokalen Kontext suchen
