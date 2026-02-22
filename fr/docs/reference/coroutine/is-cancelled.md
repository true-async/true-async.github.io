---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/is-cancelled.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/is-cancelled.html
page_title: "Coroutine::isCancelled"
description: "Vérifier si la coroutine a été annulée."
---

# Coroutine::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancelled(): bool
```

Vérifie si la coroutine a été annulée **et** terminée. Retourne `true` uniquement lorsque l'annulation est complètement achevée.

Si la coroutine se trouve dans `protect()`, `isCancelled()` retournera `false` jusqu'à la fin de la section protégée, même si `cancel()` a déjà été appelé. Pour vérifier une demande d'annulation, utilisez `isCancellationRequested()`.

## Valeur de retour

`bool` -- `true` si la coroutine a été annulée et terminée.

## Exemples

### Exemple #1 Annulation simple

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();

$coroutine->cancel();

suspend(); // laisser l'annulation se terminer

var_dump($coroutine->isCancelled()); // bool(true)
var_dump($coroutine->isCompleted()); // bool(true)
```

### Exemple #2 Annulation différée avec protect()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        // Section critique -- l'annulation est différée
        Async\delay(100);
    });
});

suspend();

$coroutine->cancel();

// Annulation demandée mais pas encore terminée
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false)

suspend(); // laisser protect() se terminer

var_dump($coroutine->isCancelled());             // bool(true)
```

## Voir aussi

- [Coroutine::isCancellationRequested](/fr/docs/reference/coroutine/is-cancellation-requested.html) -- Vérifier la demande d'annulation
- [Coroutine::cancel](/fr/docs/reference/coroutine/cancel.html) -- Annuler la coroutine
- [Cancellation](/fr/docs/components/cancellation.html) -- Concept d'annulation
