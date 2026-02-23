---
layout: docs
lang: it
path_key: "/docs/reference/task-set/construct.html"
nav_active: docs
permalink: /it/docs/reference/task-set/construct.html
page_title: "TaskSet::__construct"
description: "Creare un nuovo TaskSet con limite di concorrenza opzionale."
---

# TaskSet::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Crea un nuovo insieme di task con pulizia automatica dei risultati dopo la consegna.

## Parametri

**concurrency**
: Numero massimo di coroutine in esecuzione contemporanea.
  `null` — nessun limite, tutti i task vengono avviati immediatamente.
  Quando il limite viene raggiunto, i nuovi task vengono messi in coda
  e avviati automaticamente quando uno slot diventa disponibile.

**scope**
: Scope genitore. TaskSet crea uno scope figlio per le sue coroutine.
  `null` — viene ereditato lo scope corrente.

## Esempi

### Esempio #1 Senza limiti

```php
<?php

use Async\TaskSet;

$set = new TaskSet();
$set->spawn(fn() => "task 1"); // si avvia immediatamente
$set->spawn(fn() => "task 2"); // si avvia immediatamente
$set->spawn(fn() => "task 3"); // si avvia immediatamente
```

### Esempio #2 Con limite di concorrenza

```php
<?php

use Async\TaskSet;

$set = new TaskSet(concurrency: 2);
$set->spawn(fn() => "task 1"); // si avvia immediatamente
$set->spawn(fn() => "task 2"); // si avvia immediatamente
$set->spawn(fn() => "task 3"); // in attesa nella coda
```

## Vedi anche

- [TaskSet::spawn](/it/docs/reference/task-set/spawn.html) — Aggiungere un task
- [TaskGroup::__construct](/it/docs/reference/task-group/construct.html) — Costruttore di TaskGroup
