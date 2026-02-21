---
layout: docs
lang: de
path_key: "/docs/reference/iterate.html"
nav_active: docs
permalink: /de/docs/reference/iterate.html
page_title: "iterate()"
description: "iterate() — nebenlaeufige Iteration ueber ein Array oder Traversable mit Nebenlaeufigkeitssteuerung und Lebenszyklus-Verwaltung gestarteter Coroutinen."
---

# iterate

(PHP 8.6+, True Async 1.0.0)

`iterate()` — Iteriert nebenlaeufig ueber ein Array oder `Traversable` und ruft fuer jedes Element einen `callback` auf.

## Beschreibung

```php
iterate(iterable $iterable, callable $callback, int $concurrency = 0, bool $cancelPending = true): void
```

Fuehrt `callback` fuer jedes Element von `iterable` in einer separaten Coroutine aus.
Der Parameter `concurrency` ermoeglicht die Begrenzung der Anzahl gleichzeitig laufender Callbacks.
Die Funktion blockiert die aktuelle Coroutine, bis alle Iterationen abgeschlossen sind.

Alle ueber `iterate()` gestarteten Coroutinen laufen in einem isolierten Kind-`Scope`.

## Parameter

**`iterable`**
Ein Array oder ein Objekt, das `Traversable` implementiert (einschliesslich Generatoren und `ArrayIterator`).

**`callback`**
Eine Funktion, die fuer jedes Element aufgerufen wird. Akzeptiert zwei Argumente: `(mixed $value, mixed $key)`.
Wenn der Callback `false` zurueckgibt, wird die Iteration gestoppt.

**`concurrency`**
Maximale Anzahl gleichzeitig laufender Callbacks. Standard ist `0` — das Standardlimit,
alle Elemente werden nebenlaeufig verarbeitet. Ein Wert von `1` bedeutet Ausfuehrung in einer einzelnen Coroutine.

**`cancelPending`**
Steuert das Verhalten von Kind-Coroutinen, die innerhalb des Callbacks (ueber `spawn()`) gestartet wurden, nachdem die Iteration abgeschlossen ist.
- `true` (Standard) — alle nicht beendeten gestarteten Coroutinen werden mit `AsyncCancellation` abgebrochen.
- `false` — `iterate()` wartet auf den Abschluss aller gestarteten Coroutinen, bevor es zurueckkehrt.

## Rueckgabewerte

Die Funktion gibt keinen Wert zurueck.

## Fehler/Ausnahmen

- `Error` — wenn ausserhalb eines asynchronen Kontexts oder aus dem Scheduler-Kontext aufgerufen.
- `TypeError` — wenn `iterable` kein Array ist und `Traversable` nicht implementiert.
- Wenn der Callback eine Ausnahme wirft, wird die Iteration gestoppt, verbleibende Coroutinen werden abgebrochen und die Ausnahme wird an den aufrufenden Code weitergegeben.

## Beispiele

### Beispiel #1 Grundlegende Array-Iteration

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $urls = [
        'php'    => 'https://php.net',
        'github' => 'https://github.com',
        'google' => 'https://google.com',
    ];

    iterate($urls, function(string $url, string $name) {
        $content = file_get_contents($url);
        echo "$name: " . strlen($content) . " Bytes\n";
    });

    echo "Alle Anfragen abgeschlossen\n";
});
?>
```

### Beispiel #2 Nebenlaeufigkeit begrenzen

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $userIds = range(1, 100);

    // Maximal 10 Benutzer gleichzeitig verarbeiten
    iterate($userIds, function(int $userId) {
        $data = file_get_contents("https://api.example.com/users/$userId");
        echo "Benutzer $userId geladen\n";
    }, concurrency: 10);

    echo "Alle Benutzer verarbeitet\n";
});
?>
```

### Beispiel #3 Iteration per Bedingung stoppen

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    iterate($items, function(string $item) {
        echo "Verarbeite: $item\n";

        if ($item === 'cherry') {
            return false; // Iteration stoppen
        }
    });

    echo "Iteration beendet\n";
});
?>
```

**Ausgabe:**
```
Verarbeite: apple
Verarbeite: banana
Verarbeite: cherry
Iteration beendet
```

### Beispiel #4 Ueber einen Generator iterieren

```php
<?php
use function Async\spawn;
use function Async\iterate;

function generateTasks(): Generator {
    for ($i = 1; $i <= 5; $i++) {
        yield "task-$i" => $i;
    }
}

spawn(function() {
    iterate(generateTasks(), function(int $value, string $key) {
        echo "$key: Verarbeite Wert $value\n";
    }, concurrency: 2);

    echo "Alle Aufgaben abgeschlossen\n";
});
?>
```

### Beispiel #5 Gestartete Coroutinen abbrechen (cancelPending = true)

Standardmaessig werden ueber `spawn()` innerhalb des Callbacks gestartete Coroutinen nach Abschluss der Iteration abgebrochen:

```php
<?php
use function Async\spawn;
use function Async\iterate;
use Async\AsyncCancellation;

spawn(function() {
    iterate([1, 2, 3], function(int $value) {
        // Hintergrundaufgabe starten
        spawn(function() use ($value) {
            try {
                echo "Hintergrundaufgabe $value gestartet\n";
                suspend();
                suspend();
                echo "Hintergrundaufgabe $value beendet\n"; // Wird nicht ausgefuehrt
            } catch (AsyncCancellation) {
                echo "Hintergrundaufgabe $value abgebrochen\n";
            }
        });
    });

    echo "Iteration beendet\n";
});
?>
```

**Ausgabe:**
```
Hintergrundaufgabe 1 gestartet
Hintergrundaufgabe 2 gestartet
Hintergrundaufgabe 3 gestartet
Hintergrundaufgabe 1 abgebrochen
Hintergrundaufgabe 2 abgebrochen
Hintergrundaufgabe 3 abgebrochen
Iteration beendet
```

### Beispiel #6 Auf gestartete Coroutinen warten (cancelPending = false)

Wenn Sie `cancelPending: false` uebergeben, wartet `iterate()` auf den Abschluss aller gestarteten Coroutinen:

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $results = [];

    iterate([1, 2, 3], function(int $value) use (&$results) {
        // Hintergrundaufgabe starten
        spawn(function() use (&$results, $value) {
            suspend();
            $results[] = "result-$value";
        });
    }, cancelPending: false);

    // Alle Hintergrundaufgaben sind abgeschlossen
    sort($results);
    echo implode(', ', $results) . "\n";
});
?>
```

**Ausgabe:**
```
result-1, result-2, result-3
```

### Beispiel #7 Fehlerbehandlung

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    try {
        iterate([1, 2, 3, 4, 5], function(int $value) {
            if ($value === 3) {
                throw new RuntimeException("Fehler bei der Verarbeitung von Element $value");
            }
            echo "Verarbeitet: $value\n";
        });
    } catch (RuntimeException $e) {
        echo "Abgefangen: " . $e->getMessage() . "\n";
    }
});
?>
```

## Hinweise

> **Hinweis:** `iterate()` erstellt einen isolierten Kind-Scope fuer alle gestarteten Coroutinen.

> **Hinweis:** Wenn ein Array uebergeben wird, erstellt `iterate()` vor der Iteration eine Kopie davon.
> Das Aendern des urspruenglichen Arrays innerhalb des Callbacks beeinflusst die Iteration nicht.

> **Hinweis:** Wenn der `callback` `false` zurueckgibt, wird die Iteration gestoppt,
> aber bereits laufende Coroutinen werden bis zum Abschluss fortgesetzt (oder abgebrochen, wenn `cancelPending = true`).

## Changelog

| Version | Beschreibung                          |
|---------|---------------------------------------|
| 1.0.0   | Funktion `iterate()` hinzugefuegt.  |

## Siehe auch

- [spawn()](/de/docs/reference/spawn.html) - Starten einer Coroutine
- [await_all()](/de/docs/reference/await-all.html) - Warten auf mehrere Coroutinen
- [Scope](/de/docs/components/scope.html) - Das Scope-Konzept
- [Cancellation](/de/docs/components/cancellation.html) - Coroutine-Abbruch
