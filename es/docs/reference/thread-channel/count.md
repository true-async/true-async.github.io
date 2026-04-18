---
layout: docs
lang: es
path_key: "/docs/reference/thread-channel/count.html"
nav_active: docs
permalink: /es/docs/reference/thread-channel/count.html
page_title: "ThreadChannel::count()"
description: "Obtener el número de valores actualmente almacenados en el buffer del canal de hilos."
---

# ThreadChannel::count

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::count(): int
```

Devuelve el número actual de valores almacenados en el buffer del canal.

`ThreadChannel` implementa la interfaz `Countable`, por lo que también puede usar `count($channel)`.

Para un canal sin buffer (`capacity = 0`), esto siempre devuelve `0` — los valores se transfieren
directamente entre hilos sin almacenamiento en buffer.

El conteo se lee atómicamente y es preciso en el momento de la llamada, incluso cuando otros hilos
están enviando o recibiendo de forma concurrente.

## Valores de retorno

El número de valores actualmente en el buffer (`int`).

## Ejemplos

### Ejemplo #1 Monitorear el nivel de llenado del buffer

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(10);

$channel->send('a');
$channel->send('b');
$channel->send('c');

echo $channel->count();   // 3
echo count($channel);     // 3 — interfaz Countable

$channel->recv();
echo $channel->count();   // 2
```

### Ejemplo #2 Registrar la carga del canal desde un hilo monitor

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $tasks = new ThreadChannel(100);

    // Hilo monitor: registra periódicamente el uso del buffer
    $monitor = spawn_thread(function() use ($tasks) {
        while (!$tasks->isClosed()) {
            $pct = $tasks->capacity() > 0
                ? round($tasks->count() / $tasks->capacity() * 100)
                : 0;
            echo "Buffer: {$tasks->count()}/{$tasks->capacity()} ({$pct}%)\n";
            // En un hilo real usaría sleep() o un semáforo aquí
        }
    });

    // ... hilos productor y consumidor ...

    $tasks->close();
    await($monitor);
});
```

## Véase también

- [ThreadChannel::capacity](/es/docs/reference/thread-channel/capacity.html) — Capacidad del canal
- [ThreadChannel::isEmpty](/es/docs/reference/thread-channel/is-empty.html) — Comprobar si el buffer está vacío
- [ThreadChannel::isFull](/es/docs/reference/thread-channel/is-full.html) — Comprobar si el buffer está lleno
- [Resumen del componente ThreadChannel](/es/docs/components/thread-channels.html)
