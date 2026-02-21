---
layout: docs
lang: de
path_key: "/docs/reference/await-any-of.html"
nav_active: docs
permalink: /de/docs/reference/await-any-of.html
page_title: "await_any_of()"
description: "await_any_of() — Warten auf die ersten N Aufgaben mit Toleranz fuer teilweise Fehler."
---

# await_any_of

(PHP 8.6+, True Async 1.0)

`await_any_of()` — Wartet auf die **ersten N** abgeschlossenen Aufgaben und sammelt Ergebnisse und Fehler separat. Wirft keine Ausnahme, wenn einzelne Aufgaben fehlschlagen.

## Beschreibung

```php
await_any_of(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Parameter

**`count`**
Die Anzahl der erfolgreichen Ergebnisse, auf die gewartet werden soll.

**`triggers`**
Eine iterierbare Sammlung von `Async\Completable`-Objekten.

**`cancellation`**
Ein optionales Awaitable zum Abbrechen des Wartens.

**`preserveKeyOrder`**
Wenn `true`, entsprechen die Ergebnisschluessel den Schluesseln des Eingabearrays.

**`fillNull`**
Wenn `true`, wird `null` im Ergebnisarray fuer fehlgeschlagene Aufgaben eingesetzt.

## Rueckgabewerte

Ein Array mit zwei Elementen: `[$results, $errors]`

- `$results` — Array der erfolgreichen Ergebnisse (bis zu `$count` Eintraege)
- `$errors` — Array der Ausnahmen von fehlgeschlagenen Aufgaben

## Beispiele

### Beispiel #1 Quorum mit Fehlertoleranz

```php
<?php
use function Async\spawn;
use function Async\await_any_of;

$nodes = ['node1', 'node2', 'node3', 'node4', 'node5'];

$coroutines = [];
foreach ($nodes as $node) {
    $coroutines[$node] = spawn(file_get_contents(...), "https://$node/vote");
}

// Auf Quorum warten: 3 von 5 Antworten
[$results, $errors] = await_any_of(3, $coroutines);

if (count($results) >= 3) {
    echo "Quorum erreicht\n";
} else {
    echo "Quorum nicht erreicht, Fehler: " . count($errors) . "\n";
}
?>
```

## Hinweise

> **Hinweis:** Der Parameter `triggers` akzeptiert jedes `iterable`, einschliesslich `Iterator`-Implementierungen. Siehe das [Iterator-Beispiel](/de/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Siehe auch

- [await_any_of_or_fail()](/de/docs/reference/await-any-of-or-fail.html) — erste N, Fehler bricht ab
- [await_all()](/de/docs/reference/await-all.html) — alle Aufgaben mit Fehlertoleranz
