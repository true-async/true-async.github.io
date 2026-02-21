---
layout: docs
lang: de
path_key: "/docs/reference/scope/get-child-scopes.html"
nav_active: docs
permalink: /de/docs/reference/scope/get-child-scopes.html
page_title: "Scope::getChildScopes"
description: "Gibt ein Array der Kind-Scopes zurueck."
---

# Scope::getChildScopes

(PHP 8.6+, True Async 1.0)

```php
public function getChildScopes(): array
```

Gibt ein Array aller Kind-Scopes zurueck, die ueber `Scope::inherit()` vom angegebenen Scope erstellt wurden. Nuetzlich fuer die Ueberwachung und das Debugging der Scope-Hierarchie.

## Rueckgabewert

`array` — ein Array von `Scope`-Objekten, die Kinder des angegebenen Scopes sind.

## Beispiele

### Beispiel #1 Kind-Scopes abrufen

```php
<?php

use Async\Scope;

$parent = new Scope();
$child1 = Scope::inherit($parent);
$child2 = Scope::inherit($parent);

$children = $parent->getChildScopes();

var_dump(count($children)); // int(2)
```

### Beispiel #2 Status der Kind-Scopes ueberwachen

```php
<?php

use Async\Scope;

$appScope = new Scope();

$workerScope = Scope::inherit($appScope);
$bgScope = Scope::inherit($appScope);

$workerScope->spawn(function() {
    \Async\delay(1000);
});

foreach ($appScope->getChildScopes() as $child) {
    $status = match(true) {
        $child->isCancelled() => 'abgebrochen',
        $child->isFinished()  => 'beendet',
        $child->isClosed()    => 'geschlossen',
        default               => 'aktiv',
    };
    echo "Scope: $status\n";
}
```

## Siehe auch

- [Scope::inherit](/de/docs/reference/scope/inherit.html) — Einen Kind-Scope erstellen
- [Scope::setChildScopeExceptionHandler](/de/docs/reference/scope/set-child-scope-exception-handler.html) — Exception-Handler fuer Kind-Scopes
