---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/finally.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/finally.html
page_title: "TaskGroup::finally"
description: "Enregistrer un gestionnaire de fin pour le groupe."
---

# TaskGroup::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::finally(Closure $callback): void
```

Enregistre un callback qui est invoque lorsque le groupe est scelle et que toutes les taches sont terminees.
Le callback recoit le TaskGroup en parametre.

Comme `cancel()` appelle implicitement `seal()`, le gestionnaire se declenche egalement lors de l'annulation.

Si le groupe est deja termine, le callback est appele immediatement de maniere synchrone.

## Parametres

**callback**
: Une Closure qui prend `TaskGroup` comme seul argument.

## Exemples

### Exemple #1 Journalisation de la fin

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->finally(function(TaskGroup $g) {
        echo "Termine : " . $g->count() . " taches\n";
    });

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");

    $group->seal();
    $group->all();
});
// Sortie :
// Termine : 2 taches
```

### Exemple #2 Appel sur un groupe deja termine

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => 1);
    $group->seal();
    $group->all();

    // Le groupe est deja termine --- le callback est appele de maniere synchrone
    $group->finally(function(TaskGroup $g) {
        echo "appele immediatement\n";
    });

    echo "apres finally\n";
});
// Sortie :
// appele immediatement
// apres finally
```

## Voir aussi

- [TaskGroup::seal](/fr/docs/reference/task-group/seal.html) --- Sceller le groupe
- [TaskGroup::cancel](/fr/docs/reference/task-group/cancel.html) --- Annuler les taches
