---
layout: docs
lang: de
path_key: "/docs/reference/scope/on-finally.html"
nav_active: docs
permalink: /de/docs/reference/scope/on-finally.html
page_title: "Scope::finally"
description: "Registriert einen Callback, der beim Abschluss des Scopes aufgerufen wird."
---

# Scope::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(\Closure $callback): void
```

Registriert eine Callback-Funktion, die beim Abschluss des Scopes ausgefuehrt wird. Dies ist das Aequivalent eines `finally`-Blocks fuer einen Scope und garantiert, dass Bereinigungscode unabhaengig davon ausgefuehrt wird, wie der Scope beendet wurde (normal, durch Abbruch oder mit einem Fehler).

## Parameter

`callback` — die Closure, die beim Abschluss des Scopes aufgerufen wird.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Ressourcenbereinigung

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Scope abgeschlossen, Ressourcen werden bereinigt\n";
    // Verbindungen schliessen, temporaere Dateien loeschen
});

$scope->spawn(function() {
    echo "Aufgabe wird ausgefuehrt\n";
});

$scope->awaitCompletion();
// Ausgabe: "Aufgabe wird ausgefuehrt"
// Ausgabe: "Scope abgeschlossen, Ressourcen werden bereinigt"
```

### Beispiel #2 Mehrere Callbacks

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Datenbankverbindung wird geschlossen\n";
});

$scope->finally(function() {
    echo "Metriken werden geschrieben\n";
});

$scope->spawn(function() {
    \Async\delay(1000);
});

$scope->dispose();
// Beide Callbacks werden beim Abschluss des Scopes aufgerufen
```

## Siehe auch

- [Scope::dispose](/de/docs/reference/scope/dispose.html) — Den Scope schliessen
- [Scope::isFinished](/de/docs/reference/scope/is-finished.html) — Pruefen, ob der Scope beendet ist
- [Coroutine::finally](/de/docs/reference/coroutine/on-finally.html) — Callback bei Koroutinen-Abschluss
