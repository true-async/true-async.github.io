---
layout: docs
lang: de
path_key: "/docs/reference/future/completed.html"
nav_active: docs
permalink: /de/docs/reference/future/completed.html
page_title: "Future::completed"
description: "Ein bereits abgeschlossenes Future mit einem Ergebnis erstellen."
---

# Future::completed

(PHP 8.6+, True Async 1.0)

```php
public static function completed(mixed $value = null): Future
```

Erstellt ein bereits abgeschlossenes `Future` mit dem angegebenen Wert. Dies ist eine Factory-Methode, die ein `Future` zurückgibt, das sofort ein Ergebnis enthält. Nützlich, um einen bereits bekannten Wert aus Funktionen zurückzugeben, die ein `Future` zurückgeben.

## Parameter

`value` — der Wert, mit dem das Future abgeschlossen wird. Standardwert ist `null`.

## Rückgabewert

`Future` — ein abgeschlossenes Future mit dem angegebenen Wert.

## Beispiele

### Beispiel #1 Ein Future mit einem fertigen Wert erstellen

```php
<?php

use Async\Future;

$future = Future::completed(42);

var_dump($future->isCompleted()); // bool(true)
var_dump($future->await());       // int(42)
```

### Beispiel #2 Verwendung in einer Funktion, die ein Future zurückgibt

```php
<?php

use Async\Future;

function fetchData(string $key): Future {
    // Wenn Daten im Cache sind, sofort zurückgeben
    $cached = getFromCache($key);
    if ($cached !== null) {
        return Future::completed($cached);
    }

    // Andernfalls eine asynchrone Operation starten
    return \Async\async(function() use ($key) {
        return loadFromDatabase($key);
    });
}

$result = fetchData('user:1')->await();
echo "Ergebnis: $result\n";
```

## Siehe auch

- [Future::failed](/de/docs/reference/future/failed.html) — Ein Future mit einem Fehler erstellen
- [Future::__construct](/de/docs/reference/future/construct.html) — Ein Future über FutureState erstellen
- [Future::await](/de/docs/reference/future/await.html) — Das Ergebnis abwarten
