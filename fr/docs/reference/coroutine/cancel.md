---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/cancel.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/cancel.html
page_title: "Coroutine::cancel"
description: "Annuler l'exécution d'une coroutine."
---

# Coroutine::cancel

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Annule l'exécution de la coroutine. La coroutine recevra une exception `AsyncCancellation` au prochain point de suspension (`suspend`, `await`, `delay`, etc.).

L'annulation fonctionne de manière coopérative -- la coroutine n'est pas interrompue instantanément. Si la coroutine se trouve dans `protect()`, l'annulation est différée jusqu'à la fin de la section protégée.

## Paramètres

**cancellation**
: L'exception servant de motif d'annulation. Si `null`, une `AsyncCancellation` par défaut est créée.

## Exemples

### Exemple #1 Annulation simple

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    try {
        Async\delay(10000);
    } catch (\Async\AsyncCancellation $e) {
        echo "Cancelled: " . $e->getMessage() . "\n";
    }
});

suspend();

$coroutine->cancel();

await($coroutine);
```

### Exemple #2 Annulation avec motif

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\delay(10000);
});

$coroutine->cancel(new \Async\AsyncCancellation("Timeout exceeded"));

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo $e->getMessage() . "\n"; // "Timeout exceeded"
}
```

### Exemple #3 Annulation avant le démarrage

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "should not complete";
});

// Annuler avant que l'ordonnanceur ne démarre la coroutine
$coroutine->cancel();

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo "Coroutine cancelled before start\n";
}
```

## Voir aussi

- [Coroutine::isCancelled](/fr/docs/reference/coroutine/is-cancelled.html) -- Vérifier l'annulation
- [Coroutine::isCancellationRequested](/fr/docs/reference/coroutine/is-cancellation-requested.html) -- Vérifier la demande d'annulation
- [Cancellation](/fr/docs/components/cancellation.html) -- Concept d'annulation
- [protect()](/fr/docs/reference/protect.html) -- Section protégée
