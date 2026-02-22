---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/count.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/count.html
page_title: "TaskGroup::count"
description: "Obtenir le nombre total de taches dans le groupe."
---

# TaskGroup::count

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::count(): int
```

Retourne le nombre total de taches dans le groupe : en file d'attente, en cours d'execution et terminees.

TaskGroup implemente l'interface `Countable`, vous pouvez donc utiliser `count($group)`.

## Valeur de retour

Le nombre total de taches (`int`).

## Exemples

### Exemple #1 Comptage des taches

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 2);

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");
    $group->spawn(fn() => "c");

    echo count($group); // 3

    $group->seal();
    $group->all();

    echo count($group); // 3
});
```

## Voir aussi

- [TaskGroup::isFinished](/fr/docs/reference/task-group/is-finished.html) --- Verifier si toutes les taches sont terminees
- [TaskGroup::isSealed](/fr/docs/reference/task-group/is-sealed.html) --- Verifier si le groupe est scelle
