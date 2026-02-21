---
layout: docs
lang: de
path_key: "/docs/reference/scope/set-exception-handler.html"
nav_active: docs
permalink: /de/docs/reference/scope/set-exception-handler.html
page_title: "Scope::setExceptionHandler"
description: "Setzt einen Exception-Handler fuer Kind-Koroutinen."
---

# Scope::setExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setExceptionHandler(callable $exceptionHandler): void
```

Setzt einen Exception-Handler fuer Exceptions, die in Kind-Koroutinen des Scopes geworfen werden. Wenn eine Koroutine mit einer unbehandelten Exception endet, wird anstelle einer Fehlerweiterleitung nach oben der angegebene Handler aufgerufen.

## Parameter

`exceptionHandler` — die Exception-Behandlungsfunktion. Akzeptiert ein `\Throwable` als Argument.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Koroutinen-Fehler behandeln

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->setExceptionHandler(function(\Throwable $e) {
    error_log("Koroutinen-Fehler: " . $e->getMessage());
});

$scope->spawn(function() {
    throw new \RuntimeException("Etwas ist schiefgelaufen");
});

$scope->awaitCompletion();
// Log enthaelt: "Koroutinen-Fehler: Etwas ist schiefgelaufen"
```

### Beispiel #2 Zentralisierte Fehlerprotokollierung

```php
<?php

use Async\Scope;

$scope = new Scope();
$errors = [];

$scope->setExceptionHandler(function(\Throwable $e) use (&$errors) {
    $errors[] = $e;
});

$scope->spawn(function() {
    throw new \RuntimeException("Fehler 1");
});

$scope->spawn(function() {
    throw new \LogicException("Fehler 2");
});

$scope->awaitCompletion();

echo "Fehler insgesamt: " . count($errors) . "\n"; // Fehler insgesamt: 2
```

## Siehe auch

- [Scope::setChildScopeExceptionHandler](/de/docs/reference/scope/set-child-scope-exception-handler.html) — Exception-Handler fuer Kind-Scopes
- [Scope::finally](/de/docs/reference/scope/on-finally.html) — Callback bei Scope-Abschluss
