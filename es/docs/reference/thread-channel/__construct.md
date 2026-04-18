---
layout: docs
lang: es
path_key: "/docs/reference/thread-channel/__construct.html"
nav_active: docs
permalink: /es/docs/reference/thread-channel/__construct.html
page_title: "ThreadChannel::__construct()"
description: "Crear un nuevo canal seguro para hilos para intercambiar datos entre hilos del SO."
---

# ThreadChannel::__construct

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::__construct(int $capacity = 0)
```

Crea un nuevo canal seguro para hilos para pasar datos entre hilos del SO.

`ThreadChannel` es el equivalente entre hilos de [`Channel`](/es/docs/components/channels.html).
Mientras que `Channel` está diseñado para la comunicación entre corrutinas dentro de un solo hilo,
`ThreadChannel` permite que los datos fluyan de forma segura entre **hilos del SO separados** — por ejemplo, entre
el hilo principal y un trabajador iniciado con `spawn_thread()` o enviado a un `ThreadPool`.

El comportamiento del canal depende del parámetro `$capacity`:

- **`capacity = 0`** — canal sin buffer (síncrono). `send()` bloquea el hilo llamante
  hasta que otro hilo llama a `recv()`. Esto garantiza que el receptor esté listo antes de que el emisor
  continúe.
- **`capacity > 0`** — canal con buffer. `send()` no bloquea mientras haya espacio en el
  buffer. Cuando el buffer está lleno, el hilo llamante bloquea hasta que haya espacio disponible.

Todos los valores transferidos a través del canal son **copiados en profundidad** — se aplican las mismas reglas de
serialización que con `spawn_thread()`. Los objetos que no pueden ser serializados (por ejemplo, closures, recursos,
`stdClass` con referencias) causarán una `ThreadTransferException`.

## Parámetros

**capacity**
: La capacidad del buffer interno del canal.
  `0` — canal sin buffer (predeterminado), `send()` bloquea hasta que un receptor esté listo.
  Número positivo — tamaño del buffer; `send()` bloquea solo cuando el buffer está lleno.

## Ejemplos

### Ejemplo #1 Canal sin buffer entre hilos

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // capacity = 0

    $thread = spawn_thread(function() use ($channel) {
        $value = $channel->recv(); // bloquea hasta que el hilo principal envíe
        return "Trabajador recibió: $value";
    });

    $channel->send('hola'); // bloquea hasta que el trabajador llame a recv()
    echo await($thread), "\n";
});
```

### Ejemplo #2 Canal con buffer entre hilos

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10); // buffer para 10 elementos

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 10; $i++) {
            $channel->send($i); // no bloquea hasta que el buffer esté lleno
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        $results = [];
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                $results[] = $channel->recv();
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
        return $results;
    });

    await($producer);
    $results = await($consumer);
    echo implode(', ', $results), "\n";
});
```

## Véase también

- [ThreadChannel::send](/es/docs/reference/thread-channel/send.html) — Enviar un valor al canal
- [ThreadChannel::recv](/es/docs/reference/thread-channel/recv.html) — Recibir un valor del canal
- [ThreadChannel::capacity](/es/docs/reference/thread-channel/capacity.html) — Obtener la capacidad del canal
- [ThreadChannel::close](/es/docs/reference/thread-channel/close.html) — Cerrar el canal
- [Resumen del componente ThreadChannel](/es/docs/components/thread-channels.html)
