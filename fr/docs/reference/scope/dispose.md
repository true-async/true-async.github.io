---
layout: docs
lang: fr
path_key: "/docs/reference/scope/dispose.html"
nav_active: docs
permalink: /fr/docs/reference/scope/dispose.html
page_title: "Scope::dispose"
description: "Annule toutes les coroutines et ferme le scope."
---

# Scope::dispose

(PHP 8.6+, True Async 1.0)

```php
public function dispose(): void
```

Annule de manière forcée toutes les coroutines du scope et le ferme. Après l'appel à `dispose()`, le scope est marqué comme fermé et annulé. De nouvelles coroutines ne peuvent pas être ajoutées à un scope fermé.

Cela équivaut à appeler `cancel()` suivi de la fermeture du scope.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Fermeture forcée d'un scope

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Coroutine cancelled on dispose\n";
    }
});

// Toutes les coroutines seront annulées, le scope fermé
$scope->dispose();

var_dump($scope->isClosed());    // bool(true)
var_dump($scope->isCancelled()); // bool(true)
```

### Exemple #2 Nettoyage dans un bloc try/finally

```php
<?php

use Async\Scope;

$scope = new Scope();

try {
    $scope->spawn(function() {
        // Logique métier
        \Async\delay(5000);
    });

    $scope->awaitCompletion();
} finally {
    $scope->dispose();
}
```

## Voir aussi

- [Scope::disposeSafely](/fr/docs/reference/scope/dispose-safely.html) — Fermeture sécurisée (avec zombies)
- [Scope::disposeAfterTimeout](/fr/docs/reference/scope/dispose-after-timeout.html) — Fermeture après un délai
- [Scope::cancel](/fr/docs/reference/scope/cancel.html) — Annuler sans fermer le scope
