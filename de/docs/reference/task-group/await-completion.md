---
layout: docs
lang: de
path_key: "/docs/reference/task-group/await-completion.html"
nav_active: docs
permalink: /de/docs/reference/task-group/await-completion.html
page_title: "TaskGroup::awaitCompletion"
description: "Auf den Abschluss aller Aufgaben warten, ohne Ausnahmen zu werfen."
---

# TaskGroup::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::awaitCompletion(): void
```

Wartet, bis alle Aufgaben in der Gruppe vollstaendig abgeschlossen sind.
Im Gegensatz zu `all()` gibt sie keine Ergebnisse zurueck und wirft keine Ausnahmen bei Aufgabenfehlern.

Die Gruppe muss vor dem Aufruf dieser Methode versiegelt sein.

Ein typischer Anwendungsfall ist das Warten auf das tatsaechliche Ende von Coroutinen nach `cancel()`.
Die Methode `cancel()` leitet den Abbruch ein, aber Coroutinen koennen asynchron enden.
`awaitCompletion()` garantiert, dass alle Coroutinen gestoppt haben.

## Fehler

Wirft `Async\AsyncException`, wenn die Gruppe nicht versiegelt ist.

## Beispiele

### Beispiel #1 Warten nach cancel

```php
<?php

use Async\TaskGroup;
use function Async\suspend;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        suspend();
        return "Ergebnis";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "Alle Coroutinen beendet\n";
    var_dump($group->isFinished()); // bool(true)
});
```

### Beispiel #2 Ergebnisse nach dem Warten abrufen

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fehlgeschlagen"));

    $group->seal();
    $group->awaitCompletion();

    // Keine Ausnahmen — manuell pruefen
    $results = $group->getResults();
    $errors = $group->getErrors();

    echo "Erfolgreich: " . count($results) . "\n"; // 1
    echo "Fehler: " . count($errors) . "\n";       // 1
});
```

## Siehe auch

- [TaskGroup::all](/de/docs/reference/task-group/all.html) --- Auf alle Aufgaben warten und Ergebnisse erhalten
- [TaskGroup::cancel](/de/docs/reference/task-group/cancel.html) --- Alle Aufgaben abbrechen
- [TaskGroup::seal](/de/docs/reference/task-group/seal.html) --- Die Gruppe versiegeln
