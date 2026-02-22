---
layout: docs
lang: fr
path_key: "/docs/reference/scope/on-finally.html"
nav_active: docs
permalink: /fr/docs/reference/scope/on-finally.html
page_title: "Scope::finally"
description: "Enregistre un callback à invoquer lorsque le scope se termine."
---

# Scope::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(\Closure $callback): void
```

Enregistre une fonction de rappel qui sera exécutée lorsque le scope se termine. C'est l'équivalent d'un bloc `finally` pour un scope, garantissant que le code de nettoyage s'exécute quel que soit le mode de terminaison du scope (normalement, par annulation ou avec une erreur).

## Paramètres

`callback` — la closure qui sera appelée lorsque le scope se termine.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Nettoyage des ressources

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Scope completed, cleaning up resources\n";
    // Fermer les connexions, supprimer les fichiers temporaires
});

$scope->spawn(function() {
    echo "Executing task\n";
});

$scope->awaitCompletion();
// Sortie : "Executing task"
// Sortie : "Scope completed, cleaning up resources"
```

### Exemple #2 Callbacks multiples

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Closing database connection\n";
});

$scope->finally(function() {
    echo "Writing metrics\n";
});

$scope->spawn(function() {
    \Async\delay(1000);
});

$scope->dispose();
// Les deux callbacks seront invoqués lorsque le scope se termine
```

## Voir aussi

- [Scope::dispose](/fr/docs/reference/scope/dispose.html) — Fermer le scope
- [Scope::isFinished](/fr/docs/reference/scope/is-finished.html) — Vérifier si le scope est terminé
- [Coroutine::finally](/fr/docs/reference/coroutine/on-finally.html) — Callback à la fin de la coroutine
