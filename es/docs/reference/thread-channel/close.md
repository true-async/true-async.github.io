---
layout: docs
lang: es
path_key: "/docs/reference/thread-channel/close.html"
nav_active: docs
permalink: /es/docs/reference/thread-channel/close.html
page_title: "ThreadChannel::close()"
description: "Cerrar el canal de hilos, señalando que no se enviarán más valores."
---

# ThreadChannel::close

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::close(): void
```

Cierra el canal. Después del cierre:

- Llamar a `send()` lanza una `ChannelClosedException`.
- Llamar a `recv()` continúa devolviendo los valores ya presentes en el buffer hasta que se vacíe.
  Una vez que el buffer esté vacío, `recv()` lanza una `ChannelClosedException`.
- Los hilos actualmente bloqueados en `send()` o `recv()` son desbloqueados y reciben una
  `ChannelClosedException`.

Llamar a `close()` en un canal ya cerrado no hace nada — no lanza ninguna excepción.

`close()` es la forma estándar de señalar "fin de flujo" al lado consumidor. El productor
cierra el canal después de enviar todos los elementos; el consumidor lee hasta que captura
`ChannelClosedException`.

`close()` en sí mismo es seguro para hilos y puede ser llamado desde cualquier hilo.

## Ejemplos

### Ejemplo #1 El productor cierra tras enviar todos los elementos

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        foreach (['alpha', 'beta', 'gamma'] as $item) {
            $channel->send($item);
        }
        $channel->close(); // señala: no hay más datos
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                echo $channel->recv(), "\n";
            }
        } catch (\Async\ChannelClosedException) {
            echo "Flujo terminado\n";
        }
    });

    await($producer);
    await($consumer);
});
```

### Ejemplo #2 Close desbloquea a un receptor en espera

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // sin buffer

    // Este hilo se bloqueará en recv() esperando un valor
    $waiter = spawn_thread(function() use ($channel) {
        try {
            $channel->recv(); // bloquea
        } catch (\Async\ChannelClosedException) {
            return "Desbloqueado por close()";
        }
    });

    // Cerrar el canal desde otro hilo — desbloquea al que espera
    spawn_thread(function() use ($channel) {
        $channel->close();
    });

    echo await($waiter), "\n";
});
```

### Ejemplo #3 Llamar a close() dos veces es seguro

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);
$channel->close();
$channel->close(); // no hace nada, no lanza excepción

echo $channel->isClosed() ? "cerrado" : "abierto"; // "cerrado"
```

## Véase también

- [ThreadChannel::isClosed](/es/docs/reference/thread-channel/is-closed.html) — Comprobar si el canal está cerrado
- [ThreadChannel::recv](/es/docs/reference/thread-channel/recv.html) — Recibir valores restantes después del cierre
- [Resumen del componente ThreadChannel](/es/docs/components/thread-channels.html)
