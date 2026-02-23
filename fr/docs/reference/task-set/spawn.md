---
layout: docs
lang: fr
path_key: "/docs/reference/task-set/spawn.html"
nav_active: docs
permalink: /fr/docs/reference/task-set/spawn.html
page_title: "TaskSet::spawn"
description: "Ajouter une tâche à l'ensemble avec une clé auto-incrémentée."
---

# TaskSet::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawn(callable $task, mixed ...$args): void
```

Ajoute un callable à l'ensemble avec une clé auto-incrémentée (0, 1, 2, ...).

Si aucune limite de concurrence n'est définie ou qu'un emplacement est disponible, la coroutine est créée immédiatement.
Sinon, le callable avec ses arguments est placé dans une file d'attente et démarré lorsqu'un emplacement se libère.

## Paramètres

**task**
: Callable à exécuter. Accepte tout callable : Closure, fonction, méthode.

**args**
: Arguments passés au callable.

## Erreurs

Lance `Async\AsyncException` si l'ensemble est scellé (`seal()`) ou annulé (`cancel()`).

## Exemples

### Exemple #1 Utilisation de base

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "first");
    $set->spawn(fn() => "second");

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### Exemple #2 Avec des arguments

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(function(int $a, int $b) {
        return $a + $b;
    }, 10, 20);

    $set->seal();
    $results = $set->joinAll()->await();
    var_dump($results[0]); // int(30)
});
```

## Voir aussi

- [TaskSet::spawnWithKey](/fr/docs/reference/task-set/spawn-with-key.html) — Ajouter une tâche avec une clé explicite
- [TaskSet::joinAll](/fr/docs/reference/task-set/join-all.html) — Attendre toutes les tâches
