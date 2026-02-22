---
layout: docs
lang: fr
path_key: "/docs/reference/future/cancel.html"
nav_active: docs
permalink: /fr/docs/reference/future/cancel.html
page_title: "Future::cancel"
description: "Annule le Future."
---

# Future::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellation = null): void
```

Annule le `Future`. Toutes les coroutines en attente de ce Future via `await()` recevront une `CancelledException`. Si le paramètre `$cancellation` est fourni, il sera utilisé comme raison de l'annulation.

## Paramètres

`cancellation` — une exception d'annulation personnalisée. Si `null`, la `CancelledException` par défaut est utilisée.

## Valeur de retour

La fonction ne retourne aucune valeur.

## Exemples

### Exemple #1 Annulation basique d'un Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Une coroutine en attente du résultat
\Async\async(function() use ($future) {
    try {
        $result = $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Future cancelled\n";
    }
});

// Annuler le Future
$future->cancel();
```

### Exemple #2 Annulation avec une raison personnalisée

```php
<?php

use Async\Future;
use Async\FutureState;
use Async\AsyncCancellation;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($future) {
    try {
        $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
        // Reason: Timeout exceeded
    }
});

$future->cancel(new AsyncCancellation("Timeout exceeded"));
```

## Voir aussi

- [Future::isCancelled](/fr/docs/reference/future/is-cancelled.html) — Vérifier si le Future est annulé
- [Future::await](/fr/docs/reference/future/await.html) — Attendre le résultat
- [Future::catch](/fr/docs/reference/future/catch.html) — Gérer les erreurs du Future
