---
layout: docs
lang: es
path_key: "/docs/components/scope.html"
nav_active: docs
permalink: /es/docs/components/scope.html
page_title: "Scope"
description: "Scope en TrueAsync -- gestion del ciclo de vida de corrutinas, jerarquia, cancelacion grupal, manejo de errores y concurrencia estructurada."
---

# Scope: Gestion del Ciclo de Vida de Corrutinas

## El Problema: Control Explicito de Recursos, Corrutinas Olvidadas

```php
function processUser($userId) {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    return "OK";
}

processUser(123);
// La funcion retorno, pero tres corrutinas siguen ejecutandose!
// Quien las esta vigilando? Cuando terminaran?
// Quien manejara las excepciones si ocurren?
```

Uno de los problemas comunes en la programacion asincrona son las corrutinas accidentalmente "olvidadas" por el desarrollador.
Se lanzan, realizan trabajo, pero nadie monitorea su ciclo de vida.
Esto puede llevar a fugas de recursos, operaciones incompletas y errores dificiles de encontrar.
Para aplicaciones `stateful`, este problema es significativo.

## La Solucion: Scope

![Concepto de Scope](../../../assets/docs/scope_concept.jpg)

**Scope** -- un espacio logico para ejecutar corrutinas, que puede compararse con una caja de arena.

Las siguientes reglas garantizan que las corrutinas estan bajo control:
* El codigo siempre sabe en que `Scope` se esta ejecutando
* La funcion `spawn()` crea una corrutina en el `Scope` actual
* Un `Scope` conoce todas las corrutinas que le pertenecen

```php
function processUser($userId):string {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    // Esperar hasta que todas las corrutinas en el scope terminen
    $scope->awaitCompletion(new Async\Timeout(1000));

    return "OK";
}

$scope = new Async\Scope();
$scope->spawn(processUser(...), 123);
$scope->awaitCompletion(new Async\Timeout(5000));

// Ahora la funcion solo retornara cuando TODAS las corrutinas hayan terminado
```

## Vinculacion a un Objeto

`Scope` es conveniente vincularlo a un objeto para expresar explicitamente la propiedad de un grupo de corrutinas.
Tal semantica expresa directamente la intencion del programador.

```php
class UserService
{
    // Solo un objeto unico sera dueno de un Scope unico
    // Las corrutinas viven mientras exista el objeto UserService
    private Scope $scope;

    public function __construct() {
        // Crear una cupula para todas las corrutinas del servicio
        $this->scope = new Async\Scope();
    }

    public function sendNotification($userId) {
        // Lanzar una corrutina dentro de nuestra cupula
        $this->scope->spawn(function() use ($userId) {
            // Esta corrutina esta vinculada a UserService
            sendEmail($userId);
        });
    }

    public function __destruct() {
        // Cuando el objeto se elimina, se garantiza la limpieza de recursos
        // Todas las corrutinas internas se cancelan automaticamente
        $this->scope->dispose();
    }
}

$service = new UserService();
$service->sendNotification(123);
$service->sendNotification(456);

// Eliminar el servicio - todas sus corrutinas se cancelan automaticamente
unset($service);
```

## Jerarquia de Scopes

Un scope puede contener otros scopes. Cuando un scope padre es cancelado,
todos los scopes hijos y sus corrutinas tambien son cancelados.

Este enfoque se llama **concurrencia estructurada**.

```php
$mainScope = new Async\Scope();

$mainScope->spawn(function() {
    echo "Tarea principal\n";

    // Crear un scope hijo
    $childScope = Async\Scope::inherit();

    $childScope->spawn(function() {
        echo "Subtarea 1\n";
    });

    $childScope->spawn(function() {
        echo "Subtarea 2\n";
    });

    // Esperar a que las subtareas completen
    $childScope->awaitCompletion();

    echo "Todas las subtareas completadas\n";
});

$mainScope->awaitCompletion();
```

Si cancelas `$mainScope`, todos los scopes hijos tambien seran cancelados. Toda la jerarquia.

## Cancelar Todas las Corrutinas en un Scope

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        while (true) {
            echo "Trabajando...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Fui cancelado!\n";
    }
});

$scope->spawn(function() {
    try {
        while (true) {
            echo "Tambien trabajando...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Yo tambien!\n";
    }
});

// Funciona por 3 segundos
Async\sleep(3000);

// Cancelar TODAS las corrutinas en el scope
$scope->cancel();

// Ambas corrutinas recibiran AsyncCancellation
```

## Manejo de Errores en Scope

Cuando una corrutina dentro de un scope falla con un error, el scope puede capturarlo:

```php
$scope = new Async\Scope();

// Configurar un manejador de errores
$scope->setExceptionHandler(function(Throwable $e) {
    echo "Error en el scope: " . $e->getMessage() . "\n";
    // Puede registrarlo, enviarlo a Sentry, etc.
});

$scope->spawn(function() {
    throw new Exception("Algo se rompio!");
});

$scope->spawn(function() {
    echo "Estoy funcionando bien\n";
});

$scope->awaitCompletion();

// Salida:
// Error en el scope: Algo se rompio!
// Estoy funcionando bien
```

## Finally: Limpieza Garantizada

Incluso si un scope es cancelado, los bloques finally se ejecutaran:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        echo "Iniciando trabajo\n";
        Async\sleep(10000); // Operacion larga
        echo "Terminado\n"; // No se ejecutara
    } finally {
        // Esto esta GARANTIZADO que se ejecutara
        echo "Limpiando recursos\n";
        closeConnection();
    }
});

Async\sleep(1000);
$scope->cancel(); // Cancelar despues de un segundo

// Salida:
// Iniciando trabajo
// Limpiando recursos
```

## TaskGroup: Scope con Resultados

`TaskGroup` -- un scope especializado para la ejecucion paralela de tareas
con agregacion de resultados. Soporta limites de concurrencia,
tareas con nombre, y tres estrategias de espera:

```php
$group = new Async\TaskGroup(concurrency: 5);

$group->spawn(fn() => fetchUser(1));
$group->spawn(fn() => fetchUser(2));
$group->spawn(fn() => fetchUser(3));

// Obtener todos los resultados (espera a que todas las tareas completen)
$results = await($group->all());

// O obtener el primer resultado completado
$first = await($group->race());

// O el primero exitoso (ignorando errores)
$any = await($group->any());
```

Las tareas pueden anadirse con claves e iterarse a medida que se completan:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user', fn() => fetchUser(1));
$group->spawnWithKey('orders', fn() => fetchOrders(1));

// Iterar sobre los resultados a medida que estan listos
foreach ($group as $key => [$result, $error]) {
    if ($error) {
        echo "Tarea $key fallo: {$error->getMessage()}\n";
    } else {
        echo "Tarea $key: $result\n";
    }
}
```

## Scope Global: Siempre Hay un Padre

Si no especificas un scope explicitamente, la corrutina se crea en el **scope global**:

```php
// Sin especificar un scope
spawn(function() {
    echo "Estoy en el scope global\n";
});

// Lo mismo que:
Async\Scope::global()->spawn(function() {
    echo "Estoy en el scope global\n";
});
```

El scope global vive durante toda la solicitud. Cuando PHP termina, todas las corrutinas en el scope global se cancelan de forma elegante.

## Ejemplo Real: Cliente HTTP

```php
class HttpClient {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function get(string $url): Async\Awaitable {
        return $this->scope->spawn(function() use ($url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            try {
                return curl_exec($ch);
            } finally {
                curl_close($ch);
            }
        });
    }

    public function cancelAll(): void {
        // Cancelar todas las solicitudes activas
        $this->scope->cancel();
    }

    public function __destruct() {
        // Cuando el cliente se destruye, todas las solicitudes se cancelan automaticamente
        $this->scope->dispose();
    }
}

$client = new HttpClient();

$req1 = $client->get('https://api1.com/data');
$req2 = $client->get('https://api2.com/data');
$req3 = $client->get('https://api3.com/data');

// Cancelar todas las solicitudes
$client->cancelAll();

// O simplemente destruir el cliente - mismo efecto
unset($client);
```

## Concurrencia Estructurada

`Scope` implementa el principio de **Concurrencia Estructurada** --
un conjunto de reglas para gestionar tareas concurrentes, probado en runtimes de produccion
de `Kotlin`, `Swift` y `Java`.

### API para la Gestion del Ciclo de Vida

`Scope` proporciona la capacidad de controlar explicitamente el ciclo de vida de una jerarquia de corrutinas
usando los siguientes metodos:

| Metodo                                   | Que hace                                                         |
|------------------------------------------|------------------------------------------------------------------|
| `$scope->spawn(Closure, ...$args)`       | Lanza una corrutina dentro del Scope                             |
| `$scope->awaitCompletion($cancellation)` | Espera a que todas las corrutinas en el Scope completen          |
| `$scope->cancel()`                       | Envia una senal de cancelacion a todas las corrutinas            |
| `$scope->dispose()`                      | Cierra el Scope y cancela forzosamente todas las corrutinas      |
| `$scope->disposeSafely()`               | Cierra el Scope; las corrutinas no se cancelan sino que se marcan zombie |
| `$scope->awaitAfterCancellation()`       | Espera a que todas las corrutinas completen, incluyendo las zombie |
| `$scope->disposeAfterTimeout(int $ms)`   | Cancela las corrutinas despues de un tiempo de espera            |

Estos metodos permiten implementar tres patrones clave:

**1. El padre espera a todas las tareas hijas**

```php
$scope = new Async\Scope();
$scope->spawn(function() { /* tarea 1 */ });
$scope->spawn(function() { /* tarea 2 */ });

// El control no retornara hasta que ambas tareas completen
$scope->awaitCompletion();
```

En Kotlin, lo mismo se hace con `coroutineScope { }`,
en Swift -- con `withTaskGroup { }`.

**2. El padre cancela todas las tareas hijas**

```php
$scope->cancel();
// Todas las corrutinas en $scope recibiran una senal de cancelacion.
// Los Scopes hijos tambien seran cancelados -- recursivamente, a cualquier profundidad.
```

**3. El padre cierra el Scope y libera recursos**

`dispose()` cierra el Scope y cancela forzosamente todas sus corrutinas:

```php
$scope->dispose();
// El Scope esta cerrado. Todas las corrutinas estan canceladas.
// No se pueden anadir nuevas corrutinas a este Scope.
```

Si necesitas cerrar el Scope pero permitir que las corrutinas actuales **terminen su trabajo**,
usa `disposeSafely()` -- las corrutinas se marcan como zombie
(no se cancelan, continuan ejecutandose, pero el Scope se considera terminado por tareas activas):

```php
$scope->disposeSafely();
// El Scope esta cerrado. Las corrutinas continuan trabajando como zombies.
// El Scope las rastrea pero no las cuenta como activas.
```

### Manejo de Errores: Dos Estrategias

Una excepcion no manejada en una corrutina no se pierde -- sube al Scope padre.
Diferentes runtimes ofrecen diferentes estrategias:

| Estrategia                                                       | Kotlin            | Swift                   | TrueAsync                          |
|------------------------------------------------------------------|-------------------|-------------------------|------------------------------------|
| **Fallar juntos**: el error de un hijo cancela a todos los demas | `coroutineScope`  | `withThrowingTaskGroup` | `Scope` (por defecto)              |
| **Hijos independientes**: el error de uno no afecta a los demas  | `supervisorScope` | `Task` separado         | `$scope->setExceptionHandler(...)` |

La capacidad de elegir una estrategia es la diferencia clave con "lanzar y olvidar".

### Herencia de Contexto

Las tareas hijas reciben automaticamente el contexto del padre:
prioridad, plazos, metadatos -- sin pasar parametros explicitamente.

En Kotlin, las corrutinas hijas heredan el `CoroutineContext` del padre (dispatcher, nombre, `Job`).
En Swift, las instancias `Task` hijas heredan la prioridad y los valores task-local.

### Donde Esto Ya Funciona

| Lenguaje   | API                                                             | En produccion desde |
|------------|-----------------------------------------------------------------|---------------------|
| **Kotlin** | `coroutineScope`, `supervisorScope`                             | 2018                |
| **Swift**  | `TaskGroup`, `withThrowingTaskGroup`                            | 2021                |
| **Java**   | `StructuredTaskScope` ([JEP 453](https://openjdk.org/jeps/453)) | 2023 (preview)      |

TrueAsync trae este enfoque a PHP a traves de `Async\Scope`.

## Que Sigue?

- [Corrutinas](/es/docs/components/coroutines.html) -- como funcionan las corrutinas
- [Cancelacion](/es/docs/components/cancellation.html) -- patrones de cancelacion
- [Corrutinas Zombie](/es/docs/components/zombie-coroutines.html) -- tolerancia para codigo de terceros
