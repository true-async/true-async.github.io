---
layout: docs
lang: fr
path_key: "/docs/reference/scope/spawn.html"
nav_active: docs
permalink: /fr/docs/reference/scope/spawn.html
page_title: "Scope::spawn"
description: "Lance une coroutine dans le scope donné."
---

# Scope::spawn

(PHP 8.6+, True Async 1.0)

```php
public function spawn(\Closure $callable, mixed ...$params): Coroutine
```

Lance une nouvelle coroutine au sein du scope donné. La coroutine sera liée au scope et gérée par son cycle de vie : lorsque le scope est annulé ou fermé, toutes ses coroutines seront également affectées.

## Paramètres

`callable` — la closure à exécuter en tant que coroutine.

`params` — les arguments à passer à la closure.

## Valeur de retour

`Coroutine` — l'objet coroutine lancé.

## Exemples

### Exemple #1 Utilisation basique

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function() {
    echo "Hello from a coroutine!\n";
    return 42;
});

echo $coroutine->getResult(); // 42
```

### Exemple #2 Passage de paramètres

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function(string $url, int $timeout) {
    echo "Fetching $url with timeout {$timeout}ms\n";
    // ... effectuer la requête
}, 'https://example.com', 5000);

$scope->awaitCompletion();
```

## Voir aussi

- [spawn()](/fr/docs/reference/spawn.html) — Fonction globale pour lancer des coroutines
- [Scope::cancel](/fr/docs/reference/scope/cancel.html) — Annuler toutes les coroutines du scope
- [Scope::awaitCompletion](/fr/docs/reference/scope/await-completion.html) — Attendre la fin des coroutines
