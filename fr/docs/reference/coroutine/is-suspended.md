---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/is-suspended.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/is-suspended.html
page_title: "Coroutine::isSuspended"
description: "Vérifier si la coroutine est suspendue."
---

# Coroutine::isSuspended

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isSuspended(): bool
```

Vérifie si la coroutine est suspendue. Une coroutine devient suspendue lorsque `suspend()` est appelé, pendant les opérations d'E/S ou pendant l'attente avec `await()`.

## Valeur de retour

`bool` -- `true` si la coroutine est suspendue.

## Exemples

### Exemple #1 Vérification de la suspension

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

suspend(); // laisser la coroutine démarrer et se suspendre

var_dump($coroutine->isSuspended()); // bool(true)
var_dump($coroutine->isStarted());   // bool(true)
var_dump($coroutine->isCompleted()); // bool(false)
```

## Voir aussi

- [Coroutine::isRunning](/fr/docs/reference/coroutine/is-running.html) -- Vérifier l'exécution
- [Coroutine::getTrace](/fr/docs/reference/coroutine/get-trace.html) -- Pile d'appels d'une coroutine suspendue
- [suspend()](/fr/docs/reference/suspend.html) -- Suspendre la coroutine courante
