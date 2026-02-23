---
layout: docs
lang: de
path_key: "/docs/reference/task-set/join-next.html"
nav_active: docs
permalink: /de/docs/reference/task-set/join-next.html
page_title: "TaskSet::joinNext"
description: "Das Ergebnis des ersten abgeschlossenen Tasks mit automatischer Entfernung aus dem Set abrufen."
---

# TaskSet::joinNext

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinNext(): Async\Future
```

Gibt ein `Future` zurück, das mit dem Ergebnis des ersten abgeschlossenen Tasks aufgelöst wird — egal ob erfolgreich oder fehlgeschlagen.
Wenn der Task mit einem Fehler abgeschlossen wurde, wird das `Future` mit dieser Exception abgelehnt.

**Nach der Auslieferung des Ergebnisses wird der Eintrag automatisch aus dem Set entfernt**, und `count()` verringert sich um 1.

Die verbleibenden Tasks laufen weiter.

Wenn bereits ein abgeschlossener Task existiert, wird das `Future` sofort aufgelöst.

Das zurückgegebene `Future` unterstützt ein Cancellation-Token über `await(?Completable $cancellation)`.

## Rückgabewert

`Async\Future` — ein zukünftiges Ergebnis des ersten abgeschlossenen Tasks.
Rufen Sie `->await()` auf, um den Wert zu erhalten.

## Fehler

- Wirft `Async\AsyncException`, wenn das Set leer ist.
- Das `Future` wird mit der Exception des Tasks abgelehnt, wenn der erste abgeschlossene Task fehlgeschlagen ist.

## Beispiele

### Beispiel #1 Sequentielle Ergebnisverarbeitung

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => fetchUser(1));
    $set->spawn(fn() => fetchUser(2));
    $set->spawn(fn() => fetchUser(3));

    echo "vorher: count=" . $set->count() . "\n"; // 3

    $first = $set->joinNext()->await();
    echo "nach erstem: count=" . $set->count() . "\n"; // 2

    $second = $set->joinNext()->await();
    echo "nach zweitem: count=" . $set->count() . "\n"; // 1
});
```

### Beispiel #2 Verarbeitungsschleife

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet(concurrency: 5);

    foreach ($urls as $url) {
        $set->spawn(fn() => httpClient()->get($url)->getBody());
    }
    $set->seal();

    while ($set->count() > 0) {
        try {
            $body = $set->joinNext()->await();
            processResponse($body);
        } catch (\Throwable $e) {
            log("Fehler: {$e->getMessage()}");
        }
    }
});
```

### Beispiel #3 Mit Timeout

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => slowApi()->fetchReport());
    $set->spawn(fn() => anotherApi()->fetchStats());

    try {
        $result = $set->joinNext()->await(Async\timeout(5.0));
    } catch (Async\TimeoutException) {
        echo "Kein Task innerhalb von 5 Sekunden abgeschlossen\n";
    }
});
```

## Siehe auch

- [TaskSet::joinAny](/de/docs/reference/task-set/join-any.html) — Erstes erfolgreiches Ergebnis
- [TaskSet::joinAll](/de/docs/reference/task-set/join-all.html) — Alle Ergebnisse
- [TaskGroup::race](/de/docs/reference/task-group/race.html) — Entsprechung ohne automatische Bereinigung
