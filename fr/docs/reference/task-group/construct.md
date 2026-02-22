---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/construct.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/construct.html
page_title: "TaskGroup::__construct"
description: "Creer un nouveau TaskGroup avec une limite de concurrence optionnelle."
---

# TaskGroup::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Cree un nouveau groupe de taches.

## Parametres

**concurrency**
: Nombre maximum de coroutines s'executant simultanement.
  `null` --- pas de limite, toutes les taches sont demarrees immediatement.
  Lorsque la limite est atteinte, les nouvelles taches sont placees dans une file d'attente
  et demarrees automatiquement lorsqu'un emplacement se libere.

**scope**
: Scope parent. TaskGroup cree un scope enfant pour ses coroutines.
  `null` --- le scope actuel est herite.

## Exemples

### Exemple #1 Sans limites

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup();
$group->spawn(fn() => "task 1"); // demarre immediatement
$group->spawn(fn() => "task 2"); // demarre immediatement
$group->spawn(fn() => "task 3"); // demarre immediatement
```

### Exemple #2 Avec limite de concurrence

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup(concurrency: 2);
$group->spawn(fn() => "task 1"); // demarre immediatement
$group->spawn(fn() => "task 2"); // demarre immediatement
$group->spawn(fn() => "task 3"); // attend dans la file d'attente
```

## Voir aussi

- [TaskGroup::spawn](/fr/docs/reference/task-group/spawn.html) --- Ajouter une tache
- [Scope](/fr/docs/components/scope.html) --- Gestion du cycle de vie des coroutines
