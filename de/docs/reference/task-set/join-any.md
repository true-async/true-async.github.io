---
layout: docs
lang: de
path_key: "/docs/reference/task-set/join-any.html"
nav_active: docs
permalink: /de/docs/reference/task-set/join-any.html
page_title: "TaskSet::joinAny"
description: "Das Ergebnis des ersten erfolgreich abgeschlossenen Tasks mit automatischer Entfernung aus dem Set abrufen."
---

# TaskSet::joinAny

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinAny(): Async\Future
```

Gibt ein `Future` zurück, das mit dem Ergebnis des ersten *erfolgreich* abgeschlossenen Tasks aufgelöst wird.
Tasks, die mit einem Fehler abgeschlossen wurden, werden übersprungen.

**Nach der Auslieferung des Ergebnisses wird der Eintrag automatisch aus dem Set entfernt.**

Die verbleibenden Tasks laufen weiter.

Wenn alle Tasks mit Fehlern abgeschlossen wurden, wird das `Future` mit `CompositeException` abgelehnt.

Das zurückgegebene `Future` unterstützt ein Cancellation-Token über `await(?Completable $cancellation)`.

## Rückgabewert

`Async\Future` — ein zukünftiges Ergebnis des ersten erfolgreichen Tasks.
Rufen Sie `->await()` auf, um den Wert zu erhalten.

## Fehler

- Wirft `Async\AsyncException`, wenn das Set leer ist.
- Das `Future` wird mit `Async\CompositeException` abgelehnt, wenn alle Tasks mit Fehlern abgeschlossen wurden.

## Beispiele

### Beispiel #1 Erstes erfolgreiches Ergebnis

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => throw new \RuntimeException("fail 1"));
    $set->spawn(fn() => throw new \RuntimeException("fail 2"));
    $set->spawn(fn() => "success!");

    $result = $set->joinAny()->await();
    echo $result . "\n"; // "success!"
    echo $set->count() . "\n"; // 2 (fehlgeschlagene Tasks verbleiben)
});
```

### Beispiel #2 Alle Tasks fehlgeschlagen

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => throw new \RuntimeException("err 1"));
    $set->spawn(fn() => throw new \RuntimeException("err 2"));

    $set->seal();

    try {
        $set->joinAny()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " Fehler\n"; // "2 Fehler"
    }
});
```

### Beispiel #3 Fehlertolerante Suche

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => searchGoogle($query));
    $set->spawn(fn() => searchBing($query));
    $set->spawn(fn() => searchDuckDuckGo($query));

    $result = $set->joinAny()->await(Async\timeout(3.0));
    echo "Gefunden, aktiv: {$set->count()}\n";
});
```

## Siehe auch

- [TaskSet::joinNext](/de/docs/reference/task-set/join-next.html) — Erster abgeschlossener Task (Erfolg oder Fehler)
- [TaskSet::joinAll](/de/docs/reference/task-set/join-all.html) — Alle Ergebnisse
- [TaskGroup::any](/de/docs/reference/task-group/any.html) — Entsprechung ohne automatische Bereinigung
