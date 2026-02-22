---
layout: docs
lang: es
path_key: "/docs/reference/spawn-with.html"
nav_active: docs
permalink: /es/docs/reference/spawn-with.html
page_title: "spawn_with()"
description: "spawn_with() — lanzar una corrutina en un Scope especificado o mediante un ScopeProvider."
---

# spawn_with

(PHP 8.6+, True Async 1.0)

`spawn_with()` — Lanza una función en una nueva corrutina vinculada al `Scope` o `ScopeProvider` especificado.

## Descripción

```php
spawn_with(Async\ScopeProvider $provider, callable $task, mixed ...$args): Async\Coroutine
```

Crea e inicia una nueva corrutina en el Scope proporcionado por `$provider`. Esto permite un control explícito sobre en qué Scope se ejecutará la corrutina.

## Parámetros

**`provider`**
Un objeto que implementa la interfaz `Async\ScopeProvider`. Típicamente es:
- `Async\Scope` — directamente, ya que `Scope` implementa `ScopeProvider`
- Una clase personalizada que implementa `ScopeProvider`
- Un objeto que implementa `SpawnStrategy` para gestión del ciclo de vida

**`task`**
Una función o closure a ejecutar en la corrutina.

**`args`**
Parámetros opcionales pasados a `task`.

## Valores de retorno

Devuelve un objeto `Async\Coroutine` que representa la corrutina lanzada.

## Errores/Excepciones

- `Async\AsyncException` — si el Scope está cerrado o cancelado
- `TypeError` — si `$provider` no implementa `ScopeProvider`

## Ejemplos

### Ejemplo #1 Lanzar en un Scope específico

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

// Esperar a que todas las corrutinas del scope se completen
$scope->awaitCompletion();
?>
```

### Ejemplo #2 Scope heredado

```php
<?php
use Async\Scope;
use function Async\spawn_with;

$parentScope = new Scope();
$childScope = Scope::inherit($parentScope);

spawn_with($childScope, function() {
    echo "Trabajando en Scope hijo\n";
});

// Cancelar el padre también cancela al hijo
$parentScope->cancel();
?>
```

### Ejemplo #3 Uso con ScopeProvider

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
            error_log("Error del worker: " . $e->getMessage());
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
    // Trabajando en un scope gestionado
});

$worker->shutdown();
?>
```

### Ejemplo #4 Paso de argumentos

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$coroutine = spawn_with($scope, function(string $url, int $timeout) {
    // Usar los argumentos pasados
    return file_get_contents($url);
}, 'https://php.net', 5000);

$result = await($coroutine);
?>
```

## Notas

> **Nota:** Si `ScopeProvider::provideScope()` devuelve `null`, la corrutina se crea en el Scope actual.

> **Nota:** No se puede crear una corrutina en un Scope cerrado o cancelado — se lanzará una excepción.

## Ver también

- [spawn()](/es/docs/reference/spawn.html) — lanzar una corrutina en el Scope actual
- [Scope](/es/docs/components/scope.html) — gestión del ciclo de vida de corrutinas
- [Interfaces](/es/docs/components/interfaces.html) — ScopeProvider y SpawnStrategy
