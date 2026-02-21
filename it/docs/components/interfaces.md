---
layout: docs
lang: it
path_key: "/docs/components/interfaces.html"
nav_active: docs
permalink: /it/docs/components/interfaces.html
page_title: "Interfacce"
description: "Interfacce base di TrueAsync -- Awaitable, Completable, Timeout, ScopeProvider e SpawnStrategy."
---

# Interfacce Base

## Awaitable

```php
interface Async\Awaitable {}
```

Un'interfaccia marker per tutti gli oggetti che possono essere attesi. Non contiene metodi -- serve per il type-checking.
Gli oggetti Awaitable possono cambiare stato più volte, il che significa che sono oggetti `multiple-shot`.

Implementata da: `Coroutine`, `Future`, `Channel`, `Timeout`.

## Completable

```php
interface Async\Completable extends Async\Awaitable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Estende `Awaitable`. Gli oggetti `Async\Completable` cambiano stato una sola volta (`one-shot`).

Implementata da: `Coroutine`, `Future`, `Timeout`.

### cancel()

Cancella l'oggetto. Il parametro opzionale `$cancellation` permette di passare un errore di cancellazione specifico.

### isCompleted()

Restituisce `true` se l'oggetto è già completato (con successo o con errore).

### isCancelled()

Restituisce `true` se l'oggetto è stato cancellato.

## Timeout

```php
final class Async\Timeout implements Async\Completable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Un oggetto timeout. Creato tramite la funzione `timeout()`:

```php
<?php
use function Async\timeout;
use function Async\await;

// Crea un timeout di 5 secondi
$timer = timeout(5000);

// Usa come limitatore di attesa
$result = await($coroutine, $timer);
```

`Timeout` non può essere creato tramite `new` -- solo attraverso `timeout()`.

Quando il timeout scatta, viene lanciata `Async\TimeoutException`.

### Cancellazione di un Timeout

Se il timeout non è più necessario, può essere cancellato:

```php
<?php
$timer = timeout(5000);

// ... l'operazione è stata completata più velocemente
$timer->cancel(); // Rilascia il timer
```

## ScopeProvider

```php
interface Async\ScopeProvider
{
    public function provideScope(): ?Scope;
}
```

Un'interfaccia che permette di fornire uno `Scope` per la creazione di coroutine. Usata con `spawn_with()`:

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
    echo "Lavoro nello Scope fornito\n";
});
?>
```

Se `provideScope()` restituisce `null`, la coroutine viene creata nello Scope corrente.

## SpawnStrategy

```php
interface Async\SpawnStrategy extends Async\ScopeProvider
{
    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array;
    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void;
}
```

Estende `ScopeProvider` con hook del ciclo di vita -- permette di eseguire codice prima e dopo l'accodamento di una coroutine.

### beforeCoroutineEnqueue()

Chiamato **prima** che la coroutine venga aggiunta alla coda dello scheduler. Restituisce un array di parametri.

### afterCoroutineEnqueue()

Chiamato **dopo** che la coroutine è stata aggiunta alla coda.

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
        echo "La coroutine #{$coroutine->getId()} verrà creata\n";
        return [];
    }

    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void
    {
        echo "La coroutine #{$coroutine->getId()} aggiunta alla coda\n";
    }
}

$strategy = new LoggingStrategy();
spawn_with($strategy, function() {
    echo "In esecuzione\n";
});
?>
```

## CircuitBreaker e CircuitBreakerStrategy

Queste interfacce sono descritte nella documentazione di [Async\Pool](/it/docs/components/pool.html).

## Vedi Anche

- [Coroutine](/it/docs/components/coroutines.html) -- l'unità base della concorrenza
- [Scope](/it/docs/components/scope.html) -- gestione del ciclo di vita delle coroutine
- [Future](/it/docs/components/future.html) -- una promessa di risultato
- [spawn_with()](/it/docs/reference/spawn-with.html) -- lancio di una coroutine con un provider
