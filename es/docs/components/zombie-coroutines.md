---
layout: docs
lang: es
path_key: "/docs/components/zombie-coroutines.html"
nav_active: docs
permalink: /es/docs/components/zombie-coroutines.html
page_title: "Corrutinas Zombie"
description: "Corrutinas zombie en TrueAsync -- tolerancia para codigo de terceros, disposeSafely(), disposeAfterTimeout(), gestion de tareas no cancelables."
---

# Corrutinas Zombie: Tolerancia a Fallos

## El Problema: Codigo Que No Puede Ser Cancelado

La cancelacion de corrutinas es un proceso cooperativo. La corrutina recibe una excepcion `Cancellation`
en un punto de suspension y debe terminar de forma elegante. Pero que pasa si alguien cometio un error y creo una corrutina en el `Scope` incorrecto?
Aunque `TrueAsync` sigue el principio de `Cancelacion por diseno`, pueden surgir situaciones donde alguien escribio codigo
cuya cancelacion podria llevar a un resultado desagradable.
Por ejemplo, alguien creo una tarea en segundo plano para enviar un `email`. La corrutina fue cancelada, el `email` nunca se envio.

La alta tolerancia a fallos permite ahorros significativos en tiempo de desarrollo
y minimiza las consecuencias de los errores, si los programadores usan el analisis de logs para mejorar la calidad de la aplicacion.

## La Solucion: Corrutinas Zombie

Para suavizar tales situaciones, `TrueAsync` proporciona un enfoque especial:
manejo tolerante de corrutinas "atascadas" -- corrutinas zombie.

Una corrutina `zombie` es una corrutina que:
* Continua ejecutandose normalmente
* Permanece vinculada a su Scope
* No se considera activa -- el Scope puede completarse formalmente sin esperarla
* No bloquea `awaitCompletion()`, pero bloquea `awaitAfterCancellation()`

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    thirdPartySync(); // Codigo de terceros -- no sabemos como reacciona a la cancelacion
});

$scope->spawn(function() {
    return myOwnCode(); // Nuestro codigo -- maneja correctamente la cancelacion
});

// disposeSafely() NO cancela las corrutinas, pero las marca como zombie
$scope->disposeSafely();
// El Scope esta cerrado para nuevas corrutinas.
// Las corrutinas existentes continuan trabajando como zombies.
```

## Tres Estrategias para la Terminacion del Scope

`TrueAsync` proporciona tres formas de cerrar un `Scope`, disenadas para diferentes niveles de confianza en el codigo:

### `dispose()` -- Cancelacion Forzada

Todas las corrutinas reciben `Cancellation`. El Scope se cierra inmediatamente.
Usa cuando controles todo el codigo dentro del Scope.

```php
$scope->dispose();
// Todas las corrutinas estan canceladas. El Scope esta cerrado.
```

### `disposeSafely()` -- Sin Cancelacion, las Corrutinas Se Convierten en Zombies

Las corrutinas **no reciben** `Cancellation`. Se marcan como `zombie` y continuan ejecutandose.
El `Scope` se considera cerrado -- no se pueden crear nuevas corrutinas.

Usa cuando el `Scope` contiene codigo "de terceros" y no tienes confianza en la correctitud de la cancelacion.

```php
$scope->disposeSafely();
// Las corrutinas continuan trabajando como zombies.
// El Scope esta cerrado para nuevas tareas.
```

### `disposeAfterTimeout(int $timeout)` -- Cancelacion con Tiempo de Espera

Una combinacion de ambos enfoques: primero, se da tiempo a las corrutinas para terminar,
luego el `Scope` se cancela forzosamente.

```php
$scope->disposeAfterTimeout(5000);
// Despues de 5 segundos, el Scope enviara Cancellation a todas las corrutinas restantes.
```

## Esperar Corrutinas Zombie

`awaitCompletion()` espera solo por las corrutinas **activas**. Una vez que todas las corrutinas se convierten en zombies,
`awaitCompletion()` considera el Scope terminado y devuelve el control.

Pero a veces necesitas esperar a que **todas** las corrutinas completen, incluyendo las zombies.
Para esto existe `awaitAfterCancellation()`:

```php
$scope = new Async\Scope();
$scope->spawn(fn() => longRunningTask());
$scope->spawn(fn() => anotherTask());

// Cancelar -- las corrutinas que no pueden ser canceladas se convertiran en zombies
$scope->cancel();

// awaitCompletion() retornara inmediatamente si solo quedan zombies
$scope->awaitCompletion($cancellation);

// awaitAfterCancellation() esperara a TODAS, incluyendo zombies
$scope->awaitAfterCancellation(function (\Throwable $error, Async\Scope $scope) {
    // Manejador de errores para corrutinas zombie
    echo "Error zombie: " . $error->getMessage() . "\n";
});
```

| Metodo                       | Espera activas | Espera zombies | Requiere cancel() |
|------------------------------|:--------------:|:--------------:|:------------------:|
| `awaitCompletion()`          |       Si       |       No       |         No         |
| `awaitAfterCancellation()`   |       Si       |       Si       |        Si          |

`awaitAfterCancellation()` solo puede llamarse despues de `cancel()` -- de lo contrario ocurrira un error.
Esto tiene sentido: las corrutinas zombie aparecen precisamente como resultado de la cancelacion con la bandera `DISPOSE_SAFELY`.

## Como Funcionan los Zombies Internamente

Cuando una corrutina se marca como `zombie`, ocurre lo siguiente:

1. La corrutina recibe la bandera `ZOMBIE`
2. El contador de corrutinas activas en el `Scope` disminuye en 1
3. El contador de corrutinas `zombie` aumenta en 1
4. El `Scope` verifica si quedan corrutinas activas y puede notificar a los que esperan sobre la completacion

```
Scope
+-- active_coroutines_count: 0    <-- disminuye
+-- zombie_coroutines_count: 2    <-- aumenta
+-- coroutine A (zombie)          <-- continua ejecutandose
+-- coroutine B (zombie)          <-- continua ejecutandose
```

Una corrutina `zombie` **no se desvincula** del `Scope`. Permanece en su lista de corrutinas,
pero no se cuenta como activa. Cuando una corrutina `zombie` finalmente completa,
se elimina del `Scope`, y el `Scope` verifica si puede liberar completamente los recursos.

## Como el Planificador Maneja los Zombies

El `Scheduler` mantiene dos contadores de corrutinas independientes:

1. **Contador global de corrutinas activas** (`active_coroutine_count`) -- usado para verificaciones rapidas
   de si hay algo que planificar
2. **Registro de corrutinas** (tabla hash `coroutines`) -- contiene **todas** las corrutinas que aun se ejecutan,
   incluyendo `zombies`

Cuando una corrutina se marca como `zombie`:
* El contador global de corrutinas activas **disminuye** -- el Scheduler considera que hay menos trabajo activo
* La corrutina **permanece** en el registro -- el `Scheduler` continua gestionando su ejecucion

La aplicacion continua ejecutandose mientras el contador de corrutinas activas sea mayor que cero. Una consecuencia importante:
Las corrutinas `zombie` no impiden el cierre de la aplicacion, ya que no se consideran activas.
Si no quedan mas corrutinas activas, la aplicacion termina e incluso las corrutinas `zombie` seran canceladas.

## Herencia de la Bandera Safely

Por defecto, un `Scope` se crea con la bandera `DISPOSE_SAFELY`.
Esto significa: si el `Scope` es destruido (por ejemplo, en el destructor de un objeto),
las corrutinas se convierten en `zombies` en lugar de ser canceladas.

Un `Scope` hijo hereda esta bandera de su padre:

```php
$parent = new Async\Scope();
// parent tiene la bandera DISPOSE_SAFELY por defecto

$child = Async\Scope::inherit($parent);
// child tambien tiene la bandera DISPOSE_SAFELY
```

Si deseas cancelacion forzada en la destruccion, usa `asNotSafely()`:

```php
$scope = (new Async\Scope())->asNotSafely();
// Ahora cuando el objeto Scope sea destruido,
// las corrutinas seran canceladas forzosamente en lugar de marcarse como zombies
```

## Ejemplo: Servidor HTTP con Middleware

```php
class RequestHandler
{
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function handle(Request $request): Response {
        // Lanzar middleware -- esto podria ser codigo de terceros
        $this->scope->spawn(function() use ($request) {
            $this->runMiddleware($request);
        });

        // Procesamiento principal -- nuestro codigo
        $response = $this->scope->spawn(function() use ($request) {
            return $this->processRequest($request);
        });

        return await($response);
    }

    public function __destruct() {
        // En la destruccion: el middleware puede no estar listo para la cancelacion,
        // asi que usamos disposeSafely() (comportamiento por defecto).
        // Las corrutinas zombie terminaran por su cuenta.
        $this->scope->disposeSafely();
    }
}
```

## Ejemplo: Manejador con Limite de Tiempo

```php
$scope = new Async\Scope();

// Lanzar tareas con codigo de terceros
$scope->spawn(fn() => thirdPartyAnalytics($data));
$scope->spawn(fn() => thirdPartyNotification($userId));

// Dar 10 segundos para terminar, luego cancelacion forzada
$scope->disposeAfterTimeout(10000);
```

## Cuando los Zombies Se Convierten en un Problema

Las corrutinas `zombie` son un compromiso. Resuelven el problema del codigo de terceros
pero pueden llevar a fugas de recursos.

Por lo tanto, `disposeAfterTimeout()` o un `Scope` con cancelacion explicita de corrutinas es la mejor opcion para produccion:
da tiempo al codigo de terceros para terminar pero garantiza la cancelacion en caso de bloqueo.

## Resumen

| Metodo                      | Cancela corrutinas | Las corrutinas terminan | Scope cerrado |
|---------------------------|:------------------:|:----------------------:|:-------------:|
| `dispose()`               |        Si          |           No           |      Si       |
| `disposeSafely()`         |        No          |   Si (como zombies)    |      Si       |
| `disposeAfterTimeout(ms)` |  Despues del timeout |  Hasta el timeout     |      Si       |

## Registro de Corrutinas Zombie

En versiones futuras, `TrueAsync` pretende proporcionar un mecanismo para registrar corrutinas zombie, que permitira
a los desarrolladores solucionar problemas relacionados con tareas atascadas.

## Que Sigue?

- [Scope](/es/docs/components/scope.html) -- gestion de grupos de corrutinas
- [Cancelacion](/es/docs/components/cancellation.html) -- patrones de cancelacion
- [Corrutinas](/es/docs/components/coroutines.html) -- ciclo de vida de las corrutinas
