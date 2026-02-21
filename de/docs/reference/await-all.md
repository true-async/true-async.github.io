---
layout: docs
lang: de
path_key: "/docs/reference/await-all.html"
nav_active: docs
permalink: /de/docs/reference/await-all.html
page_title: "await_all()"
description: "await_all() — Warten auf alle Aufgaben mit Toleranz fuer teilweise Fehler."
---

# await_all

(PHP 8.6+, True Async 1.0)

`await_all()` — Wartet auf den Abschluss **aller** Aufgaben und sammelt Ergebnisse und Fehler separat. Wirft keine Ausnahme, wenn einzelne Aufgaben fehlschlagen.

## Beschreibung

```php
await_all(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Parameter

**`triggers`**
Eine iterierbare Sammlung von `Async\Completable`-Objekten.

**`cancellation`**
Ein optionales Awaitable zum Abbrechen des gesamten Wartens.

**`preserveKeyOrder`**
Wenn `true` (Standard), werden die Ergebnisse in der Schluesselreihenfolge des Eingabearrays zurueckgegeben. Wenn `false`, in Abschlussreihenfolge.

**`fillNull`**
Wenn `true`, wird `null` im Ergebnisarray fuer fehlgeschlagene Aufgaben eingesetzt. Wenn `false` (Standard), werden Schluessel mit Fehlern ausgelassen.

## Rueckgabewerte

Ein Array mit zwei Elementen: `[$results, $errors]`

- `$results` — Array der erfolgreichen Ergebnisse
- `$errors` — Array der Ausnahmen (Schluessel entsprechen den Schluessel der Eingabeaufgaben)

## Beispiele

### Beispiel #1 Toleranz gegenueber teilweisen Fehlern

```php
<?php
use function Async\spawn;
use function Async\await_all;

$coroutines = [
    'fast'   => spawn(file_get_contents(...), 'https://api/fast'),
    'slow'   => spawn(file_get_contents(...), 'https://api/slow'),
    'broken' => spawn(function() { throw new \Exception('Fehler'); }),
];

[$results, $errors] = await_all($coroutines);

// $results enthaelt 'fast' und 'slow'
// $errors enthaelt 'broken' => Exception
foreach ($errors as $key => $error) {
    echo "Aufgabe '$key' fehlgeschlagen: {$error->getMessage()}\n";
}
?>
```

### Beispiel #2 Mit fillNull

```php
<?php
[$results, $errors] = await_all($coroutines, fillNull: true);

// $results['broken'] === null (anstelle eines fehlenden Schluessels)
?>
```

## Hinweise

> **Hinweis:** Der Parameter `triggers` akzeptiert jedes `iterable`, einschliesslich `Iterator`-Implementierungen. Coroutinen koennen waehrend der Iteration dynamisch erstellt werden. Siehe das [Iterator-Beispiel](/de/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Siehe auch

- [await_all_or_fail()](/de/docs/reference/await-all-or-fail.html) — alle Aufgaben, Fehler bricht ab
- [await_any_or_fail()](/de/docs/reference/await-any-or-fail.html) — erstes Ergebnis
