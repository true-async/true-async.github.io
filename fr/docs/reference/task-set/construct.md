---
layout: docs
lang: fr
path_key: "/docs/reference/task-set/construct.html"
nav_active: docs
permalink: /fr/docs/reference/task-set/construct.html
page_title: "TaskSet::__construct"
description: "Créer un nouveau TaskSet avec une limite de concurrence optionnelle."
---

# TaskSet::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Crée un nouvel ensemble de tâches avec nettoyage automatique des résultats après livraison.

## Paramètres

**concurrency**
: Nombre maximum de coroutines s'exécutant simultanément.
  `null` — aucune limite, toutes les tâches démarrent immédiatement.
  Lorsque la limite est atteinte, les nouvelles tâches sont placées dans une file d'attente
  et démarrées automatiquement lorsqu'un emplacement se libère.

**scope**
: Scope parent. TaskSet crée un scope enfant pour ses coroutines.
  `null` — le scope courant est hérité.

## Exemples

### Exemple #1 Sans limite

```php
<?php

use Async\TaskSet;

$set = new TaskSet();
$set->spawn(fn() => "task 1"); // démarre immédiatement
$set->spawn(fn() => "task 2"); // démarre immédiatement
$set->spawn(fn() => "task 3"); // démarre immédiatement
```

### Exemple #2 Avec limite de concurrence

```php
<?php

use Async\TaskSet;

$set = new TaskSet(concurrency: 2);
$set->spawn(fn() => "task 1"); // démarre immédiatement
$set->spawn(fn() => "task 2"); // démarre immédiatement
$set->spawn(fn() => "task 3"); // attend dans la file
```

## Voir aussi

- [TaskSet::spawn](/fr/docs/reference/task-set/spawn.html) — Ajouter une tâche
- [TaskGroup::__construct](/fr/docs/reference/task-group/construct.html) — Constructeur de TaskGroup
