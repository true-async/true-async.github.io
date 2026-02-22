---
layout: docs
lang: es
path_key: "/docs/components/pdo-pool.html"
nav_active: docs
permalink: /es/docs/components/pdo-pool.html
page_title: "PDO Pool"
description: "PDO Pool -- pool integrado de conexiones a base de datos para corrutinas: pooling transparente, transacciones, rollback automatico."
---

# PDO Pool: Pool de Conexiones a Base de Datos

## El Problema

Al trabajar con corrutinas, surge el problema de compartir descriptores de E/S.
Si el mismo socket es usado por dos corrutinas que simultaneamente escriben o leen
diferentes paquetes de el, los datos se mezclaran y el resultado sera impredecible.
Por lo tanto, no puedes simplemente usar el mismo objeto `PDO` en diferentes corrutinas!

Por otro lado, crear una conexion separada para cada corrutina una y otra vez es una estrategia muy costosa.
Anula las ventajas de la E/S concurrente. Por lo tanto, tipicamente se usan pools de conexiones
para interactuar con APIs externas, bases de datos y otros recursos.



```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');

// Diez corrutinas usan simultaneamente el mismo $pdo
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        // Otra corrutina ya llamo COMMIT en esta misma conexion!
        $pdo->commit(); // Caos
    });
}
```

Podrias crear una conexion separada en cada corrutina, pero entonces con mil corrutinas tendrias mil conexiones TCP.
MySQL permite 151 conexiones simultaneas por defecto. PostgreSQL -- 100.

## La Solucion: PDO Pool

**PDO Pool** -- un pool de conexiones a base de datos integrado en el nucleo de PHP.
Automaticamente da a cada corrutina su propia conexion de un conjunto preparado previamente
y la devuelve cuando la corrutina termina de trabajar.

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 2,
    PDO::ATTR_POOL_MAX => 10,
]);

// Diez corrutinas -- cada una obtiene su propia conexion
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        // El pool asigna automaticamente una conexion para esta corrutina
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        $pdo->commit();
        // La conexion se devuelve al pool
    });
}
```

Desde fuera, el codigo parece como si estuvieras trabajando con un `PDO` regular. El pool es completamente transparente.

## Como Habilitarlo

El pool se habilita via atributos del constructor de `PDO`:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED              => true,  // Habilitar pool
    PDO::ATTR_POOL_MIN                  => 0,     // Conexiones minimas (por defecto 0)
    PDO::ATTR_POOL_MAX                  => 10,    // Conexiones maximas (por defecto 10)
    PDO::ATTR_POOL_HEALTHCHECK_INTERVAL => 30,    // Intervalo de verificacion de salud (seg, 0 = deshabilitado)
]);
```

| Atributo                    | Significado                                                          | Por Defecto |
|-----------------------------|----------------------------------------------------------------------|-------------|
| `POOL_ENABLED`              | Habilitar el pool                                                    | `false`     |
| `POOL_MIN`                  | Numero minimo de conexiones que el pool mantiene abiertas            | `0`         |
| `POOL_MAX`                  | Numero maximo de conexiones simultaneas                              | `10`        |
| `POOL_HEALTHCHECK_INTERVAL` | Con que frecuencia verificar que una conexion esta viva (en segundos)| `0`         |

## Vinculacion de Conexiones a Corrutinas

Cada corrutina obtiene **su propia** conexion del pool. Todas las llamadas a `query()`, `exec()`, `prepare()`
dentro de una sola corrutina pasan por la misma conexion.

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX => 5,
]);

$coro1 = spawn(function() use ($pdo) {
    // Las tres consultas pasan por la conexion #1
    $pdo->query("SELECT 1");
    $pdo->query("SELECT 2");
    $pdo->query("SELECT 3");
    // Corrutina termino -- la conexion #1 vuelve al pool
});

$coro2 = spawn(function() use ($pdo) {
    // Todas las consultas pasan por la conexion #2
    $pdo->query("SELECT 4");
    // Corrutina termino -- la conexion #2 vuelve al pool
});
```

Si una corrutina ya no esta usando la conexion (sin transacciones activas ni sentencias),
el pool puede devolverla antes -- sin esperar a que la corrutina termine.

## Transacciones

Las transacciones funcionan igual que en PDO regular. Pero el pool garantiza
que mientras una transaccion esta activa, la conexion esta **fijada** a la corrutina y no volvera al pool.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();

    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

    $pdo->commit();
    // Solo despues del commit la conexion puede volver al pool
});
```

### Rollback Automatico

Si una corrutina termina sin llamar a `commit()`, el pool automaticamente revierte la transaccion
antes de devolver la conexion al pool. Esta es una proteccion contra la perdida accidental de datos.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM users WHERE id = 1");
    // Olvido commit()
    // Corrutina termino -- el pool llamara ROLLBACK automaticamente
});
```

## Ciclo de Vida de la Conexion

![Ciclo de vida de la conexion en el pool](/diagrams/es/components-pdo-pool/connection-lifecycle.svg)

Un diagrama tecnico detallado con llamadas internas esta en la [arquitectura de PDO Pool](/es/architecture/pdo-pool.html).

## Acceder al Objeto Pool

El metodo `getPool()` devuelve el objeto `Async\Pool` a traves del cual puedes obtener estadisticas:

```php
$pool = $pdo->getPool();

if ($pool !== null) {
    echo "Pool activo: " . get_class($pool) . "\n"; // Async\Pool
}
```

Si el pool no esta habilitado, `getPool()` devuelve `null`.

## Cuando Usar

**Usa PDO Pool cuando:**
- La aplicacion se ejecuta en modo asincrono con TrueAsync
- Multiples corrutinas acceden simultaneamente a la base de datos
- Necesitas limitar el numero de conexiones a la base de datos

**No es necesario cuando:**
- La aplicacion es sincrona (PHP clasico)
- Solo una corrutina trabaja con la base de datos
- Se usan conexiones persistentes (son incompatibles con el pool)

## Drivers Soportados

| Driver       | Soporte de Pool |
|--------------|-----------------|
| `pdo_mysql`  | Si              |
| `pdo_pgsql`  | Si              |
| `pdo_sqlite` | Si              |
| `pdo_odbc`   | No              |

## Manejo de Errores

Si el pool no puede crear una conexion (credenciales incorrectas, servidor no disponible),
la excepcion se propaga a la corrutina que solicito la conexion:

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'wrong_password', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 0,
]);

spawn(function() use ($pdo) {
    try {
        $pdo->query("SELECT 1");
    } catch (PDOException $e) {
        echo "Fallo al conectar: " . $e->getMessage() . "\n";
    }
});
```

Nota `POOL_MIN => 0`: si estableces el minimo mayor que cero, el pool intentara
crear conexiones por adelantado, y el error ocurrira al crear el objeto PDO.

## Ejemplo Real: Procesamiento Paralelo de Pedidos

```php
use function Async\spawn;
use function Async\await;

$pdo = new PDO('mysql:host=localhost;dbname=shop', 'app', 'secret', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED       => true,
    PDO::ATTR_POOL_MIN           => 2,
    PDO::ATTR_POOL_MAX           => 5,
]);

// Obtener una lista de pedidos a procesar
$orders = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

$coroutines = [];
foreach ($orders as $orderId) {
    $coroutines[] = spawn(function() use ($pdo, $orderId) {
        // Cada corrutina obtiene su propia conexion del pool
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? FOR UPDATE");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if ($order['status'] === 'pending') {
            $pdo->exec("UPDATE orders SET status = 'processing' WHERE id = $orderId");
            $pdo->exec("INSERT INTO order_log (order_id, action) VALUES ($orderId, 'started')");
        }

        $pdo->commit();
        return $orderId;
    });
}

// Esperar a que todas las corrutinas completen
foreach ($coroutines as $coro) {
    $processedId = await($coro);
    echo "Pedido #$processedId procesado\n";
}
```

Diez pedidos se procesan concurrentemente, pero a traves de un maximo de cinco conexiones a la base de datos.
Cada transaccion esta aislada. Las conexiones se reutilizan entre corrutinas.

## Que Sigue?

- [Demo Interactiva de PDO Pool](/es/interactive/pdo-pool-demo.html) -- una demostracion visual del funcionamiento del pool de conexiones
- [Arquitectura de PDO Pool](/es/architecture/pdo-pool.html) -- internos del pool, diagramas, ciclo de vida de conexiones
- [Corrutinas](/es/docs/components/coroutines.html) -- como funcionan las corrutinas
- [Scope](/es/docs/components/scope.html) -- gestion de grupos de corrutinas
- [spawn()](/es/docs/reference/spawn.html) -- lanzamiento de corrutinas
- [await()](/es/docs/reference/await.html) -- espera de resultados
