---
layout: docs
lang: es
path_key: "/docs/reference/channel/close.html"
nav_active: docs
permalink: /es/docs/reference/channel/close.html
page_title: "Channel::close"
description: "Cerrar el canal para el envío de más datos."
---

# Channel::close

(PHP 8.6+, True Async 1.0)

```php
public Channel::close(): void
```

Cierra el canal. Después de cerrar:

- Llamar a `send()` lanza una `ChannelException`.
- Llamar a `recv()` continúa devolviendo valores del búfer hasta que esté vacío.
  Después de eso, `recv()` lanza una `ChannelException`.
- Todas las corrutinas esperando en `send()` o `recv()` reciben una `ChannelException`.
- La iteración mediante `foreach` termina cuando el búfer está vacío.

Llamar a `close()` nuevamente en un canal ya cerrado no causa errores.

## Ejemplos

### Ejemplo #1 Cerrar un canal después de enviar datos

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    for ($i = 0; $i < 5; $i++) {
        $channel->send($i);
    }
    $channel->close(); // señal al receptor de que no vendrán más datos
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Recibido: $value\n";
    }
    // foreach termina después de cerrar y vaciar el búfer
    echo "Canal agotado\n";
});
```

### Ejemplo #2 Manejo del cierre por corrutinas en espera

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $channel->send('data'); // esperando un receptor
    } catch (\Async\ChannelException $e) {
        echo "Canal cerrado: {$e->getMessage()}\n";
    }
});

spawn(function() use ($channel) {
    delay(100); // breve retardo
    $channel->close(); // desbloquea al emisor con una excepción
});
```

## Ver también

- [Channel::isClosed](/es/docs/reference/channel/is-closed.html) — Verificar si el canal está cerrado
- [Channel::recv](/es/docs/reference/channel/recv.html) — Recibir un valor (vacía el búfer)
- [Channel::getIterator](/es/docs/reference/channel/get-iterator.html) — Iterar hasta el cierre
