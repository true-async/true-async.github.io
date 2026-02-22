---
layout: docs
lang: es
path_key: "/docs/components/exceptions.html"
nav_active: docs
permalink: /es/docs/components/exceptions.html
page_title: "Excepciones"
description: "Jerarquia de excepciones de TrueAsync -- AsyncCancellation, TimeoutException, DeadlockError y otras."
---

# Excepciones

## Jerarquia

TrueAsync define una jerarquia de excepciones especializada para diferentes tipos de errores:

```
\Cancellation                              -- clase base de cancelacion (al mismo nivel que \Error y \Exception)
+-- Async\AsyncCancellation                -- cancelacion de corrutina

\Error
+-- Async\DeadlockError                    -- interbloqueo detectado

\Exception
+-- Async\AsyncException                   -- error general de operacion asincrona
|   +-- Async\ServiceUnavailableException  -- servicio no disponible (circuit breaker)
+-- Async\InputOutputException             -- error de E/S
+-- Async\DnsException                     -- error de resolucion DNS
+-- Async\TimeoutException                 -- tiempo de espera de operacion agotado
+-- Async\PollException                    -- error de operacion poll
+-- Async\ChannelException                 -- error de canal
+-- Async\PoolException                    -- error de pool de recursos
+-- Async\CompositeException               -- contenedor para multiples excepciones
```

## AsyncCancellation

```php
class Async\AsyncCancellation extends \Cancellation {}
```

Se lanza cuando una corrutina es cancelada. `\Cancellation` es la tercera clase raiz `Throwable` al mismo nivel que `\Error` y `\Exception`, por lo que los bloques regulares `catch (\Exception $e)` y `catch (\Error $e)` **no** capturan accidentalmente la cancelacion.

```php
<?php
use Async\AsyncCancellation;
use function Async\spawn;
use function Async\await;
use function Async\delay;

$coroutine = spawn(function() {
    try {
        delay(10000);
    } catch (AsyncCancellation $e) {
        // Terminar el trabajo de forma elegante
        echo "Cancelado: " . $e->getMessage() . "\n";
    }
});

delay(100);
$coroutine->cancel();
?>
```

**Importante:** No captures `AsyncCancellation` via `catch (\Throwable $e)` sin relanzarla -- esto viola el mecanismo de cancelacion cooperativa.

## DeadlockError

```php
class Async\DeadlockError extends \Error {}
```

Se lanza cuando el planificador detecta un interbloqueo -- una situacion donde las corrutinas se estan esperando mutuamente y ninguna puede avanzar.

```php
<?php
use function Async\spawn;
use function Async\await;

// Interbloqueo clasico: dos corrutinas esperandose mutuamente
$c1 = spawn(function() use (&$c2) {
    await($c2); // espera a c2
});

$c2 = spawn(function() use (&$c1) {
    await($c1); // espera a c1
});
// DeadlockError: A deadlock was detected
?>
```

Ejemplo donde una corrutina se espera a si misma:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() use (&$coroutine) {
    await($coroutine); // se espera a si misma
});
// DeadlockError
?>
```

## AsyncException

```php
class Async\AsyncException extends \Exception {}
```

Excepcion base para errores generales de operaciones asincronas. Se usa para errores que no caen en categorias especializadas.

## TimeoutException

```php
class Async\TimeoutException extends \Exception {}
```

Se lanza cuando se excede un tiempo de espera. Se crea automaticamente cuando `timeout()` se activa:

```php
<?php
use Async\TimeoutException;
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use function Async\delay;

try {
    $coroutine = spawn(function() {
        delay(10000); // Operacion larga
    });
    await($coroutine, timeout(1000)); // Tiempo de espera de 1 segundo
} catch (TimeoutException $e) {
    echo "La operacion no se completo a tiempo\n";
}
?>
```

## InputOutputException

```php
class Async\InputOutputException extends \Exception {}
```

Excepcion general para errores de E/S: sockets, archivos, pipes y otros descriptores de E/S.

## DnsException

```php
class Async\DnsException extends \Exception {}
```

Se lanza en errores de resolucion DNS (`gethostbyname`, `gethostbyaddr`, `gethostbynamel`).

## PollException

```php
class Async\PollException extends \Exception {}
```

Se lanza en errores de operaciones poll sobre descriptores.

## ServiceUnavailableException

```php
class Async\ServiceUnavailableException extends Async\AsyncException {}
```

Se lanza cuando el circuit breaker esta en estado `INACTIVE` y una solicitud de servicio es rechazada sin intentar ejecutarla.

```php
<?php
use Async\ServiceUnavailableException;

try {
    $resource = $pool->acquire();
} catch (ServiceUnavailableException $e) {
    echo "El servicio no esta disponible temporalmente\n";
}
?>
```

## ChannelException

```php
class Async\ChannelException extends Async\AsyncException {}
```

Se lanza en errores de operaciones de canal: enviar a un canal cerrado, recibir de un canal cerrado, etc.

## PoolException

```php
class Async\PoolException extends Async\AsyncException {}
```

Se lanza en errores de operaciones del pool de recursos.

## CompositeException

```php
final class Async\CompositeException extends \Exception
{
    public function addException(\Throwable $exception): void;
    public function getExceptions(): array;
}
```

Un contenedor para multiples excepciones. Se usa cuando varios manejadores (por ejemplo, `finally` en Scope) lanzan excepciones durante la finalizacion:

```php
<?php
use Async\Scope;
use Async\CompositeException;

$scope = new Scope();

$scope->finally(function() {
    throw new \Exception('Error de limpieza 1');
});

$scope->finally(function() {
    throw new \RuntimeException('Error de limpieza 2');
});

$scope->setExceptionHandler(function($scope, $coroutine, $exception) {
    if ($exception instanceof CompositeException) {
        echo "Errores: " . count($exception->getExceptions()) . "\n";
        foreach ($exception->getExceptions() as $e) {
            echo "  - " . $e->getMessage() . "\n";
        }
    }
});

$scope->dispose();
// Errores: 2
//   - Error de limpieza 1
//   - Error de limpieza 2
?>
```

## Recomendaciones

### Manejar Correctamente AsyncCancellation

```php
<?php
// Correcto: capturar excepciones especificas
try {
    await($coroutine);
} catch (\Exception $e) {
    // AsyncCancellation NO sera capturado aqui -- es \Cancellation
    handleError($e);
}
```

```php
<?php
// Si necesitas capturar todo -- siempre relanza AsyncCancellation
try {
    await($coroutine);
} catch (Async\AsyncCancellation $e) {
    throw $e; // Relanzar
} catch (\Throwable $e) {
    handleError($e);
}
```

### Proteger Secciones Criticas

Usa `protect()` para operaciones que no deben ser interrumpidas por la cancelacion:

```php
<?php
use function Async\protect;

$db->beginTransaction();

protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
});
```

## Vea Tambien

- [Cancelacion](/es/docs/components/cancellation.html) -- el mecanismo de cancelacion de corrutinas
- [protect()](/es/docs/reference/protect.html) -- proteccion contra la cancelacion
- [Scope](/es/docs/components/scope.html) -- manejo de excepciones en scopes
