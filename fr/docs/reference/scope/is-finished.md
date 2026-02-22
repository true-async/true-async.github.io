---
layout: docs
lang: fr
path_key: "/docs/reference/scope/is-finished.html"
nav_active: docs
permalink: /fr/docs/reference/scope/is-finished.html
page_title: "Scope::isFinished"
description: "Vérifie si le scope est terminé."
---

# Scope::isFinished

(PHP 8.6+, True Async 1.0)

```php
public function isFinished(): bool
```

Vérifie si toutes les coroutines du scope sont terminées. Un scope est considéré comme terminé lorsque toutes ses coroutines (y compris les scopes enfants) ont achevé leur exécution.

## Valeur de retour

`bool` — `true` si toutes les coroutines du scope sont terminées, `false` sinon.

## Exemples

### Exemple #1 Vérification de l'achèvement du scope

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
});

var_dump($scope->isFinished()); // bool(false)

$scope->awaitCompletion();

var_dump($scope->isFinished()); // bool(true)
```

## Voir aussi

- [Scope::isClosed](/fr/docs/reference/scope/is-closed.html) — Vérifier si le scope est fermé
- [Scope::isCancelled](/fr/docs/reference/scope/is-cancelled.html) — Vérifier si le scope est annulé
- [Scope::awaitCompletion](/fr/docs/reference/scope/await-completion.html) — Attendre la fin des coroutines
