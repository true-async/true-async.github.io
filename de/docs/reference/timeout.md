---
layout: docs
lang: de
path_key: "/docs/reference/timeout.html"
nav_active: docs
permalink: /de/docs/reference/timeout.html
page_title: "timeout()"
description: "timeout() — ein Timeout-Objekt erstellen, um die Wartezeit zu begrenzen."
---

# timeout

(PHP 8.6+, True Async 1.0)

`timeout()` — Erstellt ein `Async\Timeout`-Objekt, das nach der angegebenen Anzahl von Millisekunden ausgeloest wird.

## Beschreibung

```php
timeout(int $ms): Async\Awaitable
```

Erstellt einen Timer, der nach `$ms` Millisekunden `Async\TimeoutException` wirft.
Wird als Zeitbegrenzer fuer das Warten in `await()` und anderen Funktionen verwendet.

## Parameter

**`ms`**
Zeit in Millisekunden. Muss groesser als 0 sein.

## Rueckgabewerte

Gibt ein `Async\Timeout`-Objekt zurueck, das `Async\Completable` implementiert.

## Fehler/Ausnahmen

- `ValueError` — wenn `$ms` <= 0.

## Beispiele

### Beispiel #1 Timeout bei await()

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use Async\TimeoutException;

$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com');
});

try {
    $result = await($coroutine, timeout(3000));
} catch (TimeoutException $e) {
    echo "Anfrage wurde nicht innerhalb von 3 Sekunden abgeschlossen\n";
}
?>
```

### Beispiel #2 Timeout auf eine Aufgabengruppe

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail([
        spawn(file_get_contents(...), 'https://api/a'),
        spawn(file_get_contents(...), 'https://api/b'),
    ], timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Nicht alle Anfragen wurden innerhalb von 5 Sekunden abgeschlossen\n";
}
?>
```

### Beispiel #3 Einen Timeout abbrechen

```php
<?php
use function Async\timeout;

$timer = timeout(5000);

// Die Operation wurde schneller abgeschlossen — Timer abbrechen
$timer->cancel();
?>
```

## Siehe auch

- [delay()](/de/docs/reference/delay.html) — Unterbrechen einer Coroutine
- [await()](/de/docs/reference/await.html) — Warten mit Abbruchmoeglichkeit
