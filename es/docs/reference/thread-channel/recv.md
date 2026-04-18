---
layout: docs
lang: es
path_key: "/docs/reference/thread-channel/recv.html"
nav_active: docs
permalink: /es/docs/reference/thread-channel/recv.html
page_title: "ThreadChannel::recv()"
description: "Recibir el siguiente valor del canal de hilos, bloqueando el hilo llamante si no hay ningún valor disponible."
---

# ThreadChannel::recv

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::recv(): mixed
```

Recibe el siguiente valor del canal. Esta es una operación **bloqueante** — el hilo llamante
se bloquea si no hay valores disponibles actualmente en el canal.

- Para un **canal con buffer**, `recv()` devuelve inmediatamente si el buffer contiene al menos un valor.
  Si el buffer está vacío, el hilo bloquea hasta que un emisor coloque un valor.
- Para un **canal sin buffer** (`capacity = 0`), `recv()` bloquea hasta que otro hilo llame a `send()`.

Si el canal está cerrado y el buffer todavía contiene valores, esos valores se devuelven normalmente.
Una vez que el buffer se ha vaciado y el canal está cerrado, `recv()` lanza `ChannelClosedException`.

El valor recibido es una **copia en profundidad** del original — las modificaciones al valor devuelto no
afectan la copia del emisor.

## Valores de retorno

El siguiente valor del canal (`mixed`).

## Errores

- Lanza `Async\ChannelClosedException` si el canal está cerrado y el buffer está vacío.

## Ejemplos

### Ejemplo #1 Recibir valores producidos por un hilo de trabajo

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
            $channel->send($i * 10);
        }
        $channel->close();
    });

    // Recibir todos los valores — bloquea cuando el buffer está vacío
    try {
        while (true) {
            echo $channel->recv(), "\n";
        }
    } catch (\Async\ChannelClosedException) {
        echo "Todos los valores recibidos\n";
    }

    await($worker);
});
```

### Ejemplo #2 Hilo consumidor vaciando un canal compartido

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    // Productor: llena el canal desde un hilo
    $producer = spawn_thread(function() use ($channel) {
        foreach (range('a', 'e') as $letter) {
            $channel->send($letter);
        }
        $channel->close();
    });

    // Consumidor: vacía el canal desde otro hilo
    $consumer = spawn_thread(function() use ($channel) {
        $collected = [];
        try {
            while (true) {
                $collected[] = $channel->recv();
            }
        } catch (\Async\ChannelClosedException) {
            // buffer vaciado y canal cerrado
        }
        return $collected;
    });

    await($producer);
    $result = await($consumer);
    echo implode(', ', $result), "\n"; // "a, b, c, d, e"
});
```

### Ejemplo #3 Recibir desde un canal sin buffer

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // sin buffer

    $sender = spawn_thread(function() use ($channel) {
        // Bloquea aquí hasta que el hilo principal llame a recv()
        $channel->send(['task' => 'compress', 'file' => '/tmp/data.bin']);
    });

    // La corrutina (hilo) principal llama a recv() — desbloquea al emisor
    $task = $channel->recv();
    echo "Tarea recibida: {$task['task']} en {$task['file']}\n";

    await($sender);
});
```

## Véase también

- [ThreadChannel::send](/es/docs/reference/thread-channel/send.html) — Enviar un valor al canal
- [ThreadChannel::isEmpty](/es/docs/reference/thread-channel/is-empty.html) — Comprobar si el buffer está vacío
- [ThreadChannel::close](/es/docs/reference/thread-channel/close.html) — Cerrar el canal
- [Resumen del componente ThreadChannel](/es/docs/components/thread-channels.html)
