---
layout: docs
lang: de
path_key: "/docs/reference/future/map.html"
nav_active: docs
permalink: /de/docs/reference/future/map.html
page_title: "Future::map"
description: "Das Future-Ergebnis transformieren."
---

# Future::map

(PHP 8.6+, True Async 1.0)

```php
public function map(callable $map): Future
```

Transformiert das Ergebnis des `Future` mithilfe einer Callback-Funktion. Der Callback empfängt den Wert des abgeschlossenen Future und gibt einen neuen Wert zurück. Analog zu `then()` in Promise-basierten APIs. Wenn das ursprüngliche Future mit einem Fehler abgeschlossen wurde, wird der Callback nicht aufgerufen, und der Fehler wird an das neue Future weitergegeben.

## Parameter

`map` — die Transformationsfunktion. Empfängt das Future-Ergebnis, gibt einen neuen Wert zurück. Signatur: `function(mixed $value): mixed`.

## Rückgabewert

`Future` — ein neues Future mit dem transformierten Ergebnis.

## Beispiele

### Beispiel #1 Das Ergebnis transformieren

```php
<?php

use Async\Future;

$future = Future::completed(5)
    ->map(fn(int $x) => $x * 2)
    ->map(fn(int $x) => "Ergebnis: $x");

echo $future->await(); // Ergebnis: 10
```

### Beispiel #2 Transformationskette für asynchrones Laden

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return file_get_contents('https://api.example.com/data');
})
->map(fn(string $json) => json_decode($json, true))
->map(fn(array $data) => $data['users'])
->map(fn(array $users) => count($users));

$count = $future->await();
echo "Anzahl der Benutzer: $count\n";
```

## Siehe auch

- [Future::catch](/de/docs/reference/future/catch.html) — Einen Future-Fehler behandeln
- [Future::finally](/de/docs/reference/future/finally.html) — Callback bei Future-Abschluss
- [Future::await](/de/docs/reference/future/await.html) — Das Ergebnis abwarten
