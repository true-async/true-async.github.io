---
layout: docs
lang: fr
path_key: "/docs/reference/scope/await-completion.html"
nav_active: docs
permalink: /fr/docs/reference/scope/await-completion.html
page_title: "Scope::awaitCompletion"
description: "Attend la fin des coroutines actives dans le scope."
---

# Scope::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public function awaitCompletion(Awaitable $cancellation): void
```

Attend la fin de toutes les coroutines **actives** dans le scope. Les coroutines zombies ne sont pas prises en compte lors de l'attente. Le paramètre `$cancellation` permet d'interrompre l'attente de manière anticipée.

## Paramètres

`cancellation` — un objet `Awaitable` qui, lorsqu'il est déclenché, interrompra l'attente.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Attente de la fin de toutes les coroutines

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1 completed\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2 completed\n";
});

// Attendre la fin avec un délai d'expiration de 5 secondes
$scope->awaitCompletion(timeout(5000));
echo "All tasks done\n";
```

### Exemple #2 Interruption de l'attente

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(60_000); // Tâche très longue
});

try {
    $scope->awaitCompletion(timeout(3000));
} catch (\Async\CancelledException $e) {
    echo "Wait interrupted by timeout\n";
    $scope->cancel();
}
```

## Voir aussi

- [Scope::awaitAfterCancellation](/fr/docs/reference/scope/await-after-cancellation.html) — Attendre toutes les coroutines, y compris les zombies
- [Scope::cancel](/fr/docs/reference/scope/cancel.html) — Annuler toutes les coroutines
- [Scope::isFinished](/fr/docs/reference/scope/is-finished.html) — Vérifier si le scope est terminé
