---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/cancel.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/cancel.html
page_title: "TaskGroup::cancel"
description: "Annuler toutes les taches du groupe."
---

# TaskGroup::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Annule toutes les coroutines en cours d'execution et les taches en file d'attente.
Appelle implicitement `seal()`. Les taches en file d'attente ne sont jamais demarrees.

Les coroutines recoivent une `AsyncCancellation` et se terminent.
L'annulation se fait de maniere asynchrone --- utilisez `awaitCompletion()` pour garantir la fin.

## Parametres

**cancellation**
: L'exception servant de raison d'annulation. Si `null`, une `AsyncCancellation` standard avec le message "TaskGroup cancelled" est utilisee.

## Exemples

### Exemple #1 Annulation avec attente de fin

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        Async\delay(10000);
        return "long task";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "toutes les taches annulees\n";
});
```

### Exemple #2 Annulation avec une raison

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => Async\delay(10000));

    $group->cancel(new \Async\AsyncCancellation("Timeout exceeded"));
    $group->awaitCompletion();
});
```

## Voir aussi

- [TaskGroup::seal](/fr/docs/reference/task-group/seal.html) --- Sceller sans annulation
- [TaskGroup::awaitCompletion](/fr/docs/reference/task-group/await-completion.html) --- Attendre la fin
- [TaskGroup::dispose](/fr/docs/reference/task-group/dispose.html) --- Liberer le scope du groupe
