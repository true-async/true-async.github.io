---
layout: docs
lang: fr
path_key: "/docs/reference/scope/get-child-scopes.html"
nav_active: docs
permalink: /fr/docs/reference/scope/get-child-scopes.html
page_title: "Scope::getChildScopes"
description: "Retourne un tableau des scopes enfants."
---

# Scope::getChildScopes

(PHP 8.6+, True Async 1.0)

```php
public function getChildScopes(): array
```

Retourne un tableau de tous les scopes enfants créés via `Scope::inherit()` à partir du scope donné. Utile pour la surveillance et le débogage de la hiérarchie des scopes.

## Valeur de retour

`array` — un tableau d'objets `Scope` qui sont les enfants du scope donné.

## Exemples

### Exemple #1 Obtenir les scopes enfants

```php
<?php

use Async\Scope;

$parent = new Scope();
$child1 = Scope::inherit($parent);
$child2 = Scope::inherit($parent);

$children = $parent->getChildScopes();

var_dump(count($children)); // int(2)
```

### Exemple #2 Surveillance de l'état des scopes enfants

```php
<?php

use Async\Scope;

$appScope = new Scope();

$workerScope = Scope::inherit($appScope);
$bgScope = Scope::inherit($appScope);

$workerScope->spawn(function() {
    \Async\delay(1000);
});

foreach ($appScope->getChildScopes() as $child) {
    $status = match(true) {
        $child->isCancelled() => 'cancelled',
        $child->isFinished()  => 'finished',
        $child->isClosed()    => 'closed',
        default               => 'active',
    };
    echo "Scope: $status\n";
}
```

## Voir aussi

- [Scope::inherit](/fr/docs/reference/scope/inherit.html) — Créer un scope enfant
- [Scope::setChildScopeExceptionHandler](/fr/docs/reference/scope/set-child-scope-exception-handler.html) — Gestionnaire d'exceptions pour les scopes enfants
