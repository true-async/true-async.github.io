---
layout: tutorial
lang: es
path_key: "/tutors/13-pool.html"
nav_active: docs
permalink: /es/tutors/13-pool.html
page_title: "Pool"
description: "Async\\Pool: un pool de recursos universal con comprobaciones de salud y un circuit breaker."
---

# Pool

En el capítulo de PDO Pool esbozamos un pool basado en canales en seis líneas e inmediatamente admitimos
que era ingenuo para la vida real: tienes que acordarte de devolver el recurso pase lo que pase,
reconocer las conexiones rotas, y reemplazar las muertas. Para PDO, el núcleo hacía todo
eso por nosotros. Pero `checkAddress` habla con `GeoDirectory` por HTTP, y abrir una conexión fresca
a él en cada petición también sería un derroche. Y mañana habrá Redis para
caché y SMTP para correo.

Seguro que no vamos a construir a mano un pool de canales para cada recurso. Correcto, hay una
primitiva lista para esto, la misma que trabaja bajo el capó de PDO Pool: `Async\Pool`.

## Factory y destructor

El pool no sabe qué tipo de recurso está reteniendo. Le dices dos cosas: cómo crear
un recurso y cómo destruir uno:

```php
use Async\Pool;

$geo = new Pool(
    factory:    fn() => new GeoConnection('geodirectory.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);
```

`min: 2` significa que se abren dos conexiones por adelantado, para que las primeras corrutinas no tengan que esperar
a través de un handshake. `max: 10` significa que el pool nunca creará más de diez conexiones, sin
importar cuántas corrutinas pidan una. Es el familiar límite de concurrencia, salvo que ahora está
atado al recurso mismo en lugar de a un número de workers.

Después viene el ciclo que ya hemos construido a mano con un canal:

```php
$conn = $geo->acquire();

try {
    $verdict = $conn->request("/check?address=$address");
} finally {
    $geo->release($conn);
}
```

`acquire` entrega un recurso libre. Si no hay ninguno libre y no se ha alcanzado el límite, la
factory crea uno nuevo. Si se ha alcanzado el límite, la corrutina se duerme hasta que
alguien más llame a `release`: la misma mecánica que `recv` sobre un canal vacío. Fíjate en el
`finally`: el recurso se devuelve pase lo que pase, incluyendo una excepción o una
cancelación. Ese es exactamente el punto donde nuestro pool hecho a mano solía tropezar.

También puedes esperar con un límite, de la forma habitual:

```php
$conn = $geo->acquire(timeout: 3000); // TimeoutException si no llega en 3 segundos
```

## Los recursos mueren

Una conexión que ha estado sentada en el pool durante media hora puede haber muerto en silencio: el
servidor la cerró tras un timeout, la red parpadeó. Ya vimos en el capítulo de PDO a qué
lleva eso: la siguiente corrutina recibe un error misterioso de la nada. El pool combate esto
en tres frentes:

```php
$geo = new Pool(
    factory:             fn() => new GeoConnection('geodirectory.example.com'),
    destructor:          fn($conn) => $conn->close(),
    healthcheck:         fn($conn) => $conn->ping(),
    beforeAcquire:       fn($conn) => $conn->isAlive(),
    beforeRelease:       fn($conn) => !$conn->isBroken(),
    min: 2,
    max: 10,
    healthcheckInterval: 30000,
);
```

- **`healthcheck`** — cada treinta segundos el pool recorre por su cuenta sus recursos libres y
  les toma el pulso. Los muertos se destruyen y se reemplazan por nuevos.
- **`beforeAcquire`** — una comprobación final antes de entregar un recurso. Si falla, el recurso
  se destruye y la corrutina recibe el siguiente.
- **`beforeRelease`** — una comprobación al devolver. Una corrutina puede haber roto la conexión a mitad
  de una petición; un recurso así no vuelve al pool.

Las corrutinas no saben nada de este trabajo entre bastidores: piden un recurso y reciben uno
que funciona. La gestión de la salud se expresa de forma declarativa, en el constructor, en lugar de
estar untada por el código como un montón de `if`s.

## Circuit breaker

Ahora imagina que `GeoDirectory` se cae por completo. Las diez conexiones están muertas, cada corrutina
espera diligentemente hasta que expira un timeout, crea una conexión nueva, vuelve a esperar. La aplicación gasta toda
su energía bombardeando un servicio que ya está caído, y al hacerlo le impide levantarse
de nuevo.

La ingeniería eléctrica inventó un remedio para exactamente esto: un disyuntor que abre el circuito
hasta que se aclara la avería. El patrón lleva su nombre, circuit breaker, y está integrado en
el pool. El pool tiene tres estados: `ACTIVE`, todo funciona; `INACTIVE`, el servicio ha
sido declarado no disponible y `acquire` falla de inmediato, sin ningún timeout; `RECOVERING`, una
comprobación cautelosa de si el servicio ha vuelto a la vida.

Puedes cambiar de estado a mano, o delegar la decisión a una estrategia:

```php
use Async\CircuitBreakerStrategy;

final class FiveStrikes implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $pool): void
    {
        $this->failures = 0;
        $pool->activate();
    }

    public function reportFailure(mixed $pool, Throwable $error): void
    {
        if (++$this->failures >= 5) {
            $pool->deactivate();
        }
    }

    public function shouldRecover(): bool
    {
        return true; // intenta la recuperación a la primera oportunidad
    }
}

$geo->setCircuitBreakerStrategy(new FiveStrikes());
```

El pool mismo reporta cada éxito y cada fallo de un recurso a la estrategia, y pregunta
a través de `shouldRecover` si es hora de comprobar con cautela si el servicio ha vuelto. Cinco
fallos seguidos, y el circuito se abre: las corrutinas reciben un fallo rápido en lugar de una lenta tortura
de timeouts, y `GeoDirectory` deja de recibir golpes inútiles y puede recuperarse en paz.

Mirando atrás, `Pool` hace exactamente lo que construimos a mano a partir de un canal en el capítulo nueve, más
todo lo que de verdad no quieres construir a mano: devolución garantizada, comprobaciones de salud, un circuit
breaker. `PDO Pool` es la misma primitiva, solo que escondida tras la fachada de `PDO`. Y para
todo lo demás, clientes HTTP, Redis, sockets, y objetos pesados en general, está
`Async\Pool`.

A estas alturas nuestro arsenal luce impresionante: corrutinas, canales, scopes, grupos de tareas, pools.
Pero todo esto corre en un solo hilo del sistema operativo y comparte un solo núcleo de CPU. Mientras las
tareas esperen en E/S, eso no es problema de nadie. Pero ¿qué pasa si el trabajo no está limitado por la espera
sino por el cálculo? Ahí toda la imagen cambia, y de eso trata el siguiente capítulo.
