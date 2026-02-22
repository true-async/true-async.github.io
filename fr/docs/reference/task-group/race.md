---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/race.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/race.html
page_title: "TaskGroup::race"
description: "Creer un Future qui se resout avec le resultat de la premiere tache terminee."
---

# TaskGroup::race

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::race(): Async\Future
```

Retourne un `Future` qui se resout avec le resultat de la premiere tache terminee --- qu'elle ait reussi ou echoue.
Si la tache a echoue avec une erreur, le `Future` est rejete avec cette exception.
Les taches restantes **continuent de s'executer**.

Si une tache terminee existe deja, le `Future` se resout immediatement.

Le `Future` retourne supporte un jeton d'annulation via `await(?Completable $cancellation)`.

## Valeur de retour

`Async\Future` --- un resultat futur de la premiere tache terminee.
Appelez `->await()` pour obtenir la valeur.

## Erreurs

- Lance `Async\AsyncException` si le groupe est vide.
- Le `Future` est rejete avec l'exception de la tache si la premiere tache terminee a echoue avec une erreur.

## Exemples

### Exemple #1 Premiere reponse

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() { delay(100); return "slow"; });
    $group->spawn(fn() => "fast");

    $winner = $group->race()->await();
    echo $winner . "\n"; // "fast"
});
```

### Exemple #2 Requetes hedgees avec delai d'expiration

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];
    $group = new TaskGroup();

    foreach ($replicas as $host) {
        $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
    }

    $timeout = Async\timeout(2.0);

    try {
        $product = $group->race()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Aucune replique n'a repondu en 2 secondes\n";
    }
});
```

## Voir aussi

- [TaskGroup::any](/fr/docs/reference/task-group/any.html) --- Premier resultat reussi
- [TaskGroup::all](/fr/docs/reference/task-group/all.html) --- Tous les resultats
