---
layout: docs
lang: de
path_key: "/docs/reference/scope/spawn.html"
nav_active: docs
permalink: /de/docs/reference/scope/spawn.html
page_title: "Scope::spawn"
description: "Startet eine Koroutine im angegebenen Scope."
---

# Scope::spawn

(PHP 8.6+, True Async 1.0)

```php
public function spawn(\Closure $callable, mixed ...$params): Coroutine
```

Startet eine neue Koroutine innerhalb des angegebenen Scopes. Die Koroutine wird an den Scope gebunden und von dessen Lebenszyklus verwaltet: Wenn der Scope abgebrochen oder geschlossen wird, sind auch alle seine Koroutinen betroffen.

## Parameter

`callable` — die Closure, die als Koroutine ausgefuehrt werden soll.

`params` — Argumente, die an die Closure uebergeben werden.

## Rueckgabewert

`Coroutine` — das gestartete Koroutinen-Objekt.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function() {
    echo "Hallo aus einer Koroutine!\n";
    return 42;
});

echo $coroutine->getResult(); // 42
```

### Beispiel #2 Parameter uebergeben

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function(string $url, int $timeout) {
    echo "Abruf von $url mit Timeout {$timeout}ms\n";
    // ... Anfrage ausfuehren
}, 'https://example.com', 5000);

$scope->awaitCompletion();
```

## Siehe auch

- [spawn()](/de/docs/reference/spawn.html) — Globale Funktion zum Starten von Koroutinen
- [Scope::cancel](/de/docs/reference/scope/cancel.html) — Alle Scope-Koroutinen abbrechen
- [Scope::awaitCompletion](/de/docs/reference/scope/await-completion.html) — Auf Abschluss der Koroutinen warten
