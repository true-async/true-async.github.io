---
layout: docs
lang: de
path_key: "/docs/reference/await-any-of-or-fail.html"
nav_active: docs
permalink: /de/docs/reference/await-any-of-or-fail.html
page_title: "await_any_of_or_fail()"
description: "await_any_of_or_fail() — Warten auf die ersten N erfolgreich abgeschlossenen Aufgaben."
---

# await_any_of_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_of_or_fail()` — Wartet auf die **ersten N** erfolgreich abgeschlossenen Aufgaben. Wenn eine der ersten N fehlschlaegt, wird eine Ausnahme geworfen.

## Beschreibung

```php
await_any_of_or_fail(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Parameter

**`count`**
Die Anzahl der erfolgreichen Ergebnisse, auf die gewartet werden soll. Bei `0` wird ein leeres Array zurueckgegeben.

**`triggers`**
Eine iterierbare Sammlung von `Async\Completable`-Objekten.

**`cancellation`**
Ein optionales Awaitable zum Abbrechen des Wartens.

**`preserveKeyOrder`**
Wenn `true`, entsprechen die Ergebnisschluessel den Schluesseln des Eingabearrays. Wenn `false`, in Abschlussreihenfolge.

## Rueckgabewerte

Ein Array mit `$count` erfolgreichen Ergebnissen.

## Fehler/Ausnahmen

Wenn eine Aufgabe fehlschlaegt, bevor `$count` Erfolge erreicht werden, wird die Ausnahme geworfen.

## Beispiele

### Beispiel #1 Abrufen von 2 aus 5 Ergebnissen

```php
<?php
use function Async\spawn;
use function Async\await_any_of_or_fail;

$coroutines = [];
for ($i = 0; $i < 5; $i++) {
    $coroutines[] = spawn(file_get_contents(...), "https://api/server-$i");
}

// Auf beliebige 2 erfolgreiche Antworten warten
$results = await_any_of_or_fail(2, $coroutines);
echo count($results); // 2
?>
```

## Hinweise

> **Hinweis:** Der Parameter `triggers` akzeptiert jedes `iterable`, einschliesslich `Iterator`-Implementierungen. Siehe das [Iterator-Beispiel](/de/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Siehe auch

- [await_any_of()](/de/docs/reference/await-any-of.html) — erste N mit Fehlertoleranz
- [await_all_or_fail()](/de/docs/reference/await-all-or-fail.html) — alle Aufgaben
