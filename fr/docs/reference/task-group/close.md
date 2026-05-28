---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/close.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/close.html
page_title: "TaskGroup::close"
description: "Fermer le groupe pour empecher l'ajout de nouvelles taches."
---

# TaskGroup::close

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::close(): void
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
    $group->close();

    try {
        $group->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## Voir aussi

- [TaskGroup::cancel](/fr/docs/reference/task-group/cancel.html) --- Annuler toutes les taches (appelle implicitement close)
- [TaskGroup::isClosed](/fr/docs/reference/task-group/is-closed.html) --- Verifier si le groupe est scelle
