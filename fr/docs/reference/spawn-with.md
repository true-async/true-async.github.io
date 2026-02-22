---
layout: docs
lang: fr
path_key: "/docs/reference/spawn-with.html"
nav_active: docs
permalink: /fr/docs/reference/spawn-with.html
page_title: "spawn_with()"
description: "spawn_with() — lancer une coroutine dans un Scope spécifié ou via un ScopeProvider."
---

# spawn_with

(PHP 8.6+, True Async 1.0)

`spawn_with()` — Lance une fonction dans une nouvelle coroutine liée au `Scope` ou `ScopeProvider` spécifié.

## Description

```php
spawn_with(Async\ScopeProvider $provider, callable $task, mixed ...$args): Async\Coroutine
```

Crée et démarre une nouvelle coroutine dans le Scope fourni par `$provider`. Cela permet un contrôle explicite sur le Scope dans lequel la coroutine s'exécutera.

## Paramètres

**`provider`**
Un objet implémentant l'interface `Async\ScopeProvider`. Typiquement :
- `Async\Scope` — directement, puisque `Scope` implémente `ScopeProvider`
- Une classe personnalisée implémentant `ScopeProvider`
- Un objet implémentant `SpawnStrategy` pour la gestion du cycle de vie

**`task`**
Une fonction ou closure à exécuter dans la coroutine.

**`args`**
Paramètres optionnels passés à `task`.

## Valeurs de retour

Retourne un objet `Async\Coroutine` représentant la coroutine lancée.

## Erreurs/Exceptions

- `Async\AsyncException` — si le Scope est fermé ou annulé
- `TypeError` — si `$provider` n'implémente pas `ScopeProvider`

## Exemples

### Exemple #1 Lancement dans un Scope spécifique

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$c1 = spawn_with($scope, function() {
    return file_get_contents('https://php.net');
});

$c2 = spawn_with($scope, function() {
    return file_get_contents('https://github.com');
});

// Attendre que toutes les coroutines du scope soient terminées
$scope->awaitCompletion();
?>
```

### Exemple #2 Scope hérité

```php
<?php
use Async\Scope;
use function Async\spawn_with;

$parentScope = new Scope();
$childScope = Scope::inherit($parentScope);

spawn_with($childScope, function() {
    echo "Working in child Scope\n";
});

// L'annulation du parent annule aussi l'enfant
$parentScope->cancel();
?>
```

### Exemple #3 Utilisation avec ScopeProvider

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class WorkerScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
        $this->scope->setExceptionHandler(function(\Throwable $e) {
            error_log("Worker error: " . $e->getMessage());
        });
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function shutdown(): void
    {
        $this->scope->disposeSafely();
    }
}

$worker = new WorkerScope();

spawn_with($worker, function() {
    // Travail dans un scope géré
});

$worker->shutdown();
?>
```

### Exemple #4 Passage d'arguments

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$coroutine = spawn_with($scope, function(string $url, int $timeout) {
    // Utiliser les arguments passés
    return file_get_contents($url);
}, 'https://php.net', 5000);

$result = await($coroutine);
?>
```

## Notes

> **Note :** Si `ScopeProvider::provideScope()` retourne `null`, la coroutine est créée dans le Scope courant.

> **Note :** Vous ne pouvez pas créer une coroutine dans un Scope fermé ou annulé — une exception sera levée.

## Voir aussi

- [spawn()](/fr/docs/reference/spawn.html) — Lancer une coroutine dans le Scope courant
- [Scope](/fr/docs/components/scope.html) — Gestion de la durée de vie des coroutines
- [Interfaces](/fr/docs/components/interfaces.html) — ScopeProvider et SpawnStrategy
