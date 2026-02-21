---
layout: docs
lang: it
path_key: "/docs/reference/task-group/spawn-with-key.html"
nav_active: docs
permalink: /it/docs/reference/task-group/spawn-with-key.html
page_title: "TaskGroup::spawnWithKey"
description: "Aggiunge un task al gruppo con una chiave esplicita."
---

# TaskGroup::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Aggiunge un callable al gruppo con la chiave specificata.
Il risultato del task sarà accessibile tramite questa chiave in `all()`, `getResults()` e durante l'iterazione.

## Parametri

**key**
: La chiave del task. Una stringa o un intero. I duplicati non sono consentiti.

**task**
: Il callable da eseguire.

**args**
: Argomenti passati al callable.

## Errori

Lancia `Async\AsyncException` se il gruppo è sigillato o la chiave esiste già.

## Esempi

### Esempio #1 Task denominati

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('profile', fn() => ['name' => 'John']);
    $group->spawnWithKey('orders', fn() => [101, 102, 103]);

    $group->seal();
    $results = $group->all();

    var_dump($results['profile']); // array(1) { ["name"]=> string(4) "John" }
    var_dump($results['orders']);   // array(3) { [0]=> int(101) ... }
});
```

## Vedi anche

- [TaskGroup::spawn](/it/docs/reference/task-group/spawn.html) --- Aggiunge un task con una chiave auto-incrementante
- [TaskGroup::all](/it/docs/reference/task-group/all.html) --- Attende tutti i task
