---
layout: docs
lang: de
path_key: "/docs/reference/protect.html"
nav_active: docs
permalink: /de/docs/reference/protect.html
page_title: "protect()"
description: "protect() — Code im nicht-abbrechbaren Modus ausfuehren, um kritische Abschnitte zu schuetzen."
---

# protect

(PHP 8.6+, True Async 1.0)

`protect()` — Fuehrt eine Closure im nicht-abbrechbaren Modus aus. Der Abbruch der Coroutine wird aufgeschoben, bis die Closure abgeschlossen ist.

## Beschreibung

```php
protect(\Closure $closure): mixed
```

Waehrend `$closure` ausgefuehrt wird, ist die Coroutine als geschuetzt markiert. Wenn waehrend dieser Zeit eine Abbruchanforderung eintrifft, wird `AsyncCancellation` erst **nach** Abschluss der Closure geworfen.

## Parameter

**`closure`**
Eine Closure, die ohne Unterbrechung durch Abbruch ausgefuehrt werden soll.

## Rueckgabewerte

Gibt den von der Closure zurueckgegebenen Wert zurueck.

## Beispiele

### Beispiel #1 Eine Transaktion schuetzen

```php
<?php
use function Async\protect;

$db->beginTransaction();

$result = protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
    return true;
});

// Wenn die Coroutine waehrend protect() abgebrochen wurde,
// wird AsyncCancellation hier geworfen — nach commit()
?>
```

### Beispiel #2 Dateischreibvorgaenge schuetzen

```php
<?php
use function Async\protect;

protect(function() {
    $fp = fopen('data.json', 'w');
    fwrite($fp, json_encode($data));
    fclose($fp);
});
?>
```

### Beispiel #3 Ein Ergebnis erhalten

```php
<?php
use function Async\protect;

$cached = protect(function() use ($cache, $key) {
    $value = computeExpensiveResult();
    $cache->set($key, $value);
    return $value;
});
?>
```

### Beispiel #4 Aufgeschobener Abbruch und Diagnose

Waehrend `protect()` wird der Abbruch gespeichert, aber nicht angewendet. Dies kann ueber Coroutine-Methoden geprueft werden:

```php
<?php
use function Async\spawn;
use function Async\protect;
use function Async\current_coroutine;

$coroutine = spawn(function() {
    protect(function() {
        $me = current_coroutine();

        // Innerhalb von protect() nach cancel():
        echo $me->isCancellationRequested() ? "true" : "false"; // true
        echo "\n";
        echo $me->isCancelled() ? "true" : "false";             // false
        echo "\n";

        suspend();
        echo "Geschuetzte Operation abgeschlossen\n";
    });

    // AsyncCancellation wird hier geworfen — nach protect()
    echo "Dieser Code wird nicht ausgefuehrt\n";
});

suspend(); // Coroutine in protect() eintreten lassen
$coroutine->cancel();
suspend(); // protect() beenden lassen

echo $coroutine->isCancelled() ? "true" : "false"; // true
?>
```

- `isCancellationRequested()` — `true` sofort nach `cancel()`, auch innerhalb von `protect()`
- `isCancelled()` — `false` waehrend `protect()` laeuft, dann `true`

## Hinweise

> **Hinweis:** Wenn der Abbruch waehrend `protect()` stattfand, wird `AsyncCancellation` sofort nach Rueckkehr der Closure geworfen — der Rueckgabewert von `protect()` geht in diesem Fall verloren.

> **Hinweis:** `protect()` macht die Closure nicht atomar — andere Coroutinen koennen waehrend I/O-Operationen darin ausgefuehrt werden. `protect()` garantiert nur, dass der **Abbruch** die Ausfuehrung nicht unterbricht.

## Siehe auch

- [Cancellation](/de/docs/components/cancellation.html) — kooperativer Abbruchmechanismus
- [suspend()](/de/docs/reference/suspend.html) — Unterbrechen einer Coroutine
