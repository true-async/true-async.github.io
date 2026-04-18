---
layout: docs
lang: es
path_key: "/docs/reference/thread-channel/is-empty.html"
nav_active: docs
permalink: /es/docs/reference/thread-channel/is-empty.html
page_title: "ThreadChannel::isEmpty()"
description: "Comprobar si el buffer del canal de hilos no contiene actualmente ningún valor."
---

# ThreadChannel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isEmpty(): bool
```

Devuelve `true` si el buffer del canal no contiene valores.

Para un canal sin buffer (`capacity = 0`), esto siempre devuelve `true` porque los datos
se transfieren directamente entre hilos sin almacenamiento en buffer.

`isEmpty()` es seguro para hilos. El resultado refleja el estado en el momento de la llamada;
otro hilo puede colocar un valor en el canal inmediatamente después.

## Valores de retorno

`true` — el buffer está vacío (no hay valores disponibles).
`false` — el buffer contiene al menos un valor.

## Ejemplos

### Ejemplo #1 Comprobar si hay datos en el buffer antes de recibir

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);

echo $channel->isEmpty() ? "vacío" : "tiene datos"; // "vacío"

$channel->send(42);

echo $channel->isEmpty() ? "vacío" : "tiene datos"; // "tiene datos"

$channel->recv();

echo $channel->isEmpty() ? "vacío" : "tiene datos"; // "vacío"
```

### Ejemplo #2 Consumidor que vacía un canal cerrado

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(50);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 20; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // Esperar hasta que haya algo que leer, o el canal se cierre
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            if ($channel->isEmpty()) {
                // Buffer momentáneamente vacío — ceder y reintentar
                continue;
            }
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

- [ThreadChannel::isFull](/es/docs/reference/thread-channel/is-full.html) — Comprobar si el buffer está lleno
- [ThreadChannel::count](/es/docs/reference/thread-channel/count.html) — Número de valores en el buffer
- [ThreadChannel::recv](/es/docs/reference/thread-channel/recv.html) — Recibir un valor
- [Resumen del componente ThreadChannel](/es/docs/components/thread-channels.html)
