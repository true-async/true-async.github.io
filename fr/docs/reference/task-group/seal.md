---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/seal.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/seal.html
page_title: "TaskGroup::seal"
description: "Sceller le groupe pour empecher l'ajout de nouvelles taches."
---

# TaskGroup::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::seal(): void
```

Scelle le groupe. Toute tentative d'utilisation de `spawn()` ou `spawnWithKey()` lancera une exception.
Les coroutines deja en cours d'execution et les taches en file d'attente continuent de s'executer.

Les appels repetes sont sans effet.

## Exemples

### Exemple #1 Utilisation de base

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "task");
    $group->seal();

    try {
        $group->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## Voir aussi

- [TaskGroup::cancel](/fr/docs/reference/task-group/cancel.html) --- Annuler toutes les taches (appelle implicitement seal)
- [TaskGroup::isSealed](/fr/docs/reference/task-group/is-sealed.html) --- Verifier si le groupe est scelle
