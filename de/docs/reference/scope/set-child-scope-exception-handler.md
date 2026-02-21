---
layout: docs
lang: de
path_key: "/docs/reference/scope/set-child-scope-exception-handler.html"
nav_active: docs
permalink: /de/docs/reference/scope/set-child-scope-exception-handler.html
page_title: "Scope::setChildScopeExceptionHandler"
description: "Setzt einen Exception-Handler fuer Kind-Scopes."
---

# Scope::setChildScopeExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setChildScopeExceptionHandler(callable $exceptionHandler): void
```

Setzt einen Exception-Handler fuer Exceptions, die in Kind-Scopes geworfen werden. Wenn ein Kind-Scope mit einem Fehler endet, wird dieser Handler aufgerufen, um zu verhindern, dass die Exception zum Eltern-Scope weitergeleitet wird.

## Parameter

`exceptionHandler` — die Exception-Behandlungsfunktion fuer Kind-Scopes. Akzeptiert ein `\Throwable` als Argument.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Fehler von Kind-Scopes abfangen

```php
<?php

use Async\Scope;

$parentScope = new Scope();

$parentScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("Fehler im Kind-Scope: " . $e->getMessage());
});

$childScope = Scope::inherit($parentScope);

$childScope->spawn(function() {
    throw new \RuntimeException("Kind-Scope-Fehler");
});

$childScope->awaitCompletion();
// Fehler behandelt, wird nicht an $parentScope weitergeleitet
```

### Beispiel #2 Fehlerisolierung zwischen Modulen

```php
<?php

use Async\Scope;

$appScope = new Scope();

$appScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("[App] Modulfehler: " . $e->getMessage());
});

// Jedes Modul in seinem eigenen Scope
$authScope = Scope::inherit($appScope);
$cacheScope = Scope::inherit($appScope);

$authScope->spawn(function() {
    // Ein Fehler hier beeinflusst $cacheScope nicht
    throw new \RuntimeException("Authentifizierung fehlgeschlagen");
});

$cacheScope->spawn(function() {
    echo "Cache funktioniert einwandfrei\n";
});

$appScope->awaitCompletion();
```

## Siehe auch

- [Scope::setExceptionHandler](/de/docs/reference/scope/set-exception-handler.html) — Exception-Handler fuer Koroutinen
- [Scope::inherit](/de/docs/reference/scope/inherit.html) — Einen Kind-Scope erstellen
- [Scope::getChildScopes](/de/docs/reference/scope/get-child-scopes.html) — Kind-Scopes abrufen
