---
layout: docs
lang: de
path_key: "/docs/reference/future/finally.html"
nav_active: docs
permalink: /de/docs/reference/future/finally.html
page_title: "Future::finally"
description: "Callback, der immer bei Abschluss des Future ausgeführt wird."
---

# Future::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(callable $finally): Future
```

Registriert einen Callback, der bei Abschluss des `Future` ausgeführt wird, unabhängig vom Ergebnis --- Erfolg, Fehler oder Abbruch. Das Future wird mit demselben Wert oder Fehler wie das Original aufgelöst. Nützlich zur Freigabe von Ressourcen.

## Parameter

`finally` — die Funktion, die bei Abschluss ausgeführt wird. Nimmt keine Argumente entgegen. Signatur: `function(): void`.

## Rückgabewert

`Future` — ein neues Future, das mit demselben Wert oder Fehler wie das Original abgeschlossen wird.

## Beispiele

### Beispiel #1 Ressourcen freigeben

```php
<?php

use Async\Future;

$connection = openDatabaseConnection();

$future = \Async\async(function() use ($connection) {
    return $connection->query("SELECT * FROM users");
})
->finally(function() use ($connection) {
    $connection->close();
    echo "Verbindung geschlossen\n";
});

$users = $future->await();
```

### Beispiel #2 Verkettung mit map, catch und finally

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return fetchDataFromApi();
})
->map(fn($data) => processData($data))
->catch(function(\Throwable $e) {
    error_log("Fehler: " . $e->getMessage());
    return [];
})
->finally(function() {
    echo "Operation abgeschlossen\n";
});

$result = $future->await();
```

## Siehe auch

- [Future::map](/de/docs/reference/future/map.html) — Das Future-Ergebnis transformieren
- [Future::catch](/de/docs/reference/future/catch.html) — Einen Future-Fehler behandeln
- [Future::ignore](/de/docs/reference/future/ignore.html) — Unbehandelte Fehler ignorieren
