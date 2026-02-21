---
layout: docs
lang: de
path_key: "/docs/reference/future/catch.html"
nav_active: docs
permalink: /de/docs/reference/future/catch.html
page_title: "Future::catch"
description: "Einen Future-Fehler behandeln."
---

# Future::catch

(PHP 8.6+, True Async 1.0)

```php
public function catch(callable $catch): Future
```

Registriert einen Fehlerbehandler für das `Future`. Der Callback wird aufgerufen, wenn das Future mit einer Ausnahme abgeschlossen wurde. Wenn der Callback einen Wert zurückgibt, wird dieser zum Ergebnis des neuen Future. Wenn der Callback eine Ausnahme wirft, wird das neue Future mit diesem Fehler abgeschlossen.

## Parameter

`catch` — die Fehlerbehandlungsfunktion. Empfängt ein `Throwable`, kann einen Wert zur Wiederherstellung zurückgeben. Signatur: `function(\Throwable $e): mixed`.

## Rückgabewert

`Future` — ein neues Future mit dem Ergebnis der Fehlerbehandlung, oder mit dem ursprünglichen Wert, wenn kein Fehler vorlag.

## Beispiele

### Beispiel #1 Fehlerbehandlung mit Wiederherstellung

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Dienst nicht verfügbar"))
    ->catch(function(\Throwable $e) {
        echo "Fehler: " . $e->getMessage() . "\n";
        return "Standardwert"; // Wiederherstellung
    });

$result = $future->await();
echo $result; // Standardwert
```

### Beispiel #2 Fehler bei asynchronen Operationen abfangen

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    $response = httpGet('https://api.example.com/users');
    if ($response->status !== 200) {
        throw new \RuntimeException("HTTP-Fehler: {$response->status}");
    }
    return json_decode($response->body, true);
})
->catch(function(\Throwable $e) {
    // Den Fehler protokollieren und ein leeres Array zurückgeben
    error_log("API-Fehler: " . $e->getMessage());
    return [];
})
->map(function(array $users) {
    return count($users);
});

$count = $future->await();
echo "Gefundene Benutzer: $count\n";
```

## Siehe auch

- [Future::map](/de/docs/reference/future/map.html) — Das Future-Ergebnis transformieren
- [Future::finally](/de/docs/reference/future/finally.html) — Callback bei Future-Abschluss
- [Future::ignore](/de/docs/reference/future/ignore.html) — Unbehandelte Fehler ignorieren
