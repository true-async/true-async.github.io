---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/all.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/all.html
page_title: "TaskGroup::all"
description: "Creer un Future qui se resout avec un tableau de tous les resultats des taches."
---

# TaskGroup::all

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::all(bool $ignoreErrors = false): Async\Future
```

Retourne un `Future` qui se resout avec un tableau de resultats lorsque toutes les taches sont terminees.
Les cles du tableau correspondent aux cles attribuees via `spawn()` / `spawnWithKey()`.

Si les taches sont deja terminees, le `Future` se resout immediatement.

Le `Future` retourne supporte un jeton d'annulation via `await(?Completable $cancellation)`,
ce qui permet de definir un delai d'attente ou une autre strategie d'annulation.

## Parametres

**ignoreErrors**
: Si `false` (par defaut) et qu'il y a des erreurs, le `Future` est rejete avec `CompositeException`.
  Si `true`, les erreurs sont ignorees et le `Future` se resout avec uniquement les resultats reussis.
  Les erreurs peuvent etre recuperees via `getErrors()`.

## Valeur de retour

`Async\Future` --- un resultat futur contenant le tableau des resultats des taches.
Appelez `->await()` pour obtenir la valeur.

## Erreurs

Le `Future` est rejete avec `Async\CompositeException` si `$ignoreErrors = false` et qu'au moins une tache a echoue avec une erreur.

## Exemples

### Exemple #1 Utilisation de base

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('a', fn() => 10);
    $group->spawnWithKey('b', fn() => 20);
    $group->spawnWithKey('c', fn() => 30);

    $group->seal();
    $results = $group->all()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)
});
```

### Exemple #2 Gestion des erreurs

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    try {
        $group->all()->await();
    } catch (\Async\CompositeException $e) {
        foreach ($e->getExceptions() as $ex) {
            echo $ex->getMessage() . "\n"; // "fail"
        }
    }
});
```

### Exemple #3 Ignorer les erreurs

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    $results = $group->all(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1

    $errors = $group->getErrors();
    echo count($errors) . "\n"; // 1
});
```

### Exemple #4 Attente avec un delai d'expiration

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => slowApi()->fetchReport());
    $group->spawn(fn() => anotherApi()->fetchStats());
    $group->seal();

    $timeout = Async\timeout(5.0);

    try {
        $results = $group->all()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Impossible d'obtenir les donnees en 5 secondes\n";
    }
});
```

## Voir aussi

- [TaskGroup::awaitCompletion](/fr/docs/reference/task-group/await-completion.html) --- Attendre la fin sans exceptions
- [TaskGroup::getResults](/fr/docs/reference/task-group/get-results.html) --- Obtenir les resultats sans attente
- [TaskGroup::getErrors](/fr/docs/reference/task-group/get-errors.html) --- Obtenir les erreurs
