---
layout: docs
lang: de
path_key: "/docs/reference/await-all-or-fail.html"
nav_active: docs
permalink: /de/docs/reference/await-all-or-fail.html
page_title: "await_all_or_fail()"
description: "await_all_or_fail() — Warten auf den Abschluss aller Aufgaben; wirft beim ersten Fehler eine Ausnahme."
---

# await_all_or_fail

(PHP 8.6+, True Async 1.0)

`await_all_or_fail()` — Wartet auf den erfolgreichen Abschluss **aller** Aufgaben. Beim ersten Fehler wird eine Ausnahme geworfen und die verbleibenden Aufgaben werden abgebrochen.

## Beschreibung

```php
await_all_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Parameter

**`triggers`**
Eine iterierbare Sammlung von `Async\Completable`-Objekten (Coroutinen, Futures usw.).

**`cancellation`**
Ein optionales Awaitable zum Abbrechen des gesamten Wartens (z.B. `timeout()`).

**`preserveKeyOrder`**
Wenn `true` (Standard), werden die Ergebnisse in der Schluesselreihenfolge des Eingabearrays zurueckgegeben. Wenn `false`, in Abschlussreihenfolge.

## Rueckgabewerte

Ein Array der Ergebnisse aller Aufgaben. Die Schluessel entsprechen den Schluesseln des Eingabearrays.

## Fehler/Ausnahmen

Wirft die Ausnahme der ersten fehlgeschlagenen Aufgabe.

## Beispiele

### Beispiel #1 Paralleles Laden von Daten

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

$results = await_all_or_fail([
    'users'    => spawn(file_get_contents(...), 'https://api/users'),
    'orders'   => spawn(file_get_contents(...), 'https://api/orders'),
    'products' => spawn(file_get_contents(...), 'https://api/products'),
]);

// $results['users'], $results['orders'], $results['products']
?>
```

### Beispiel #2 Mit Timeout

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail($coroutines, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Nicht alle Aufgaben wurden innerhalb von 5 Sekunden abgeschlossen\n";
}
?>
```

### Beispiel #3 Mit Iterator statt Array

Alle Funktionen der `await_*`-Familie akzeptieren nicht nur Arrays, sondern jedes `iterable`, einschliesslich `Iterator`-Implementierungen. Dies ermoeglicht die dynamische Erzeugung von Coroutinen:

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

class UrlIterator implements \Iterator {
    private array $urls;
    private int $pos = 0;

    public function __construct(array $urls) { $this->urls = $urls; }
    public function current(): mixed {
        return spawn(file_get_contents(...), $this->urls[$this->pos]);
    }
    public function key(): int { return $this->pos; }
    public function next(): void { $this->pos++; }
    public function valid(): bool { return isset($this->urls[$this->pos]); }
    public function rewind(): void { $this->pos = 0; }
}

$iterator = new UrlIterator([
    'https://api.example.com/a',
    'https://api.example.com/b',
    'https://api.example.com/c',
]);

$results = await_all_or_fail($iterator);
?>
```

## Siehe auch

- [await_all()](/de/docs/reference/await-all.html) — alle Aufgaben mit Fehlertoleranz
- [await()](/de/docs/reference/await.html) — Warten auf eine einzelne Aufgabe
