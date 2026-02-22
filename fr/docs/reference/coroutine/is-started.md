---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/is-started.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/is-started.html
page_title: "Coroutine::isStarted"
description: "Vérifier si la coroutine a été démarrée par l'ordonnanceur."
---

# Coroutine::isStarted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isStarted(): bool
```

Vérifie si la coroutine a été démarrée par l'ordonnanceur. Une coroutine est considérée comme démarrée après que l'ordonnanceur a commencé son exécution.

## Valeur de retour

`bool` -- `true` si la coroutine a été démarrée.

## Exemples

### Exemple #1 Vérification avant et après le démarrage

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isStarted()); // bool(false) -- encore dans la file

suspend(); // laisser l'ordonnanceur démarrer la coroutine

var_dump($coroutine->isStarted()); // bool(true)

await($coroutine);

var_dump($coroutine->isStarted()); // bool(true) -- toujours true après la terminaison
```

## Voir aussi

- [Coroutine::isQueued](/fr/docs/reference/coroutine/is-queued.html) -- Vérifier l'état dans la file
- [Coroutine::isRunning](/fr/docs/reference/coroutine/is-running.html) -- Vérifier si en cours d'exécution
- [Coroutine::isCompleted](/fr/docs/reference/coroutine/is-completed.html) -- Vérifier la terminaison
