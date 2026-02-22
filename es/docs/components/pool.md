---
layout: docs
lang: es
path_key: "/docs/components/pool.html"
nav_active: docs
permalink: /es/docs/components/pool.html
page_title: "Async\\Pool"
description: "Async\\Pool -- pool universal de recursos para corrutinas: creacion, acquire/release, healthcheck, circuit breaker."
---

# Async\Pool: Pool Universal de Recursos

## Por Que Necesitas un Pool

Al trabajar con corrutinas, surge el problema de compartir descriptores de E/S.
Si el mismo socket es usado por dos corrutinas que simultaneamente escriben o leen
diferentes paquetes de el, los datos se mezclaran y el resultado sera impredecible.
Por lo tanto, no puedes simplemente usar el mismo objeto `PDO` en diferentes corrutinas!

Por otro lado, crear una conexion separada para cada corrutina una y otra vez es una estrategia muy costosa.
Anula las ventajas de la E/S concurrente. Por lo tanto, tipicamente se usan pools de conexiones
para interactuar con APIs externas, bases de datos y otros recursos.

Un pool resuelve este problema: los recursos se crean por adelantado, se entregan a las corrutinas bajo demanda,
y se devuelven para su reutilizacion.

```php
use Async\Pool;

// Pool de conexiones HTTP
$pool = new Pool(
    factory: fn() => new HttpConnection('api.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);

// Una corrutina toma una conexion, la usa y la devuelve
$conn = $pool->acquire();
$response = $conn->request('GET', '/users');
$pool->release($conn);
```

## Creacion de un Pool

```php
$pool = new Pool(
    factory:            fn() => createResource(),       // Como crear un recurso
    destructor:         fn($r) => $r->close(),          // Como destruir un recurso
    healthcheck:        fn($r) => $r->ping(),           // El recurso esta vivo?
    beforeAcquire:      fn($r) => $r->isValid(),        // Verificar antes de entregar
    beforeRelease:      fn($r) => !$r->isBroken(),      // Verificar antes de devolver
    min:                2,                               // Pre-crear 2 recursos
    max:                10,                              // Maximo 10 recursos
    healthcheckInterval: 30000,                          // Verificar cada 30 seg
);
```

| Parametro              | Proposito                                                      | Por Defecto |
|------------------------|----------------------------------------------------------------|-------------|
| `factory`              | Crea un nuevo recurso. **Requerido**                           | --          |
| `destructor`           | Destruye un recurso cuando se elimina del pool                 | `null`      |
| `healthcheck`          | Verificacion periodica: el recurso aun esta vivo?              | `null`      |
| `beforeAcquire`        | Verificar antes de entregar. `false` -- destruir y tomar el siguiente | `null` |
| `beforeRelease`        | Verificar antes de devolver. `false` -- destruir, no devolver  | `null`      |
| `min`                  | Cuantos recursos crear por adelantado (pre-calentamiento)      | `0`         |
| `max`                  | Maximo de recursos (libres + en uso)                           | `10`        |
| `healthcheckInterval`  | Intervalo de verificacion de salud en segundo plano (ms, 0 = deshabilitado) | `0` |

## Acquire y Release

### Acquire Bloqueante

```php
// Esperar hasta que un recurso este disponible (indefinidamente)
$resource = $pool->acquire();

// Esperar maximo 5 segundos
$resource = $pool->acquire(timeout: 5000);
```

Si el pool esta lleno (todos los recursos estan en uso y se alcanzo el `max`), la corrutina **se suspende**
y espera hasta que otra corrutina devuelva un recurso. Otras corrutinas continuan ejecutandose.

Si se agota el tiempo, se lanza una `PoolException`.

### tryAcquire No Bloqueante

```php
$resource = $pool->tryAcquire();

if ($resource === null) {
    echo "Todos los recursos estan ocupados, intentemos despues\n";
} else {
    // Usar el recurso
    $pool->release($resource);
}
```

`tryAcquire()` devuelve `null` inmediatamente si un recurso no esta disponible. La corrutina no se suspende.

### Release

```php
$resource = $pool->acquire();

try {
    doWork($resource);
} finally {
    // IMPORTANTE: siempre devuelve el recurso al pool!
    $pool->release($resource);
}
```

Si `beforeRelease` esta establecido y devuelve `false`, el recurso se considera danado
y es destruido en lugar de ser devuelto al pool.

## Estadisticas

```php
echo $pool->count();       // Total de recursos (libres + en uso)
echo $pool->idleCount();   // Libres, listos para ser entregados
echo $pool->activeCount(); // Actualmente siendo usados por corrutinas
```

## Cerrar el Pool

```php
$pool->close();
```

Al cerrar:
- Todas las corrutinas en espera reciben una `PoolException`
- Todos los recursos libres son destruidos via `destructor`
- Los recursos ocupados son destruidos en el posterior `release`

## Healthcheck: Verificacion en Segundo Plano

Si `healthcheckInterval` esta establecido, el pool verifica periodicamente los recursos libres.
Los recursos muertos son destruidos y reemplazados por nuevos (si la cantidad ha bajado por debajo de `min`).

```php
$pool = new Pool(
    factory: fn() => new DatabaseConnection($dsn),
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),   // Verificar: la conexion esta viva?
    min: 3,
    max: 10,
    healthcheckInterval: 10000,                 // Cada 10 segundos
);
```

El healthcheck funciona **solo** para recursos libres. Los recursos ocupados no se verifican.

## Circuit Breaker

El pool implementa el patron **Circuit Breaker** para gestionar la disponibilidad del servicio.

### Tres Estados

| Estado       | Comportamiento                                        |
|--------------|-------------------------------------------------------|
| `ACTIVE`     | Todo funciona, las solicitudes pasan                  |
| `INACTIVE`   | Servicio no disponible, `acquire()` lanza una excepcion |
| `RECOVERING` | Modo de prueba, solicitudes limitadas                 |

```php
use Async\CircuitBreakerState;

// Verificar estado
$state = $pool->getState(); // CircuitBreakerState::ACTIVE

// Control manual
$pool->deactivate();  // Cambiar a INACTIVE
$pool->recover();     // Cambiar a RECOVERING
$pool->activate();    // Cambiar a ACTIVE
```

### Gestion Automatica via Estrategia

```php
use Async\CircuitBreakerStrategy;

class MyStrategy implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $source): void {
        $this->failures = 0;
        $source->activate();
    }

    public function reportFailure(mixed $source, \Throwable $error): void {
        $this->failures++;
        if ($this->failures >= 5) {
            $source->deactivate();
        }
    }
}

$pool->setCircuitBreakerStrategy(new MyStrategy());
```

La estrategia se llama automaticamente:
- `reportSuccess()` -- al devolver exitosamente un recurso al pool
- `reportFailure()` -- cuando `beforeRelease` devuelve `false` (recurso danado)

## Ciclo de Vida del Recurso

![Ciclo de Vida del Recurso](/diagrams/es/components-pool/resource-lifecycle.svg)

## Ejemplo Real: Pool de Conexiones Redis

```php
use Async\Pool;
use function Async\spawn;
use function Async\await;

$redis = new Pool(
    factory: function() {
        $conn = new Redis();
        $conn->connect('127.0.0.1', 6379);
        return $conn;
    },
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),
    min: 2,
    max: 20,
    healthcheckInterval: 15000,
);

// 100 corrutinas leen concurrentemente de Redis a traves de 20 conexiones
$coroutines = [];
for ($i = 0; $i < 100; $i++) {
    $coroutines[] = spawn(function() use ($redis, $i) {
        $conn = $redis->acquire(timeout: 3000);
        try {
            return $conn->get("key:$i");
        } finally {
            $redis->release($conn);
        }
    });
}

$results = array_map(fn($c) => await($c), $coroutines);
$redis->close();
```

## PDO Pool

Para PDO, existe una integracion incorporada con `Async\Pool` que hace el pooling completamente transparente.
En lugar de `acquire`/`release` manual, el pool se gestiona automaticamente entre bastidores.

Mas informacion: [PDO Pool](/es/docs/components/pdo-pool.html)

## Que Sigue?

- [Arquitectura de Async\Pool](/es/architecture/pool.html) -- internos, diagramas, API en C
- [PDO Pool](/es/docs/components/pdo-pool.html) -- pool transparente para PDO
- [Corrutinas](/es/docs/components/coroutines.html) -- como funcionan las corrutinas
- [Canales](/es/docs/components/channels.html) -- intercambio de datos entre corrutinas
