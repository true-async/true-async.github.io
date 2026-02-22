---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/spawn.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/spawn.html
page_title: "TaskGroup::spawn"
description: "Ajouter une tache au groupe avec une cle auto-incrementee."
---

# TaskGroup::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawn(callable $task, mixed ...$args): void
```

Ajoute un callable au groupe avec une cle auto-incrementee (0, 1, 2, ...).

Si aucune limite de concurrence n'est definie ou qu'un emplacement est disponible, la coroutine est creee immediatement.
Sinon, le callable avec ses arguments est place dans une file d'attente et demarre lorsqu'un emplacement se libere.

## Parametres

**task**
: Le callable a executer. Accepte tout callable : Closure, fonction, methode.

**args**
: Arguments passes au callable.

## Erreurs

Lance `Async\AsyncException` si le groupe est scelle (`seal()`) ou annule (`cancel()`).

## Exemples

### Exemple #1 Utilisation de base

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "first");
    $group->spawn(fn() => "second");

    $group->seal();
    $results = $group->all();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### Exemple #2 Avec des arguments

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function(int $id) {
        return "user:$id";
    }, 42);

    $group->seal();
    $results = $group->all();
    var_dump($results[0]); // string(7) "user:42"
});
```

## Voir aussi

- [TaskGroup::spawnWithKey](/fr/docs/reference/task-group/spawn-with-key.html) --- Ajouter une tache avec une cle explicite
- [TaskGroup::all](/fr/docs/reference/task-group/all.html) --- Attendre toutes les taches
