---
layout: docs
lang: es
path_key: "/docs/reference/thread-channel/send.html"
nav_active: docs
permalink: /es/docs/reference/thread-channel/send.html
page_title: "ThreadChannel::send()"
description: "Enviar un valor al canal de hilos, bloqueando el hilo llamante si el canal no puede aceptarlo de inmediato."
---

# ThreadChannel::send

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::send(mixed $value): void
```

Envía un valor al canal. Esta es una operación **bloqueante** — el hilo llamante se bloquea
si el canal no puede aceptar el valor de inmediato.

- Para un **canal sin buffer** (`capacity = 0`), el hilo bloquea hasta que otro hilo llame a `recv()`.
- Para un **canal con buffer**, el hilo bloquea solo cuando el buffer está lleno, y se desbloquea tan pronto
  como un receptor libera un slot.

A diferencia de `Channel::send()` (que suspende una corrutina), `ThreadChannel::send()` bloquea
el hilo del SO completo. Diseñe su arquitectura en consecuencia — por ejemplo, mantenga el hilo emisor
libre para bloquear, o use un canal con buffer para reducir la contención.

El valor es **copiado en profundidad** antes de ser colocado en el canal. Los closures, recursos y
objetos no serializables causarán una `ThreadTransferException`.

## Parámetros

**value**
: El valor a enviar. Puede ser de cualquier tipo serializable (escalar, array, u objeto serializable).

## Errores

- Lanza `Async\ChannelClosedException` si el canal ya está cerrado.
- Lanza `Async\ThreadTransferException` si el valor no puede ser serializado para la transferencia entre hilos.

## Ejemplos

### Ejemplo #1 Enviar resultados desde un hilo de trabajo

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    $worker = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 5; $i++) {
            $result = $i * $i;
            $channel->send($result);
        }
        $channel->close();
    });

    await($worker);

    while (!$channel->isClosed() || !$channel->isEmpty()) {
        try {
            echo $channel->recv(), "\n";
        } catch (\Async\ChannelClosedException) {
            break;
        }
    }
});
```

### Ejemplo #2 Apretón de manos sin buffer entre hilos

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $requests  = new ThreadChannel(); // sin buffer
    $responses = new ThreadChannel();

    $server = spawn_thread(function() use ($requests, $responses) {
        $req = $requests->recv();             // bloquea hasta que llegue la solicitud
        $responses->send(strtoupper($req));   // bloquea hasta que se acepte la respuesta
    });

    $requests->send('hola');                  // bloquea hasta que el servidor llame a recv()
    $reply = $responses->recv();              // bloquea hasta que el servidor llame a send()
    await($server);

    echo $reply, "\n"; // "HOLA"
});
```

### Ejemplo #3 Manejar un canal cerrado

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(1);
    $channel->close();

    $thread = spawn_thread(function() use ($channel) {
        try {
            $channel->send('demasiado tarde');
        } catch (\Async\ChannelClosedException $e) {
            return "Envío fallido: " . $e->getMessage();
        }
    });

    echo await($thread), "\n";
});
```

## Véase también

- [ThreadChannel::recv](/es/docs/reference/thread-channel/recv.html) — Recibir un valor del canal
- [ThreadChannel::isFull](/es/docs/reference/thread-channel/is-full.html) — Comprobar si el buffer está lleno
- [ThreadChannel::close](/es/docs/reference/thread-channel/close.html) — Cerrar el canal
- [Resumen del componente ThreadChannel](/es/docs/components/thread-channels.html)
