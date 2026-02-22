---
layout: docs
lang: es
path_key: "/docs/components/future.html"
nav_active: docs
permalink: /es/docs/components/future.html
page_title: "Future"
description: "Future en TrueAsync -- una promesa de resultado, cadenas de transformacion map/catch/finally, FutureState y diagnosticos."
---

# Future: Una Promesa de Resultado

## Que es Future

`Async\Future` es un objeto que representa el resultado de una operacion que puede no estar listo aun.
Future te permite:

- Esperar el resultado via `await()` o `$future->await()`
- Construir cadenas de transformacion via `map()`, `catch()`, `finally()`
- Cancelar la operacion via `cancel()`
- Crear Futures ya completados via fabricas estaticas

Future es similar a `Promise` en JavaScript, pero integrado con las corrutinas de TrueAsync.

## Future y FutureState

Future se divide en dos clases con una clara separacion de responsabilidades:

- **`FutureState`** -- un contenedor mutable a traves del cual se escribe el resultado
- **`Future`** -- un envoltorio de solo lectura a traves del cual se lee y transforma el resultado

```php
<?php
use Async\Future;
use Async\FutureState;

// Crear FutureState -- es el dueno del estado
$state = new FutureState();

// Crear Future -- proporciona acceso al resultado
$future = new Future($state);

// Pasar $future al consumidor
// Pasar $state al productor

// El productor completa la operacion
$state->complete(42);

// El consumidor obtiene el resultado
$result = $future->await(); // 42
?>
```

Esta separacion garantiza que el consumidor no pueda completar accidentalmente el Future -- solo el titular de `FutureState` tiene ese derecho.

## Creacion de un Future

### Via FutureState

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

$state = new FutureState();
$future = new Future($state);

// Completar en otra corrutina
spawn(function() use ($state) {
    $data = file_get_contents('https://api.example.com/data');
    $state->complete(json_decode($data, true));
});

$result = $future->await();
?>
```

### Fabricas Estaticas

Para crear Futures ya completados:

```php
<?php
use Async\Future;

// Future completado exitosamente
$future = Future::completed(42);
$result = $future->await(); // 42

// Future con un error
$future = Future::failed(new \RuntimeException('Algo salio mal'));
$result = $future->await(); // lanza RuntimeException
?>
```

## Cadenas de Transformacion

Future soporta tres metodos de transformacion, funcionando de manera similar a Promise en JavaScript:

### map() -- Transformar el Resultado

Se llama solo en caso de completacion exitosa. Devuelve un nuevo Future con el resultado transformado:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$doubled = $future->map(fn($value) => $value * 2);
$asString = $doubled->map(fn($value) => "Resultado: $value");

$state->complete(21);

echo $asString->await(); // "Resultado: 42"
?>
```

### catch() -- Manejar Errores

Se llama solo en caso de error. Permite recuperarse de una excepcion:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$safe = $future->catch(function(\Throwable $e) {
    return 'Valor por defecto';
});

$state->error(new \RuntimeException('Error'));

echo $safe->await(); // "Valor por defecto"
?>
```

### finally() -- Ejecucion en Cualquier Resultado

Siempre se llama -- tanto en exito como en error. El resultado del Future padre se pasa al hijo sin cambios:

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$withCleanup = $future->finally(function($resultOrException) {
    // Liberar recursos
    echo "Operacion completada\n";
});

$state->complete('data');

echo $withCleanup->await(); // "data" (el resultado se pasa sin cambios)
?>
```

### Cadenas Compuestas

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(fn($data) => json_decode($data, true))
    ->map(fn($parsed) => $parsed['name'] ?? 'Desconocido')
    ->catch(fn(\Throwable $e) => 'Error: ' . $e->getMessage())
    ->finally(function($value) {
        // Registro de logs
    });

$state->complete('{"name": "PHP"}');
echo $result->await(); // "PHP"
?>
```

### Suscriptores Independientes

Cada llamada a `map()` en el mismo Future crea una cadena **independiente**. Los suscriptores no se afectan entre si:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

// Dos cadenas independientes del mismo Future
$doubled = $future->map(fn($x) => $x * 2);
$tripled = $future->map(fn($x) => $x * 3);

$state->complete(10);

echo await($doubled) . "\n"; // 20
echo await($tripled) . "\n"; // 30
?>
```

### Propagacion de Errores en Cadenas

Si el Future fuente se completa con un error, `map()` se **omite**, y el error se pasa directamente a `catch()`:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($value) {
        echo "Este codigo no se ejecutara\n";
        return $value;
    })
    ->catch(function(\Throwable $e) {
        return 'Recuperado: ' . $e->getMessage();
    });

$state->error(new \RuntimeException('Error de origen'));

echo await($result) . "\n"; // "Recuperado: Error de origen"
?>
```

Si ocurre una excepcion **dentro** de `map()`, es capturada por el `catch()` posterior:

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($x) {
        throw new \RuntimeException('Error en map');
    })
    ->catch(function(\Throwable $e) {
        return 'Capturado: ' . $e->getMessage();
    });

$state->complete(42);

echo await($result) . "\n"; // "Capturado: Error en map"
?>
```

## Esperar el Resultado

### Via la Funcion await()

```php
<?php
use function Async\await;

$result = await($future);
```

### Via el Metodo $future->await()

```php
<?php
$result = $future->await();

// Con tiempo de espera de cancelacion
$result = $future->await(Async\timeout(5000));
```

## Cancelar un Future

```php
<?php
use Async\AsyncCancellation;

// Cancelar con mensaje por defecto
$future->cancel();

// Cancelar con un error personalizado
$future->cancel(new AsyncCancellation('La operacion ya no es necesaria'));
```

## Suprimir Advertencias: ignore()

Si un Future no se usa (no se llamo a `await()`, `map()`, `catch()` ni `finally()`), TrueAsync emitira una advertencia.
Para suprimir explicitamente esta advertencia:

```php
<?php
$future->ignore();
```

Tambien, si un Future se completo con un error y ese error no fue manejado, TrueAsync advertira al respecto. `ignore()` suprime esta advertencia igualmente.

## FutureState: Completar la Operacion

### complete() -- Completacion Exitosa

```php
<?php
$state->complete($result);
```

### error() -- Completacion con un Error

```php
<?php
$state->error(new \RuntimeException('Error'));
```

### Restricciones

- `complete()` y `error()` solo pueden llamarse **una vez**. Una llamada repetida lanzara `AsyncException`.
- Despues de llamar a `complete()` o `error()`, el estado del Future es inmutable.

```php
<?php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

## Diagnosticos

Ambas clases (`Future` y `FutureState`) proporcionan metodos de diagnostico:

```php
<?php
// Verificar estado
$future->isCompleted(); // bool
$future->isCancelled(); // bool

// Donde se creo el Future
$future->getCreatedFileAndLine();  // [string $file, int $line]
$future->getCreatedLocation();     // "file.php:42"

// Donde se completo el Future
$future->getCompletedFileAndLine(); // [string|null $file, int $line]
$future->getCompletedLocation();    // "file.php:55" o "unknown"

// Informacion de espera
$future->getAwaitingInfo(); // array
```

## Ejemplo Practico: Cliente HTTP

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function httpGet(string $url): Future {
    $state = new FutureState();
    $future = new Future($state);

    spawn(function() use ($state, $url) {
        try {
            $response = file_get_contents($url);
            $state->complete($response);
        } catch (\Throwable $e) {
            $state->error($e);
        }
    });

    return $future;
}

// Uso
$userFuture = httpGet('https://api.example.com/user/1')
    ->map(fn($json) => json_decode($json, true))
    ->catch(fn($e) => ['error' => $e->getMessage()]);

$result = $userFuture->await();
?>
```

## Vea Tambien

- [await()](/es/docs/reference/await.html) -- esperar la completacion
- [Corrutinas](/es/docs/components/coroutines.html) -- la unidad basica de concurrencia
- [Cancelacion](/es/docs/components/cancellation.html) -- el mecanismo de cancelacion
