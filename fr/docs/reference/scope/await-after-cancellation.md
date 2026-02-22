---
layout: docs
lang: fr
path_key: "/docs/reference/scope/await-after-cancellation.html"
nav_active: docs
permalink: /fr/docs/reference/scope/await-after-cancellation.html
page_title: "Scope::awaitAfterCancellation"
description: "Attend la fin de toutes les coroutines, y compris les zombies, après l'annulation du scope."
---

# Scope::awaitAfterCancellation

(PHP 8.6+, True Async 1.0)

```php
public function awaitAfterCancellation(
    ?callable $errorHandler = null,
    ?Awaitable $cancellation = null
): void
```

Attend la fin de **toutes** les coroutines du scope, y compris les coroutines zombies. Nécessite un appel préalable à `cancel()`. Cette méthode est utilisée pour la terminaison gracieuse du scope lorsque vous devez attendre que toutes les coroutines (y compris les zombies) terminent leur travail.

## Paramètres

`errorHandler` — une fonction de rappel pour la gestion des erreurs des coroutines zombies. Accepte un `\Throwable` en argument. Si `null`, les erreurs sont ignorées.

`cancellation` — un objet `Awaitable` pour interrompre l'attente. Si `null`, l'attente n'est pas limitée dans le temps.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Terminaison gracieuse avec gestion des erreurs

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task completed\n";
});

$scope->spawn(function() {
    \Async\delay(5000);
    throw new \RuntimeException("Background task error");
});

// D'abord, annuler
$scope->cancel();

// Puis attendre la fin de toutes les coroutines
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

### Exemple #2 Attente avec un délai d'expiration

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    // Coroutine zombie qui met longtemps à se terminer
    try {
        \Async\delay(30_000);
    } catch (\Async\CancelledException) {
        // Nettoyage des ressources
        \Async\delay(2000);
    }
});

$scope->cancel();

$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log($e->getMessage());
    },
    cancellation: timeout(5000)
);
```

## Voir aussi

- [Scope::cancel](/fr/docs/reference/scope/cancel.html) — Annuler toutes les coroutines
- [Scope::awaitCompletion](/fr/docs/reference/scope/await-completion.html) — Attendre les coroutines actives
- [Scope::dispose](/fr/docs/reference/scope/dispose.html) — Annuler et fermer le scope
