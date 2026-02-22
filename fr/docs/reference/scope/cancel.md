---
layout: docs
lang: fr
path_key: "/docs/reference/scope/cancel.html"
nav_active: docs
permalink: /fr/docs/reference/scope/cancel.html
page_title: "Scope::cancel"
description: "Annule toutes les coroutines du scope."
---

# Scope::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellationError = null): void
```

Annule toutes les coroutines appartenant au scope donné. Chaque coroutine active recevra une `CancelledException`. Si `$cancellationError` est spécifié, il sera utilisé comme raison de l'annulation.

## Paramètres

`cancellationError` — une exception d'annulation personnalisée. Si `null`, la `CancelledException` standard est utilisée.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Annulation basique

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000); // Opération longue
    } catch (\Async\CancelledException $e) {
        echo "Coroutine cancelled\n";
    }
});

// Annuler toutes les coroutines
$scope->cancel();
```

### Exemple #2 Annulation avec une erreur personnalisée

```php
<?php

use Async\Scope;
use Async\AsyncCancellation;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
    }
});

$error = new AsyncCancellation("Timeout exceeded");
$scope->cancel($error);
```

## Voir aussi

- [Scope::dispose](/fr/docs/reference/scope/dispose.html) — Annuler et fermer le scope
- [Scope::isCancelled](/fr/docs/reference/scope/is-cancelled.html) — Vérifier si le scope est annulé
- [Scope::awaitAfterCancellation](/fr/docs/reference/scope/await-after-cancellation.html) — Attendre après l'annulation
