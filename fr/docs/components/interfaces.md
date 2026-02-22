---
layout: docs
lang: fr
path_key: "/docs/components/interfaces.html"
nav_active: docs
permalink: /fr/docs/components/interfaces.html
page_title: "Interfaces"
description: "Interfaces de base TrueAsync -- Awaitable, Completable, Timeout, ScopeProvider et SpawnStrategy."
---

# Interfaces de base

## Awaitable

```php
interface Async\Awaitable {}
```

Une interface marqueur pour tous les objets qui peuvent etre attendus. Ne contient aucune methode -- sert uniquement a la verification de type.
Les objets Awaitable peuvent changer d'etat plusieurs fois, ce qui signifie qu'ils sont des objets `multiple-shot`.

Implemente par : `Coroutine`, `Future`, `Channel`, `Timeout`.

## Completable

```php
interface Async\Completable extends Async\Awaitable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Etend `Awaitable`. Les objets `Async\Completable` ne changent d'etat qu'une seule fois (`one-shot`).

Implemente par : `Coroutine`, `Future`, `Timeout`.

### cancel()

Annule l'objet. Le parametre optionnel `$cancellation` permet de passer une erreur d'annulation specifique.

### isCompleted()

Retourne `true` si l'objet est deja termine (avec succes ou avec une erreur).

### isCancelled()

Retourne `true` si l'objet a ete annule.

## Timeout

```php
final class Async\Timeout implements Async\Completable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Un objet timeout. Cree via la fonction `timeout()` :

```php
<?php
use function Async\timeout;
use function Async\await;

// Creer un timeout de 5 secondes
$timer = timeout(5000);

// Utiliser comme limiteur d'attente
$result = await($coroutine, $timer);
```

`Timeout` ne peut pas etre cree via `new` -- uniquement via `timeout()`.

Lorsque le timeout se declenche, `Async\TimeoutException` est lancee.

### Annuler un Timeout

Si le timeout n'est plus necessaire, il peut etre annule :

```php
<?php
$timer = timeout(5000);

// ... l'operation s'est terminee plus rapidement
$timer->cancel(); // Liberer le timer
```

## ScopeProvider

```php
interface Async\ScopeProvider
{
    public function provideScope(): ?Scope;
}
```

Une interface qui permet de fournir un `Scope` pour la creation de coroutines. Utilisee avec `spawn_with()` :

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class RequestScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }
}

$provider = new RequestScope();
$coroutine = spawn_with($provider, function() {
    echo "Travail dans le Scope fourni\n";
});
?>
```

Si `provideScope()` retourne `null`, la coroutine est creee dans le Scope courant.

## SpawnStrategy

```php
interface Async\SpawnStrategy extends Async\ScopeProvider
{
    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array;
    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void;
}
```

Etend `ScopeProvider` avec des hooks de cycle de vie -- permet d'executer du code avant et apres la mise en file d'attente d'une coroutine.

### beforeCoroutineEnqueue()

Appelee **avant** que la coroutine ne soit ajoutee a la file d'attente de l'ordonnanceur. Retourne un tableau de parametres.

### afterCoroutineEnqueue()

Appelee **apres** que la coroutine a ete ajoutee a la file d'attente.

```php
<?php
use Async\SpawnStrategy;
use Async\Coroutine;
use Async\Scope;
use function Async\spawn_with;

class LoggingStrategy implements SpawnStrategy
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array
    {
        echo "La coroutine #{$coroutine->getId()} va etre creee\n";
        return [];
    }

    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void
    {
        echo "La coroutine #{$coroutine->getId()} ajoutee a la file d'attente\n";
    }
}

$strategy = new LoggingStrategy();
spawn_with($strategy, function() {
    echo "Execution\n";
});
?>
```

## CircuitBreaker et CircuitBreakerStrategy

Ces interfaces sont decrites dans la documentation de [Async\Pool](/fr/docs/components/pool.html).

## Voir aussi

- [Coroutines](/fr/docs/components/coroutines.html) -- l'unite de base de la concurrence
- [Scope](/fr/docs/components/scope.html) -- gestion du cycle de vie des coroutines
- [Future](/fr/docs/components/future.html) -- une promesse de resultat
- [spawn_with()](/fr/docs/reference/spawn-with.html) -- lancer une coroutine avec un fournisseur
