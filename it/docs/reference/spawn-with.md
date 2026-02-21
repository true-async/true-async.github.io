---
layout: docs
lang: it
path_key: "/docs/reference/spawn-with.html"
nav_active: docs
permalink: /it/docs/reference/spawn-with.html
page_title: "spawn_with()"
description: "spawn_with() — avvia una coroutine in uno Scope specificato o tramite un ScopeProvider."
---

# spawn_with

(PHP 8.6+, True Async 1.0)

`spawn_with()` — Avvia una funzione in una nuova coroutine associata allo `Scope` o `ScopeProvider` specificato.

## Descrizione

```php
spawn_with(Async\ScopeProvider $provider, callable $task, mixed ...$args): Async\Coroutine
```

Crea e avvia una nuova coroutine nello Scope fornito da `$provider`. Questo consente un controllo esplicito su quale Scope eseguira la coroutine.

## Parametri

**`provider`**
Un oggetto che implementa l'interfaccia `Async\ScopeProvider`. Tipicamente questo è:
- `Async\Scope` — direttamente, poiché `Scope` implementa `ScopeProvider`
- Una classe personalizzata che implementa `ScopeProvider`
- Un oggetto che implementa `SpawnStrategy` per la gestione del ciclo di vita

**`task`**
Una funzione o closure da eseguire nella coroutine.

**`args`**
Parametri opzionali passati a `task`.

## Valori di ritorno

Restituisce un oggetto `Async\Coroutine` che rappresenta la coroutine avviata.

## Errori/Eccezioni

- `Async\AsyncException` — se lo Scope è chiuso o annullato
- `TypeError` — se `$provider` non implementa `ScopeProvider`

## Esempi

### Esempio #1 Avvio in uno Scope specifico

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

// Attendi il completamento di tutte le coroutine nello scope
$scope->awaitCompletion();
?>
```

### Esempio #2 Scope ereditato

```php
<?php
use Async\Scope;
use function Async\spawn_with;

$parentScope = new Scope();
$childScope = Scope::inherit($parentScope);

spawn_with($childScope, function() {
    echo "Lavoro nello Scope figlio\n";
});

// L'annullamento del genitore annulla anche il figlio
$parentScope->cancel();
?>
```

### Esempio #3 Uso con ScopeProvider

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
            error_log("Errore worker: " . $e->getMessage());
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
    // Lavoro in uno scope gestito
});

$worker->shutdown();
?>
```

### Esempio #4 Passaggio di argomenti

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$coroutine = spawn_with($scope, function(string $url, int $timeout) {
    // Usa gli argomenti passati
    return file_get_contents($url);
}, 'https://php.net', 5000);

$result = await($coroutine);
?>
```

## Note

> **Nota:** Se `ScopeProvider::provideScope()` restituisce `null`, la coroutine viene creata nello Scope corrente.

> **Nota:** Non è possibile creare una coroutine in uno Scope chiuso o annullato — verrà lanciata un'eccezione.

## Vedi anche

- [spawn()](/it/docs/reference/spawn.html) — avvio di una coroutine nello Scope corrente
- [Scope](/it/docs/components/scope.html) — gestione del ciclo di vita delle coroutine
- [Interfacce](/it/docs/components/interfaces.html) — ScopeProvider e SpawnStrategy
