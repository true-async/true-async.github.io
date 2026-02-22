---
layout: docs
lang: es
path_key: "/docs/reference/signal.html"
nav_active: docs
permalink: /es/docs/reference/signal.html
page_title: "signal()"
description: "signal() — esperar una señal del SO con soporte de cancelación mediante Completable."
---

# signal

(PHP 8.6+, True Async 1.0)

`signal()` — Espera una señal del SO. Devuelve un `Future` que se resuelve con un valor `Signal` cuando se recibe la señal.

## Descripción

```php
signal(Async\Signal $signal, ?Async\Completable $cancellation = null): Async\Future
```

Crea un manejador de señal del SO de un solo uso. Cada llamada a `signal()` crea un nuevo `Future` que se resuelve al recibir la primera señal especificada.
Si se proporciona el parámetro `$cancellation`, el `Future` será rechazado cuando la cancelación se active (p. ej., al expirar el timeout).

Múltiples llamadas a `signal()` con la misma señal funcionan independientemente — cada una recibirá una notificación.

## Parámetros

**`signal`**
Un valor del enum `Async\Signal` que especifica la señal esperada. Por ejemplo: `Signal::SIGINT`, `Signal::SIGTERM`, `Signal::SIGUSR1`.

**`cancellation`**
Un objeto opcional que implementa `Async\Completable` (p. ej., un resultado de llamar a `timeout()`). Si el objeto de cancelación se activa antes de que llegue la señal, el `Future` será rechazado con la excepción correspondiente (p. ej., `Async\TimeoutException`).

Si el objeto de cancelación ya se ha completado al momento de la llamada, `signal()` devuelve inmediatamente un `Future` rechazado.

## Valores de retorno

Devuelve `Async\Future<Async\Signal>`. Cuando se recibe la señal, el `Future` se resuelve con el valor del enum `Async\Signal` correspondiente a la señal recibida.

## Errores/Excepciones

- `Async\TimeoutException` — si el timeout se activó antes de recibir la señal.
- `Async\AsyncCancellation` — si la cancelación ocurrió por otra razón.

## Ejemplos

### Ejemplo #1 Esperar una señal con timeout

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;

try {
    $result = await(signal(Signal::SIGINT, timeout(5000)));
    echo "Señal recibida: " . $result->name . "\n";
} catch (Async\TimeoutException $e) {
    echo "Señal no recibida en 5 segundos\n";
}
?>
```

### Ejemplo #2 Recibir una señal desde otra corrutina

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;

$future = signal(Signal::SIGUSR1);

spawn(function() {
    posix_kill(getmypid(), SIGUSR1);
});

$result = await($future);
echo "Señal recibida: " . $result->name . "\n";
var_dump($result === Signal::SIGUSR1); // bool(true)
?>
```

### Ejemplo #3 Apagado ordenado con SIGTERM

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;
use function Async\graceful_shutdown;

spawn(function() {
    await(signal(Signal::SIGTERM));
    echo "SIGTERM recibido, apagando...\n";
    graceful_shutdown();
});
?>
```

### Ejemplo #4 Timeout ya expirado

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;
use function Async\delay;

$t = timeout(1);
delay(50); // El timeout ya expiró

$future = signal(Signal::SIGINT, $t);

try {
    await($future);
} catch (\Throwable $e) {
    echo get_class($e) . "\n"; // Async\TimeoutException
}
?>
```

## Notas

> **Nota:** Cada llamada a `signal()` crea un manejador **de un solo uso**. Para esperar la misma señal nuevamente, llame a `signal()` de nuevo.

> **Nota:** `Signal::SIGINT` y `Signal::SIGBREAK` funcionan en todas las plataformas, incluyendo Windows. Las señales `SIGUSR1`, `SIGUSR2` y otras señales POSIX solo están disponibles en sistemas Unix.

> **Nota:** `Signal::SIGKILL` y `Signal::SIGSEGV` no pueden ser capturadas — esta es una limitación del sistema operativo.

## Signal

El enum `Async\Signal` define las señales del SO disponibles:

| Valor | Señal | Descripción |
|-------|-------|-------------|
| `Signal::SIGHUP` | 1 | Conexión de terminal perdida |
| `Signal::SIGINT` | 2 | Interrupción (Ctrl+C) |
| `Signal::SIGQUIT` | 3 | Salir con volcado de núcleo |
| `Signal::SIGILL` | 4 | Instrucción ilegal |
| `Signal::SIGABRT` | 6 | Terminación anormal |
| `Signal::SIGFPE` | 8 | Error de aritmética de punto flotante |
| `Signal::SIGKILL` | 9 | Terminación incondicional |
| `Signal::SIGUSR1` | 10 | Señal definida por el usuario 1 |
| `Signal::SIGSEGV` | 11 | Violación de acceso a memoria |
| `Signal::SIGUSR2` | 12 | Señal definida por el usuario 2 |
| `Signal::SIGTERM` | 15 | Solicitud de terminación |
| `Signal::SIGBREAK` | 21 | Break (Ctrl+Break, Windows) |
| `Signal::SIGABRT2` | 22 | Terminación anormal (alternativa) |
| `Signal::SIGWINCH` | 28 | Cambio de tamaño de ventana de terminal |

## Ver también

- [timeout()](/es/docs/reference/timeout.html) — crear un timeout para limitar la espera
- [await()](/es/docs/reference/await.html) — esperar el resultado de un Future
- [graceful_shutdown()](/es/docs/reference/graceful-shutdown.html) — apagado ordenado del planificador
- [Cancelación](/es/docs/components/cancellation.html) — mecanismo de cancelación
