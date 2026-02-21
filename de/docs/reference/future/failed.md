---
layout: docs
lang: de
path_key: "/docs/reference/future/failed.html"
nav_active: docs
permalink: /de/docs/reference/future/failed.html
page_title: "Future::failed"
description: "Ein mit einem Fehler abgeschlossenes Future erstellen."
---

# Future::failed

(PHP 8.6+, True Async 1.0)

```php
public static function failed(\Throwable $throwable): Future
```

Erstellt ein `Future`, das sofort mit dem angegebenen Fehler abgeschlossen ist. Der Aufruf von `await()` auf einem solchen Future löst die bereitgestellte Ausnahme aus.

## Parameter

`throwable` — die Ausnahme, mit der das Future abgeschlossen wird.

## Rückgabewert

`Future` — ein mit einem Fehler abgeschlossenes Future.

## Beispiele

### Beispiel #1 Ein Future mit einem Fehler erstellen

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Ladefehler"));

var_dump($future->isCompleted()); // bool(true)

try {
    $future->await();
} catch (\RuntimeException $e) {
    echo "Abgefangen: " . $e->getMessage() . "\n";
    // Abgefangen: Ladefehler
}
```

### Beispiel #2 Verwendung für vorzeitige Fehlerrückgabe

```php
<?php

use Async\Future;

function connectToService(string $host): Future {
    if (empty($host)) {
        return Future::failed(
            new \InvalidArgumentException("Host darf nicht leer sein")
        );
    }

    return \Async\async(function() use ($host) {
        return performConnection($host);
    });
}

$future = connectToService('');
$future->catch(function(\Throwable $e) {
    echo "Fehler: " . $e->getMessage() . "\n";
});
```

## Siehe auch

- [Future::completed](/de/docs/reference/future/completed.html) — Ein Future mit einem Ergebnis erstellen
- [Future::catch](/de/docs/reference/future/catch.html) — Einen Future-Fehler behandeln
- [Future::await](/de/docs/reference/future/await.html) — Das Ergebnis abwarten
