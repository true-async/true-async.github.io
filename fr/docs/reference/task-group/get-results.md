---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/get-results.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/get-results.html
page_title: "TaskGroup::getResults"
description: "Obtenir un tableau de resultats des taches terminees."
---

# TaskGroup::getResults

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getResults(): array
```

Retourne un tableau de resultats des taches terminees avec succes.
Les cles du tableau correspondent aux cles attribuees via `spawn()` (auto-increment) ou `spawnWithKey()` (personnalise).

La methode n'attend pas la fin des taches --- elle retourne uniquement les resultats disponibles au moment de l'appel.

## Valeur de retour

Un `array<int|string, mixed>` ou la cle est l'identifiant de la tache et la valeur est le resultat de l'execution.

## Exemples

### Exemple #1 Obtention des resultats apres all()

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('user', fn() => ['name' => 'Alice']);
    $group->spawnWithKey('orders', fn() => [101, 102]);

    $group->seal();
    $group->all();

    $results = $group->getResults();
    // ['user' => ['name' => 'Alice'], 'orders' => [101, 102]]
});
```

### Exemple #2 Les resultats ne contiennent pas les erreurs

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail"); });
    $group->spawn(fn() => "also ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    $results = $group->getResults();
    // [0 => "ok", 2 => "also ok"]

    $errors = $group->getErrors();
    // [1 => RuntimeException("fail")]

    $group->suppressErrors();
});
```

## Voir aussi

- [TaskGroup::getErrors](/fr/docs/reference/task-group/get-errors.html) --- Obtenir un tableau d'erreurs
- [TaskGroup::all](/fr/docs/reference/task-group/all.html) --- Attendre toutes les taches
- [TaskGroup::suppressErrors](/fr/docs/reference/task-group/suppress-errors.html) --- Marquer les erreurs comme gerees
