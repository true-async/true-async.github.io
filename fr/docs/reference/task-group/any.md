---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/any.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/any.html
page_title: "TaskGroup::any"
description: "Creer un Future qui se resout avec le resultat de la premiere tache reussie."
---

# TaskGroup::any

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::any(): Async\Future
```

Retourne un `Future` qui se resout avec le resultat de la premiere tache terminee *avec succes*.
Les taches ayant echoue avec une erreur sont ignorees.
Les taches restantes **continuent de s'executer**.

Si toutes les taches echouent avec des erreurs, le `Future` est rejete avec `CompositeException`.

Le `Future` retourne supporte un jeton d'annulation via `await(?Completable $cancellation)`.

## Valeur de retour

`Async\Future` --- un resultat futur de la premiere tache reussie.
Appelez `->await()` pour obtenir la valeur.

## Erreurs

- Lance `Async\AsyncException` si le groupe est vide.
- Le `Future` est rejete avec `Async\CompositeException` si toutes les taches echouent avec des erreurs.

## Exemples

### Exemple #1 Premiere reussie

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("fail 1"));
    $group->spawn(fn() => throw new \RuntimeException("fail 2"));
    $group->spawn(fn() => "success!");

    $result = $group->any()->await();
    echo $result . "\n"; // "success!"

    // Les erreurs des taches echouees doivent etre explicitement supprimees
    $group->suppressErrors();
});
```

### Exemple #2 Toutes echouees

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("err 1"));
    $group->spawn(fn() => throw new \RuntimeException("err 2"));

    $group->seal();

    try {
        $group->any()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " errors\n"; // "2 errors"
    }
});
```

### Exemple #3 Recherche resiliente avec delai d'expiration

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => searchGoogle($query));
    $group->spawn(fn() => searchBing($query));
    $group->spawn(fn() => searchDuckDuckGo($query));

    $timeout = Async\timeout(3.0);

    try {
        $result = $group->any()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Aucun fournisseur n'a repondu en 3 secondes\n";
    }

    $group->suppressErrors();
});
```

## Voir aussi

- [TaskGroup::race](/fr/docs/reference/task-group/race.html) --- Premier termine (succes ou erreur)
- [TaskGroup::all](/fr/docs/reference/task-group/all.html) --- Tous les resultats
