---
layout: docs
lang: fr
path_key: "/docs/reference/future/await.html"
nav_active: docs
permalink: /fr/docs/reference/future/await.html
page_title: "Future::await"
description: "Attendre le résultat du Future."
---

# Future::await

(PHP 8.6+, True Async 1.0)

```php
public function await(?Completable $cancellation = null): mixed
```

Attend la complétion du `Future` et retourne son résultat. Bloque la coroutine courante jusqu'à ce que le Future soit complété. Si le Future s'est terminé avec une erreur, la méthode lève cette exception. Vous pouvez passer un `Completable` pour annuler l'attente par timeout ou condition externe.

## Paramètres

`cancellation` — un objet d'annulation de l'attente. S'il est fourni et déclenché avant que le Future ne se complète, une `CancelledException` sera levée. Par défaut `null`.

## Valeur de retour

`mixed` — le résultat du Future.

## Erreurs

Lève une exception si le Future s'est terminé avec une erreur ou a été annulé.

## Exemples

### Exemple #1 Attente basique du résultat

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    \Async\delay(100);
    return 42;
});

$result = $future->await();
echo "Result: $result\n"; // Result: 42
```

### Exemple #2 Gestion des erreurs lors de l'attente

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    throw new \RuntimeException("Something went wrong");
});

try {
    $result = $future->await();
} catch (\RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    // Error: Something went wrong
}
```

## Voir aussi

- [Future::isCompleted](/fr/docs/reference/future/is-completed.html) — Vérifier si le Future est complété
- [Future::cancel](/fr/docs/reference/future/cancel.html) — Annuler le Future
- [Future::map](/fr/docs/reference/future/map.html) — Transformer le résultat
