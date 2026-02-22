---
layout: docs
lang: fr
path_key: "/docs/reference/scope/is-closed.html"
nav_active: docs
permalink: /fr/docs/reference/scope/is-closed.html
page_title: "Scope::isClosed"
description: "Vérifie si le scope est fermé."
---

# Scope::isClosed

(PHP 8.6+, True Async 1.0)

```php
public function isClosed(): bool
```

Vérifie si le scope est fermé. Un scope est considéré comme fermé après un appel à `dispose()` ou `disposeSafely()`. De nouvelles coroutines ne peuvent pas être ajoutées à un scope fermé.

## Valeur de retour

`bool` — `true` si le scope est fermé, `false` sinon.

## Exemples

### Exemple #1 Vérification de l'état du scope

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isClosed()); // bool(false)

$scope->dispose();

var_dump($scope->isClosed()); // bool(true)
```

### Exemple #2 Protection contre l'ajout à un scope fermé

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->dispose();

if (!$scope->isClosed()) {
    $scope->spawn(function() {
        echo "This coroutine will not be created\n";
    });
} else {
    echo "Scope is already closed\n";
}
```

## Voir aussi

- [Scope::isFinished](/fr/docs/reference/scope/is-finished.html) — Vérifier si le scope est terminé
- [Scope::isCancelled](/fr/docs/reference/scope/is-cancelled.html) — Vérifier si le scope est annulé
- [Scope::dispose](/fr/docs/reference/scope/dispose.html) — Fermer le scope
