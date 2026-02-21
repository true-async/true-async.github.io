---
layout: docs
lang: de
path_key: "/docs/reference/await-any-or-fail.html"
nav_active: docs
permalink: /de/docs/reference/await-any-or-fail.html
page_title: "await_any_or_fail()"
description: "await_any_or_fail() — Warten auf die erste abgeschlossene Aufgabe."
---

# await_any_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_or_fail()` — Wartet auf die **erste** abgeschlossene Aufgabe. Wenn die erste abgeschlossene Aufgabe eine Ausnahme geworfen hat, wird diese weitergegeben.

## Beschreibung

```php
await_any_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): mixed
```

## Parameter

**`triggers`**
Eine iterierbare Sammlung von `Async\Completable`-Objekten.

**`cancellation`**
Ein optionales Awaitable zum Abbrechen des Wartens.

## Rueckgabewerte

Das Ergebnis der ersten abgeschlossenen Aufgabe.

## Fehler/Ausnahmen

Wenn die erste abgeschlossene Aufgabe eine Ausnahme geworfen hat, wird diese weitergegeben.

## Beispiele

### Beispiel #1 Anfrage-Wettrennen

```php
<?php
use function Async\spawn;
use function Async\await_any_or_fail;

// Wer zuerst antwortet, gewinnt
$result = await_any_or_fail([
    spawn(file_get_contents(...), 'https://mirror1.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror2.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror3.example.com/data'),
]);

echo "Antwort vom schnellsten Mirror empfangen\n";
?>
```

## Hinweise

> **Hinweis:** Der Parameter `triggers` akzeptiert jedes `iterable`, einschliesslich `Iterator`-Implementierungen. Siehe das [Iterator-Beispiel](/de/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Siehe auch

- [await_first_success()](/de/docs/reference/await-first-success.html) — erster Erfolg, Fehler werden ignoriert
- [await_all_or_fail()](/de/docs/reference/await-all-or-fail.html) — alle Aufgaben
