---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/suppress-errors.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/suppress-errors.html
page_title: "TaskGroup::suppressErrors"
description: "Marquer toutes les erreurs actuelles comme gerees."
---

# TaskGroup::suppressErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::suppressErrors(): void
```

Marque toutes les erreurs actuelles du groupe comme gerees.

Lorsqu'un TaskGroup est detruit, il verifie la presence d'erreurs non gerees. Si les erreurs n'ont pas ete gerees
(via `all()`, `foreach` ou `suppressErrors()`), le destructeur signale les erreurs perdues.
Appeler `suppressErrors()` est une confirmation explicite que les erreurs ont ete gerees.

## Exemples

### Exemple #1 Suppression des erreurs apres gestion selective

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail 1"); });
    $group->spawn(function() { throw new \LogicException("fail 2"); });

    $group->seal();
    $group->all(ignoreErrors: true);

    // Gerer les erreurs manuellement
    foreach ($group->getErrors() as $key => $error) {
        log_error("Task $key: {$error->getMessage()}");
    }

    // Marquer les erreurs comme gerees
    $group->suppressErrors();
});
```

## Voir aussi

- [TaskGroup::getErrors](/fr/docs/reference/task-group/get-errors.html) --- Obtenir un tableau d'erreurs
- [TaskGroup::all](/fr/docs/reference/task-group/all.html) --- Attendre toutes les taches
