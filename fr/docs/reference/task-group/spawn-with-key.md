---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/spawn-with-key.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/spawn-with-key.html
page_title: "TaskGroup::spawnWithKey"
description: "Ajouter une tache au groupe avec une cle explicite."
---

# TaskGroup::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Ajoute un callable au groupe avec la cle specifiee.
Le resultat de la tache sera accessible par cette cle dans `all()`, `getResults()` et lors de l'iteration.

## Parametres

**key**
: La cle de la tache. Une chaine ou un entier. Les doublons ne sont pas autorises.

**task**
: Le callable a executer.

**args**
: Arguments passes au callable.

## Erreurs

Lance `Async\AsyncException` si le groupe est scelle ou si la cle existe deja.

## Exemples

### Exemple #1 Taches nommees

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

## Voir aussi

- [TaskGroup::spawn](/fr/docs/reference/task-group/spawn.html) --- Ajouter une tache avec une cle auto-incrementee
- [TaskGroup::all](/fr/docs/reference/task-group/all.html) --- Attendre toutes les taches
