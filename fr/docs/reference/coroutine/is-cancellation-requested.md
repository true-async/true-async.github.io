---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/is-cancellation-requested.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/is-cancellation-requested.html
page_title: "Coroutine::isCancellationRequested"
description: "Vérifier si l'annulation a été demandée pour la coroutine."
---

# Coroutine::isCancellationRequested

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancellationRequested(): bool
```

Vérifie si l'annulation a été demandée pour la coroutine. Contrairement à `isCancelled()`, retourne `true` immédiatement après l'appel de `cancel()`, même si la coroutine est encore en cours d'exécution dans `protect()`.

## Valeur de retour

`bool` -- `true` si l'annulation a été demandée.

## Exemples

### Exemple #1 Différence avec isCancelled()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        suspend();
    });
});

suspend();

// Avant l'annulation
var_dump($coroutine->isCancellationRequested()); // bool(false)

$coroutine->cancel();

// Immédiatement après cancel()
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false) -- encore dans protect()
```

## Voir aussi

- [Coroutine::isCancelled](/fr/docs/reference/coroutine/is-cancelled.html) -- Vérifier l'annulation terminée
- [Coroutine::cancel](/fr/docs/reference/coroutine/cancel.html) -- Annuler la coroutine
- [protect()](/fr/docs/reference/protect.html) -- Section protégée
