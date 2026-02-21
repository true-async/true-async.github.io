---
layout: docs
lang: de
path_key: "/docs/reference/context/get.html"
nav_active: docs
permalink: /de/docs/reference/context/get.html
page_title: "Context::get"
description: "Einen Wert aus dem Kontext abrufen. Wirft eine Exception, wenn der Schluessel nicht gefunden wird."
---

# Context::get

(PHP 8.6+, True Async 1.0)

```php
public Context::get(string|object $key): mixed
```

Ruft einen Wert anhand des Schluessels aus dem aktuellen Kontext ab. Wenn der Schluessel auf der aktuellen Ebene nicht gefunden wird,
wird die Suche in der Hierarchie der uebergeordneten Kontexte fortgesetzt.

Im Gegensatz zu `find()` wirft diese Methode eine Exception, wenn der Schluessel auf keiner Ebene gefunden wird.
Verwenden Sie `get()`, wenn das Vorhandensein eines Werts eine zwingende Voraussetzung ist.

## Parameter

**key**
: Der zu suchende Schluessel. Kann ein String oder ein Objekt sein.
  Bei Verwendung eines Objekts als Schluessel wird die Suche anhand der Objektreferenz durchgefuehrt.

## Rueckgabewert

Der mit dem Schluessel verknuepfte Wert.

## Fehler

- Wirft `Async\ContextException`, wenn der Schluessel im aktuellen
  oder einem uebergeordneten Kontext nicht gefunden wird.

## Beispiele

### Beispiel #1 Einen erforderlichen Wert abrufen

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('db_connection', $pdo);

spawn(function() {
    // Einen Wert abrufen, der existieren muss
    $db = current_context()->get('db_connection');
    $db->query('SELECT 1');
});
```

### Beispiel #2 Behandlung eines fehlenden Schluessels

```php
<?php

use function Async\current_context;

try {
    $value = current_context()->get('missing_key');
} catch (\Async\ContextException $e) {
    echo "Schluessel nicht gefunden: " . $e->getMessage() . "\n";
}
```

### Beispiel #3 Verwendung eines Objekt-Schluessels

```php
<?php

use function Async\current_context;
use function Async\spawn;

class DatabaseKey {}

$dbKey = new DatabaseKey();
current_context()->set($dbKey, new PDO('sqlite::memory:'));

spawn(function() use ($dbKey) {
    // Objekt-Schluessel stellt Eindeutigkeit ohne Namenskonflikte sicher
    $pdo = current_context()->get($dbKey);
    $pdo->exec('CREATE TABLE test (id INTEGER)');
});
```

## Siehe auch

- [Context::find](/de/docs/reference/context/find.html) --- Sichere Suche (gibt null zurueck)
- [Context::has](/de/docs/reference/context/has.html) --- Pruefen, ob ein Schluessel existiert
- [Context::getLocal](/de/docs/reference/context/get-local.html) --- Wert nur aus dem lokalen Kontext abrufen
- [Context::set](/de/docs/reference/context/set.html) --- Wert im Kontext setzen
