---
layout: docs
lang: de
path_key: "/docs/reference/task-group/construct.html"
nav_active: docs
permalink: /de/docs/reference/task-group/construct.html
page_title: "TaskGroup::__construct"
description: "Eine neue TaskGroup mit optionalem Parallelitaetslimit erstellen."
---

# TaskGroup::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Erstellt eine neue Aufgabengruppe.

## Parameter

**concurrency**
: Maximale Anzahl gleichzeitig laufender Coroutinen.
  `null` --- kein Limit, alle Aufgaben werden sofort gestartet.
  Wenn das Limit erreicht ist, werden neue Aufgaben in eine Warteschlange gestellt
  und automatisch gestartet, sobald ein Platz frei wird.

**scope**
: Uebergeordneter Scope. TaskGroup erstellt einen untergeordneten Scope fuer ihre Coroutinen.
  `null` --- der aktuelle Scope wird geerbt.

## Beispiele

### Beispiel #1 Ohne Limits

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup();
$group->spawn(fn() => "Aufgabe 1"); // startet sofort
$group->spawn(fn() => "Aufgabe 2"); // startet sofort
$group->spawn(fn() => "Aufgabe 3"); // startet sofort
```

### Beispiel #2 Mit Parallelitaetslimit

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup(concurrency: 2);
$group->spawn(fn() => "Aufgabe 1"); // startet sofort
$group->spawn(fn() => "Aufgabe 2"); // startet sofort
$group->spawn(fn() => "Aufgabe 3"); // wartet in der Warteschlange
```

## Siehe auch

- [TaskGroup::spawn](/de/docs/reference/task-group/spawn.html) --- Eine Aufgabe hinzufuegen
- [Scope](/de/docs/components/scope.html) --- Verwaltung des Coroutine-Lebenszyklus
