---
layout: docs
lang: de
path_key: "/docs/reference/task-set/construct.html"
nav_active: docs
permalink: /de/docs/reference/task-set/construct.html
page_title: "TaskSet::__construct"
description: "Ein neues TaskSet mit optionalem Nebenläufigkeitslimit erstellen."
---

# TaskSet::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Erstellt ein neues Task-Set mit automatischer Bereinigung der Ergebnisse nach der Auslieferung.

## Parameter

**concurrency**
: Maximale Anzahl gleichzeitig laufender Coroutinen.
  `null` — kein Limit, alle Tasks starten sofort.
  Wenn das Limit erreicht ist, werden neue Tasks in eine Warteschlange eingereiht
  und automatisch gestartet, sobald ein Slot frei wird.

**scope**
: Übergeordneter Scope. TaskSet erstellt einen untergeordneten Scope für seine Coroutinen.
  `null` — der aktuelle Scope wird geerbt.

## Beispiele

### Beispiel #1 Ohne Limits

```php
<?php

use Async\TaskSet;

$set = new TaskSet();
$set->spawn(fn() => "task 1"); // startet sofort
$set->spawn(fn() => "task 2"); // startet sofort
$set->spawn(fn() => "task 3"); // startet sofort
```

### Beispiel #2 Mit Nebenläufigkeitslimit

```php
<?php

use Async\TaskSet;

$set = new TaskSet(concurrency: 2);
$set->spawn(fn() => "task 1"); // startet sofort
$set->spawn(fn() => "task 2"); // startet sofort
$set->spawn(fn() => "task 3"); // wartet in der Warteschlange
```

## Siehe auch

- [TaskSet::spawn](/de/docs/reference/task-set/spawn.html) — Einen Task hinzufügen
- [TaskGroup::__construct](/de/docs/reference/task-group/construct.html) — TaskGroup-Konstruktor
