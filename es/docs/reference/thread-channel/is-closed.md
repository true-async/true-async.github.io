---
layout: docs
lang: es
path_key: "/docs/reference/thread-channel/is-closed.html"
nav_active: docs
permalink: /es/docs/reference/thread-channel/is-closed.html
page_title: "ThreadChannel::isClosed()"
description: "Comprobar si el canal de hilos ha sido cerrado."
---

# ThreadChannel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isClosed(): bool
```

Devuelve `true` si el canal ha sido cerrado mediante `close()`.

Un canal cerrado no acepta nuevos valores a través de `send()`, pero `recv()` continúa
devolviendo los valores restantes en el buffer hasta que se vacíe.

`isClosed()` es seguro para hilos y puede ser llamado desde cualquier hilo sin sincronización.

## Valores de retorno

`true` — el canal está cerrado.
`false` — el canal está abierto.

## Ejemplos

### Ejemplo #1 Comprobar el estado del canal desde el hilo principal

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    echo $channel->isClosed() ? "cerrado" : "abierto"; // "abierto"

    $channel->send('datos');
    $channel->close();

    echo $channel->isClosed() ? "cerrado" : "abierto"; // "cerrado"

    // Los valores almacenados antes del cierre aún son legibles
    echo $channel->recv(), "\n"; // "datos"
});
```

### Ejemplo #2 Bucle consumidor protegido por isClosed()

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 10; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // Seguir leyendo hasta que esté cerrado Y el buffer esté vacío
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                echo $channel->recv(), "\n";
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
    });

    await($producer);
    await($consumer);
});
```

## Véase también

- [ThreadChannel::close](/es/docs/reference/thread-channel/close.html) — Cerrar el canal
- [ThreadChannel::isEmpty](/es/docs/reference/thread-channel/is-empty.html) — Comprobar si el buffer está vacío
- [Resumen del componente ThreadChannel](/es/docs/components/thread-channels.html)
