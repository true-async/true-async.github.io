---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/is-queued.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/is-queued.html
page_title: "Coroutine::isQueued"
description: "Vérifier si la coroutine est dans la file d'attente de l'ordonnanceur."
---

# Coroutine::isQueued

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isQueued(): bool
```

Vérifie si la coroutine est dans la file d'attente de l'ordonnanceur pour l'exécution.

## Valeur de retour

`bool` -- `true` si la coroutine est dans la file d'attente.

## Exemples

### Exemple #1 État de la file d'attente

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

var_dump($coroutine->isQueued()); // bool(true) -- en attente de démarrage

suspend(); // laisser l'ordonnanceur démarrer la coroutine

// La coroutine a démarré mais reste dans la file après le suspend() interne
var_dump($coroutine->isStarted()); // bool(true)
```

## Voir aussi

- [Coroutine::isStarted](/fr/docs/reference/coroutine/is-started.html) -- Vérifier si démarrée
- [Coroutine::isSuspended](/fr/docs/reference/coroutine/is-suspended.html) -- Vérifier la suspension
