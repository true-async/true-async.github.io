---
layout: docs
lang: es
path_key: "/docs/components/interfaces.html"
nav_active: docs
permalink: /es/docs/components/interfaces.html
page_title: "Interfaces"
description: "Interfaces base de TrueAsync -- Awaitable, Completable, Timeout, ScopeProvider y SpawnStrategy."
---

# Interfaces Base

## Awaitable

```php
interface Async\Awaitable {}
```

Una interfaz marcadora para todos los objetos que pueden ser esperados. No contiene metodos -- sirve para verificacion de tipos.
Los objetos Awaitable pueden cambiar de estado multiples veces, lo que significa que son objetos `multiple-shot`.

Implementado por: `Coroutine`, `Future`, `Channel`, `Timeout`.

## Completable

```php
interface Async\Completable extends Async\Awaitable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Extiende `Awaitable`. Los objetos `Async\Completable` cambian de estado solo una vez (`one-shot`).

Implementado por: `Coroutine`, `Future`, `Timeout`.

### cancel()

Cancela el objeto. El parametro opcional `$cancellation` permite pasar un error de cancelacion especifico.

### isCompleted()

Devuelve `true` si el objeto ya ha completado (exitosamente o con un error).

### isCancelled()

Devuelve `true` si el objeto fue cancelado.

## Timeout

```php
final class Async\Timeout implements Async\Completable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Un objeto de tiempo de espera. Se crea via la funcion `timeout()`:

```php
<?php
use function Async\timeout;
use function Async\await;

// Crear un tiempo de espera de 5 segundos
$timer = timeout(5000);

// Usar como limitador de espera
$result = await($coroutine, $timer);
```

`Timeout` no puede ser creado via `new` -- solo a traves de `timeout()`.

Cuando el tiempo de espera se activa, se lanza `Async\TimeoutException`.

### Cancelar un Timeout

Si el tiempo de espera ya no es necesario, puede ser cancelado:

```php
<?php
$timer = timeout(5000);

// ... la operacion se completo mas rapido
$timer->cancel(); // Liberar el temporizador
```

## ScopeProvider

```php
interface Async\ScopeProvider
{
    public function provideScope(): ?Scope;
}
```

Una interfaz que permite proporcionar un `Scope` para crear corrutinas. Se usa con `spawn_with()`:

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
    echo "Trabajando en el Scope proporcionado\n";
});
?>
```

Si `provideScope()` devuelve `null`, la corrutina se crea en el Scope actual.

## SpawnStrategy

```php
interface Async\SpawnStrategy extends Async\ScopeProvider
{
    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array;
    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void;
}
```

Extiende `ScopeProvider` con hooks de ciclo de vida -- permite ejecutar codigo antes y despues de que una corrutina sea encolada.

### beforeCoroutineEnqueue()

Se llama **antes** de que la corrutina sea anadida a la cola del planificador. Devuelve un array de parametros.

### afterCoroutineEnqueue()

Se llama **despues** de que la corrutina sea anadida a la cola.

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
        echo "Corrutina #{$coroutine->getId()} sera creada\n";
        return [];
    }

    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void
    {
        echo "Corrutina #{$coroutine->getId()} anadida a la cola\n";
    }
}

$strategy = new LoggingStrategy();
spawn_with($strategy, function() {
    echo "Ejecutando\n";
});
?>
```

## CircuitBreaker y CircuitBreakerStrategy

Estas interfaces se describen en la documentacion de [Async\Pool](/es/docs/components/pool.html).

## Vea Tambien

- [Corrutinas](/es/docs/components/coroutines.html) -- la unidad basica de concurrencia
- [Scope](/es/docs/components/scope.html) -- gestion del ciclo de vida de las corrutinas
- [Future](/es/docs/components/future.html) -- una promesa de resultado
- [spawn_with()](/es/docs/reference/spawn-with.html) -- lanzar una corrutina con un proveedor
