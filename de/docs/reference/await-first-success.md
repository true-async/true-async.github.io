---
layout: docs
lang: de
path_key: "/docs/reference/await-first-success.html"
nav_active: docs
permalink: /de/docs/reference/await-first-success.html
page_title: "await_first_success()"
description: "await_first_success() — Warten auf die erste erfolgreich abgeschlossene Aufgabe, Fehler anderer werden ignoriert."
---

# await_first_success

(PHP 8.6+, True Async 1.0)

`await_first_success()` — Wartet auf die **erste erfolgreich** abgeschlossene Aufgabe. Fehler anderer Aufgaben werden separat gesammelt und unterbrechen das Warten nicht.

## Beschreibung

```php
await_first_success(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): array
```

## Parameter

**`triggers`**
Eine iterierbare Sammlung von `Async\Completable`-Objekten.

**`cancellation`**
Ein optionales Awaitable zum Abbrechen des Wartens.

## Rueckgabewerte

Ein Array mit zwei Elementen: `[$result, $errors]`

- `$result` — das Ergebnis der ersten erfolgreich abgeschlossenen Aufgabe (oder `null`, wenn alle Aufgaben fehlgeschlagen sind)
- `$errors` — Array der Ausnahmen von Aufgaben, die vor dem ersten Erfolg fehlgeschlagen sind

## Beispiele

### Beispiel #1 Fehlertolerante Anfrage

```php
<?php
use function Async\spawn;
use function Async\await_first_success;

// Mehrere Server versuchen; die erste erfolgreiche Antwort nehmen
[$result, $errors] = await_first_success([
    spawn(file_get_contents(...), 'https://primary.example.com/api'),
    spawn(file_get_contents(...), 'https://secondary.example.com/api'),
    spawn(file_get_contents(...), 'https://fallback.example.com/api'),
]);

if ($result !== null) {
    echo "Daten empfangen\n";
} else {
    echo "Alle Server nicht erreichbar\n";
    foreach ($errors as $error) {
        echo "  - " . $error->getMessage() . "\n";
    }
}
?>
```

## Hinweise

> **Hinweis:** Der Parameter `triggers` akzeptiert jedes `iterable`, einschliesslich `Iterator`-Implementierungen. Siehe das [Iterator-Beispiel](/de/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Siehe auch

- [await_any_or_fail()](/de/docs/reference/await-any-or-fail.html) — erste Aufgabe, Fehler bricht ab
- [await_all()](/de/docs/reference/await-all.html) — alle Aufgaben mit Fehlertoleranz
