---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/get-errors.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/get-errors.html
page_title: "TaskGroup::getErrors"
description: "Obtenir un tableau d'erreurs des taches echouees."
---

# TaskGroup::getErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getErrors(): array
```

Retourne un tableau d'exceptions (`Throwable`) provenant des taches ayant echoue avec une erreur.
Les cles du tableau correspondent aux cles des taches definies par `spawn()` ou `spawnWithKey()`.

La methode n'attend pas la fin des taches --- elle retourne uniquement les erreurs disponibles au moment de l'appel.

## Valeur de retour

Un `array<int|string, Throwable>` ou la cle est l'identifiant de la tache et la valeur est l'exception.

## Exemples

### Exemple #1 Consultation des erreurs

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('api', function() {
        throw new \RuntimeException("Connection timeout");
    });
    $group->spawn(fn() => "ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    foreach ($group->getErrors() as $key => $error) {
        echo "$key: {$error->getMessage()}\n";
    }
    // api: Connection timeout

    $group->suppressErrors();
});
```

## Erreurs non gerees

Si des erreurs non gerees subsistent lorsqu'un TaskGroup est detruit, le destructeur le signale.
Les erreurs sont considerees comme gerees si :

- `all()` est appele avec `ignoreErrors: false` (par defaut) et lance une `CompositeException`
- `suppressErrors()` est appele
- Les erreurs sont gerees via l'iterateur (`foreach`)

## Voir aussi

- [TaskGroup::getResults](/fr/docs/reference/task-group/get-results.html) --- Obtenir un tableau de resultats
- [TaskGroup::suppressErrors](/fr/docs/reference/task-group/suppress-errors.html) --- Marquer les erreurs comme gerees
- [TaskGroup::all](/fr/docs/reference/task-group/all.html) --- Attendre toutes les taches
