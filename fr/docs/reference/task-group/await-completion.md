---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/await-completion.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/await-completion.html
page_title: "TaskGroup::awaitCompletion"
description: "Attendre la fin de toutes les taches sans lancer d'exceptions."
---

# TaskGroup::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::awaitCompletion(): void
```

Attend que toutes les taches du groupe soient entierement terminees.
Contrairement a `all()`, elle ne retourne pas de resultats et ne lance pas d'exceptions en cas d'erreurs de taches.

Le groupe doit etre scelle avant d'appeler cette methode.

Un cas d'utilisation typique est d'attendre que les coroutines se terminent reellement apres `cancel()`.
La methode `cancel()` initie l'annulation, mais les coroutines peuvent se terminer de maniere asynchrone.
`awaitCompletion()` garantit que toutes les coroutines se sont arretees.

## Erreurs

Lance `Async\AsyncException` si le groupe n'est pas scelle.

## Exemples

### Exemple #1 Attente apres annulation

```php
<?php

use Async\TaskGroup;
use function Async\suspend;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        suspend();
        return "result";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "toutes les coroutines terminees\n";
    var_dump($group->isFinished()); // bool(true)
});
```

### Exemple #2 Obtention des resultats apres attente

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();
    $group->awaitCompletion();

    // Pas d'exceptions --- verification manuelle
    $results = $group->getResults();
    $errors = $group->getErrors();

    echo "Reussis : " . count($results) . "\n"; // 1
    echo "Erreurs : " . count($errors) . "\n";  // 1
});
```

## Voir aussi

- [TaskGroup::all](/fr/docs/reference/task-group/all.html) --- Attendre toutes les taches et obtenir les resultats
- [TaskGroup::cancel](/fr/docs/reference/task-group/cancel.html) --- Annuler toutes les taches
- [TaskGroup::seal](/fr/docs/reference/task-group/seal.html) --- Sceller le groupe
