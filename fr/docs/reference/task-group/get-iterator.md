---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/get-iterator.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/get-iterator.html
page_title: "TaskGroup::getIterator"
description: "Obtenir un iterateur pour parcourir les resultats au fur et a mesure que les taches se terminent."
---

# TaskGroup::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getIterator(): Iterator
```

Retourne un iterateur qui produit les resultats **au fur et a mesure que les taches se terminent**.
TaskGroup implemente `IteratorAggregate`, vous pouvez donc utiliser `foreach` directement.

## Comportement de l'iterateur

- `foreach` suspend la coroutine courante jusqu'a ce que le prochain resultat soit disponible
- La cle est celle attribuee via `spawn()` ou `spawnWithKey()`
- La valeur est un tableau `[mixed $result, ?Throwable $error]` :
  - Succes : `[$result, null]`
  - Erreur : `[null, $error]`
- L'iteration se termine lorsque le groupe est scelle **et** que toutes les taches ont ete traitees
- Si le groupe n'est pas scelle, `foreach` suspend en attendant de nouvelles taches

> **Important :** Sans appeler `seal()`, l'iteration attendra indefiniment.

## Exemples

### Exemple #1 Traitement des resultats des qu'ils sont prets

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 3);

    for ($i = 0; $i < 10; $i++) {
        $group->spawn(fn() => fetchUrl($urls[$i]));
    }
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error !== null) {
            echo "Tache $key echouee : {$error->getMessage()}\n";
            continue;
        }
        echo "Tache $key terminee\n";
    }
});
```

### Exemple #2 Iteration avec cles nommees

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('users', fn() => fetchUsers());
    $group->spawnWithKey('orders', fn() => fetchOrders());
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key : " . count($result) . " enregistrements recus\n";
        }
    }
});
```

## Voir aussi

- [TaskGroup::seal](/fr/docs/reference/task-group/seal.html) --- Sceller le groupe
- [TaskGroup::all](/fr/docs/reference/task-group/all.html) --- Attendre toutes les taches
- [TaskGroup::getResults](/fr/docs/reference/task-group/get-results.html) --- Obtenir un tableau de resultats
