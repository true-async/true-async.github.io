---
layout: docs
lang: fr
path_key: "/docs/reference/scope/construct.html"
nav_active: docs
permalink: /fr/docs/reference/scope/construct.html
page_title: "Scope::__construct"
description: "Crée un nouveau Scope racine."
---

# Scope::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct()
```

Crée un nouveau `Scope` racine. Un scope racine n'a pas de scope parent et sert d'unité indépendante pour la gestion du cycle de vie des coroutines.

## Exemples

### Exemple #1 Utilisation basique

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine in a new scope\n";
});

$scope->awaitCompletion();
```

### Exemple #2 Création de plusieurs scopes indépendants

```php
<?php

use Async\Scope;

$scopeA = new Scope();
$scopeB = new Scope();

$scopeA->spawn(function() {
    echo "Task A\n";
});

$scopeB->spawn(function() {
    echo "Task B\n";
});

// L'annulation d'un scope n'affecte pas l'autre
$scopeA->cancel();

// $scopeB continue de s'exécuter
$scopeB->awaitCompletion();
```

## Voir aussi

- [Scope::inherit](/fr/docs/reference/scope/inherit.html) — Créer un Scope enfant
- [Scope::spawn](/fr/docs/reference/scope/spawn.html) — Lancer une coroutine dans le scope
