---
layout: docs
lang: fr
path_key: "/docs/reference/scope/set-child-scope-exception-handler.html"
nav_active: docs
permalink: /fr/docs/reference/scope/set-child-scope-exception-handler.html
page_title: "Scope::setChildScopeExceptionHandler"
description: "Définit un gestionnaire d'exceptions pour les Scopes enfants."
---

# Scope::setChildScopeExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setChildScopeExceptionHandler(callable $exceptionHandler): void
```

Définit un gestionnaire d'exceptions pour les exceptions levées dans les scopes enfants. Lorsqu'un scope enfant se termine avec une erreur, ce gestionnaire est appelé, empêchant l'exception de se propager au scope parent.

## Paramètres

`exceptionHandler` — la fonction de gestion des exceptions pour les scopes enfants. Accepte un `\Throwable` en argument.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Capture des erreurs des scopes enfants

```php
<?php

use Async\Scope;

$parentScope = new Scope();

$parentScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("Error in child scope: " . $e->getMessage());
});

$childScope = Scope::inherit($parentScope);

$childScope->spawn(function() {
    throw new \RuntimeException("Child scope error");
});

$childScope->awaitCompletion();
// Erreur gérée, ne se propage pas à $parentScope
```

### Exemple #2 Isolation des erreurs entre modules

```php
<?php

use Async\Scope;

$appScope = new Scope();

$appScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("[App] Module error: " . $e->getMessage());
});

// Chaque module dans son propre scope
$authScope = Scope::inherit($appScope);
$cacheScope = Scope::inherit($appScope);

$authScope->spawn(function() {
    // Une erreur ici n'affectera pas $cacheScope
    throw new \RuntimeException("Auth failed");
});

$cacheScope->spawn(function() {
    echo "Cache is working fine\n";
});

$appScope->awaitCompletion();
```

## Voir aussi

- [Scope::setExceptionHandler](/fr/docs/reference/scope/set-exception-handler.html) — Gestionnaire d'exceptions pour les coroutines
- [Scope::inherit](/fr/docs/reference/scope/inherit.html) — Créer un scope enfant
- [Scope::getChildScopes](/fr/docs/reference/scope/get-child-scopes.html) — Obtenir les scopes enfants
