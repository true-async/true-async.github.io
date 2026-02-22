---
layout: docs
lang: fr
path_key: "/docs/reference/scope/dispose-after-timeout.html"
nav_active: docs
permalink: /fr/docs/reference/scope/dispose-after-timeout.html
page_title: "Scope::disposeAfterTimeout"
description: "Ferme le scope après un délai spécifié."
---

# Scope::disposeAfterTimeout

(PHP 8.6+, True Async 1.0)

```php
public function disposeAfterTimeout(int $timeout): void
```

Planifie la fermeture du scope après un délai spécifié. Lorsque le délai expire, `dispose()` est appelé, annulant toutes les coroutines et fermant le scope. Cela est pratique pour définir une durée de vie maximale du scope.

## Paramètres

`timeout` — temps en millisecondes avant la fermeture automatique du scope.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Limitation du temps d'exécution

```php
<?php

use Async\Scope;

$scope = new Scope();

// Le scope sera fermé après 10 secondes
$scope->disposeAfterTimeout(10_000);

$scope->spawn(function() {
    try {
        // Opération longue
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Task cancelled by scope timeout\n";
    }
});

$scope->awaitCompletion();
```

### Exemple #2 Scope avec une durée de vie limitée

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->disposeAfterTimeout(5000); // 5 secondes pour tout le travail

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1: OK\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2: OK\n";
});

$scope->spawn(function() {
    \Async\delay(30_000); // Ne terminera pas à temps
    echo "Task 3: OK\n"; // Ne sera pas affiché
});

$scope->awaitCompletion();
```

## Voir aussi

- [Scope::dispose](/fr/docs/reference/scope/dispose.html) — Fermeture immédiate du scope
- [Scope::disposeSafely](/fr/docs/reference/scope/dispose-safely.html) — Fermeture sécurisée du scope
- [timeout()](/fr/docs/reference/timeout.html) — Fonction globale de délai d'expiration
