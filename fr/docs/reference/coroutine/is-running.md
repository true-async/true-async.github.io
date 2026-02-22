---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/is-running.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/is-running.html
page_title: "Coroutine::isRunning"
description: "Vérifier si la coroutine est en cours d'exécution."
---

# Coroutine::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isRunning(): bool
```

Vérifie si la coroutine est en cours d'exécution. Une coroutine est considérée comme en cours d'exécution si elle a été démarrée et n'est pas encore terminée.

## Valeur de retour

`bool` -- `true` si la coroutine est en cours d'exécution et non terminée.

## Exemples

### Exemple #1 Vérification de l'état d'exécution

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    // À l'intérieur de la coroutine isRunning() == true
    var_dump(\Async\current_coroutine()->isRunning()); // bool(true)
    return "done";
});

// À l'extérieur -- la coroutine est suspendue ou pas encore démarrée
var_dump($coroutine->isRunning()); // bool(false)
```

## Voir aussi

- [Coroutine::isStarted](/fr/docs/reference/coroutine/is-started.html) -- Vérifier si démarrée
- [Coroutine::isSuspended](/fr/docs/reference/coroutine/is-suspended.html) -- Vérifier la suspension
- [Coroutine::isCompleted](/fr/docs/reference/coroutine/is-completed.html) -- Vérifier la terminaison
