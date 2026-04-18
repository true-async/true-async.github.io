---
layout: docs
lang: es
path_key: "/docs/reference/thread-channel/is-full.html"
nav_active: docs
permalink: /es/docs/reference/thread-channel/is-full.html
page_title: "ThreadChannel::isFull()"
description: "Comprobar si el buffer del canal de hilos está lleno hasta su capacidad máxima."
---

# ThreadChannel::isFull

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isFull(): bool
```

Devuelve `true` si el buffer del canal ha alcanzado su capacidad máxima.

Para un canal sin buffer (`capacity = 0`), esto siempre devuelve `true` porque no hay
buffer — cada `send()` debe esperar a un `recv()` correspondiente.

`isFull()` es seguro para hilos. El resultado refleja el estado en el momento de la llamada;
otro hilo puede liberar un slot inmediatamente después.

## Valores de retorno

`true` — el buffer está en su capacidad máxima (o es un canal sin buffer).
`false` — el buffer tiene al menos un slot libre.

## Ejemplos

### Ejemplo #1 Comprobar si el buffer está lleno antes de enviar

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(3);

echo $channel->isFull() ? "lleno" : "tiene espacio"; // "tiene espacio"

$channel->send('x');
$channel->send('y');
$channel->send('z');

echo $channel->isFull() ? "lleno" : "tiene espacio"; // "lleno"
```

### Ejemplo #2 Monitoreo de contrapresión en un hilo productor

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        $items = range(1, 30);
        foreach ($items as $item) {
            if ($channel->isFull()) {
                // El buffer está actualmente lleno — send() bloqueará;
                // registrar la contrapresión para observabilidad
                error_log("Contrapresión en ThreadChannel: buffer lleno");
            }
            $channel->send($item); // bloquea hasta que haya espacio disponible
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                // Simular consumidor lento
                $val = $channel->recv();
                // procesar $val ...
            }
        } catch (\Async\ChannelClosedException) {
            echo "Hecho\n";
        }
    });

    await($producer);
    await($consumer);
});
```

## Véase también

- [ThreadChannel::isEmpty](/es/docs/reference/thread-channel/is-empty.html) — Comprobar si el buffer está vacío
- [ThreadChannel::capacity](/es/docs/reference/thread-channel/capacity.html) — Capacidad del canal
- [ThreadChannel::count](/es/docs/reference/thread-channel/count.html) — Número de valores en el buffer
- [ThreadChannel::send](/es/docs/reference/thread-channel/send.html) — Enviar un valor (bloquea cuando está lleno)
- [Resumen del componente ThreadChannel](/es/docs/components/thread-channels.html)
