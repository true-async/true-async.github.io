---
layout: docs
lang: fr
path_key: "/docs/reference/scope/set-exception-handler.html"
nav_active: docs
permalink: /fr/docs/reference/scope/set-exception-handler.html
page_title: "Scope::setExceptionHandler"
description: "Définit un gestionnaire d'exceptions pour les coroutines enfants."
---

# Scope::setExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setExceptionHandler(callable $exceptionHandler): void
```

Définit un gestionnaire d'exceptions pour les exceptions levées dans les coroutines enfants du scope. Lorsqu'une coroutine se termine avec une exception non gérée, au lieu que l'erreur se propage vers le haut, le gestionnaire spécifié est appelé.

## Paramètres

`exceptionHandler` — la fonction de gestion des exceptions. Accepte un `\Throwable` en argument.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Gestion des erreurs de coroutines

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->setExceptionHandler(function(\Throwable $e) {
    error_log("Coroutine error: " . $e->getMessage());
});

$scope->spawn(function() {
    throw new \RuntimeException("Something went wrong");
});

$scope->awaitCompletion();
// Le journal contiendra : "Coroutine error: Something went wrong"
```

### Exemple #2 Journalisation centralisée des erreurs

```php
<?php

use Async\Scope;

$scope = new Scope();
$errors = [];

$scope->setExceptionHandler(function(\Throwable $e) use (&$errors) {
    $errors[] = $e;
});

$scope->spawn(function() {
    throw new \RuntimeException("Error 1");
});

$scope->spawn(function() {
    throw new \LogicException("Error 2");
});

$scope->awaitCompletion();

echo "Total errors: " . count($errors) . "\n"; // Total errors: 2
```

## Voir aussi

- [Scope::setChildScopeExceptionHandler](/fr/docs/reference/scope/set-child-scope-exception-handler.html) — Gestionnaire d'exceptions pour les scopes enfants
- [Scope::finally](/fr/docs/reference/scope/on-finally.html) — Callback à la fin du scope
