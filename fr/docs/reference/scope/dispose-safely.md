---
layout: docs
lang: fr
path_key: "/docs/reference/scope/dispose-safely.html"
nav_active: docs
permalink: /fr/docs/reference/scope/dispose-safely.html
page_title: "Scope::disposeSafely"
description: "Ferme le scope en toute sécurité — les coroutines deviennent des zombies."
---

# Scope::disposeSafely

(PHP 8.6+, True Async 1.0)

```php
public function disposeSafely(): void
```

Ferme le scope en toute sécurité. Les coroutines actives **ne sont pas annulées** mais deviennent des coroutines zombies : elles continuent de s'exécuter, mais le scope est considéré comme fermé. Les coroutines zombies se termineront d'elles-mêmes lorsqu'elles auront achevé leur travail.

Si le scope est marqué comme « non sûr » via `asNotSafely()`, les coroutines seront annulées au lieu de devenir des zombies.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Utilisation basique

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(5000);
    echo "Task completed as a zombie\n";
});

// Le scope est fermé, mais la coroutine continue de s'exécuter
$scope->disposeSafely();

var_dump($scope->isClosed()); // bool(true)
// La coroutine continue de s'exécuter en arrière-plan
```

### Exemple #2 Arrêt gracieux avec attente des zombies

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Background task completed\n";
});

$scope->disposeSafely();

// Attendre la fin des coroutines zombies
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

## Voir aussi

- [Scope::dispose](/fr/docs/reference/scope/dispose.html) — Fermer le scope de manière forcée
- [Scope::asNotSafely](/fr/docs/reference/scope/as-not-safely.html) — Désactiver le comportement zombie
- [Scope::awaitAfterCancellation](/fr/docs/reference/scope/await-after-cancellation.html) — Attendre les coroutines zombies
