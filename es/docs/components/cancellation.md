---
layout: docs
lang: es
path_key: "/docs/components/cancellation.html"
nav_active: docs
permalink: /es/docs/components/cancellation.html
page_title: "Cancelacion"
description: "Cancelacion de corrutinas en TrueAsync -- cancelacion cooperativa, secciones criticas con protect(), cancelacion en cascada via Scope, tiempos de espera."
---

# Cancelacion

Un navegador envio una solicitud, pero luego el usuario cerro la pagina.
El servidor continua trabajando en una solicitud que ya no es necesaria.
Seria bueno abortar la operacion para evitar costos innecesarios.
O supongamos que hay un proceso largo de copia de datos que necesita ser cancelado repentinamente.
Hay muchos escenarios en los que necesitas detener operaciones.
Normalmente este problema se resuelve con variables de bandera o tokens de cancelacion, lo cual es bastante laborioso. El codigo debe saber
que podria ser cancelado, debe planificar puntos de control de cancelacion y manejar correctamente estas situaciones.

## Cancelable por Diseno

La mayor parte del tiempo, una aplicacion esta ocupada leyendo datos
de bases de datos, archivos o la red. Interrumpir una lectura es seguro.
Por lo tanto, en `TrueAsync` se aplica el siguiente principio: **una corrutina puede ser cancelada en cualquier momento desde un estado de espera**.
Este enfoque reduce la cantidad de codigo, ya que en la mayoria de los casos, el programador no necesita preocuparse
por la cancelacion.

## Como Funciona la Cancelacion

Se utiliza una excepcion especial -- `Cancellation` -- para cancelar una corrutina.
La excepcion `Cancellation` o una derivada se lanza en un punto de suspension (`suspend()`, `await()`, `delay()`).
La ejecucion tambien puede ser interrumpida durante operaciones de E/S o cualquier otra operacion bloqueante.

```php
$coroutine = spawn(function() {
    echo "Iniciando trabajo\n";
    suspend(); // Aqui la corrutina recibira Cancellation
    echo "Esto no sucedera\n";
});

$coroutine->cancel();

try {
    await($coroutine);
} catch (\Cancellation $e) {
    echo "Corrutina cancelada\n";
    throw $e;
}
```

## La Cancelacion No Puede Ser Suprimida

`Cancellation` es una excepcion de nivel base, al mismo nivel que `Error` y `Exception`.
La construccion `catch (Exception $e)` no la capturara.

Capturar `Cancellation` y continuar trabajando es un error.
Puedes usar `catch Async\AsyncCancellation` para manejar situaciones especiales,
pero debes asegurarte de relanzar correctamente la excepcion.
En general, se recomienda usar `finally` para la limpieza garantizada de recursos:

```php
spawn(function() {
    $connection = connectToDatabase();

    try {
        processData($connection);
    } finally {
        $connection->close();
    }
});
```

## Tres Escenarios de Cancelacion

El comportamiento de `cancel()` depende del estado de la corrutina:

**La corrutina aun no ha comenzado** -- nunca se iniciara.

```php
$coroutine = spawn(function() {
    echo "No se ejecutara\n";
});
$coroutine->cancel();
```

**La corrutina esta en estado de espera** -- se despertara con una excepcion `Cancellation`.

```php
$coroutine = spawn(function() {
    echo "Trabajo iniciado\n";
    suspend(); // Aqui recibira Cancellation
    echo "No se ejecutara\n";
});

suspend();
$coroutine->cancel();
```

**La corrutina ya ha terminado** -- no pasa nada.

```php
$coroutine = spawn(function() {
    return 42;
});

await($coroutine);
$coroutine->cancel(); // No es un error, pero no tiene efecto
```

## Secciones Criticas: protect()

No toda operacion puede ser interrumpida de forma segura.
Si una corrutina ha debitado dinero de una cuenta pero aun no ha acreditado otra --
la cancelacion en este punto llevaria a la perdida de datos.

La funcion `protect()` aplaza la cancelacion hasta que la seccion critica se complete:

```php
use Async\protect;
use Async\spawn;

$coroutine = spawn(function() {
    protect(function() {
        $db->query("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
        suspend();
        $db->query("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    });

    // La cancelacion tomara efecto aqui -- despues de salir de protect()
});

suspend();
$coroutine->cancel();
```

Dentro de `protect()`, la corrutina se marca como protegida.
Si `cancel()` llega en este momento, la cancelacion se guarda
pero no se aplica. Tan pronto como `protect()` se completa --
la cancelacion diferida toma efecto inmediatamente.

## Cancelacion en Cascada via Scope

Cuando un `Scope` es cancelado, todas sus corrutinas y todos los scopes hijos son cancelados.
La cascada va **solo de arriba hacia abajo** -- cancelar un scope hijo no afecta al padre ni a los scopes hermanos.

### Aislamiento: Cancelar un Hijo No Afecta a Otros

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

// Cancelar solo child1
$child1->cancel();

$parent->isCancelled(); // false -- el padre no se ve afectado
$child1->isCancelled(); // true
$child2->isCancelled(); // false -- el scope hermano no se ve afectado
```

### Cascada Descendente: Cancelar un Padre Cancela Todos los Descendientes

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

$parent->cancel(); // Cascada: cancela tanto child1 como child2

$parent->isCancelled(); // true
$child1->isCancelled(); // true
$child2->isCancelled(); // true
```

### Una Corrutina Puede Cancelar Su Propio Scope

Una corrutina puede iniciar la cancelacion del scope en el que se ejecuta. El codigo antes del punto de suspension mas cercano continuara ejecutandose:

```php
$scope = new Async\Scope();

$scope->spawn(function() use ($scope) {
    echo "Iniciando\n";
    $scope->cancel();
    echo "Esto aun se ejecutara\n";
    suspend();
    echo "Pero esto no\n";
});
```

Despues de la cancelacion, el scope se cierra -- ya no es posible lanzar una nueva corrutina en el.

## Tiempos de Espera

Un caso especial de cancelacion es un tiempo de espera. La funcion `timeout()` crea un limite de tiempo:

```php
$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com/data');
});

try {
    $result = await($coroutine, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "La API no respondio en 5 segundos\n";
}
```

`TimeoutException` es un subtipo de `Cancellation`,
por lo que la corrutina termina segun las mismas reglas.

## Verificacion del Estado

Una corrutina proporciona dos metodos para verificar la cancelacion:

- `isCancellationRequested()` -- la cancelacion fue solicitada pero aun no se ha aplicado
- `isCancelled()` -- la corrutina realmente se ha detenido

```php
$coroutine = spawn(function() {
    suspend();
});

$coroutine->cancel();

$coroutine->isCancellationRequested(); // true
$coroutine->isCancelled();             // false -- aun no procesado

suspend();

$coroutine->isCancelled();             // true
```

## Ejemplo: Worker de Cola con Apagado Graceful

```php
class QueueWorker {
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
        $this->queue = new Async\Channel();
    }

    public function start(): void {
        $this->scope->spawn(function() {
            while (true) {
                $job = $this->queue->receive();

                try {
                    $job->process();
                } finally {
                    $job->markDone();
                }
            }
        });
    }

    public function stop(): void
    {
        // Todas las corrutinas seran detenidas aqui
        $this->scope->cancel();
    }
}
```

## Que Sigue?

- [Scope](/es/docs/components/scope.html) -- gestion de grupos de corrutinas
- [Corrutinas](/es/docs/components/coroutines.html) -- ciclo de vida de las corrutinas
- [Canales](/es/docs/components/channels.html) -- intercambio de datos entre corrutinas
