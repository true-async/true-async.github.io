---
layout: docs
lang: de
path_key: "/docs/reference/scope/construct.html"
nav_active: docs
permalink: /de/docs/reference/scope/construct.html
page_title: "Scope::__construct"
description: "Erstellt einen neuen Root-Scope."
---

# Scope::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct()
```

Erstellt einen neuen Root-`Scope`. Ein Root-Scope hat keinen Eltern-Scope und dient als unabhaengige Einheit zur Verwaltung des Lebenszyklus von Koroutinen.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Koroutine in einem neuen Scope\n";
});

$scope->awaitCompletion();
```

### Beispiel #2 Erstellen mehrerer unabhaengiger Scopes

```php
<?php

use Async\Scope;

$scopeA = new Scope();
$scopeB = new Scope();

$scopeA->spawn(function() {
    echo "Aufgabe A\n";
});

$scopeB->spawn(function() {
    echo "Aufgabe B\n";
});

// Das Abbrechen eines Scopes beeinflusst den anderen nicht
$scopeA->cancel();

// $scopeB laeuft weiter
$scopeB->awaitCompletion();
```

## Siehe auch

- [Scope::inherit](/de/docs/reference/scope/inherit.html) — Einen Kind-Scope erstellen
- [Scope::spawn](/de/docs/reference/scope/spawn.html) — Eine Koroutine im Scope starten
