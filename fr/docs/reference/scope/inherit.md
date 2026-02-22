---
layout: docs
lang: fr
path_key: "/docs/reference/scope/inherit.html"
nav_active: docs
permalink: /fr/docs/reference/scope/inherit.html
page_title: "Scope::inherit"
description: "Crée un nouveau Scope qui hérite d'un scope spécifié ou du scope courant."
---

# Scope::inherit

(PHP 8.6+, True Async 1.0)

```php
public static function inherit(?Scope $parentScope = null): Scope
```

Crée un nouveau `Scope` qui hérite du scope parent spécifié. Si le paramètre `$parentScope` n'est pas fourni (ou est `null`), le nouveau scope hérite du scope actif courant.

Le scope enfant hérite des gestionnaires d'exceptions et des politiques d'annulation du parent.

## Paramètres

`parentScope` — le scope parent dont le nouveau scope héritera. Si `null`, le scope actif courant est utilisé.

## Valeur de retour

`Scope` — un nouveau scope enfant.

## Exemples

### Exemple #1 Création d'un scope enfant à partir du scope courant

```php
<?php

use Async\Scope;
use function Async\spawn;

$parentScope = new Scope();

$parentScope->spawn(function() {
    // À l'intérieur de la coroutine, le scope courant est $parentScope
    $childScope = Scope::inherit();

    $childScope->spawn(function() {
        echo "Running in child scope\n";
    });

    $childScope->awaitCompletion();
});
```

### Exemple #2 Spécification explicite du scope parent

```php
<?php

use Async\Scope;

$rootScope = new Scope();
$childScope = Scope::inherit($rootScope);

$childScope->spawn(function() {
    echo "Coroutine in child scope\n";
});

// L'annulation du parent annule également le scope enfant
$rootScope->cancel();
```

## Voir aussi

- [Scope::\_\_construct](/fr/docs/reference/scope/construct.html) — Créer un Scope racine
- [Scope::getChildScopes](/fr/docs/reference/scope/get-child-scopes.html) — Obtenir les scopes enfants
- [Scope::dispose](/fr/docs/reference/scope/dispose.html) — Annuler et fermer le scope
