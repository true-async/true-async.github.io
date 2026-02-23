---
layout: docs
lang: es
path_key: "/docs/reference/channel/send.html"
nav_active: docs
permalink: /es/docs/reference/channel/send.html
page_title: "Channel::send"
description: "Enviar un valor al canal (operación bloqueante)."
---

# Channel::send

(PHP 8.6+, True Async 1.0)

```php
public Channel::send(mixed $value, ?Completable $cancellationToken = null): void
```

Envía un valor al canal. Esta es una operación bloqueante — la corrutina actual se suspende
si el canal no puede aceptar el valor inmediatamente.

Para un **canal rendezvous** (`capacity = 0`), el emisor espera hasta que otra corrutina llame a `recv()`.
Para un **canal con búfer**, el emisor espera solo cuando el búfer está lleno.

## Parámetros

**value**
: El valor a enviar. Puede ser de cualquier tipo.

**cancellationToken**
: Token de cancelación (`Completable`) que permite interrumpir la espera según una condición arbitraria.
  `null` — espera sin límite (por defecto).
  Cuando el token se completa, la operación se interrumpe y se lanza una `CancelledException`.
  Para limitar el tiempo de espera se puede utilizar `Async\timeout()`.

## Errores

- Lanza `Async\ChannelException` si el canal está cerrado.
- Lanza `Async\CancelledException` si el token de cancelación fue completado.

## Ejemplos

### Ejemplo #1 Envío de valores a un canal

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('first');  // se coloca en el búfer
    $channel->send('second'); // espera a que se libere espacio
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "first"
    echo $channel->recv() . "\n"; // "second"
});
```

### Ejemplo #2 Envío con tiempo de espera

```php
<?php

use Async\Channel;

$channel = new Channel(0); // rendezvous

spawn(function() use ($channel) {
    try {
        $channel->send('data', Async\timeout(1000));
    } catch (\Async\CancelledException $e) {
        echo "Tiempo agotado: nadie aceptó el valor en 1 segundo\n";
    }
});
```

### Ejemplo #3 Envío con token de cancelación personalizado

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel(0);
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $channel->send('data', $cancel);
    } catch (\Async\CancelledException $e) {
        echo "Envío cancelado\n";
    }
});

// Cancelar la operación desde otra corrutina
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## Ver también

- [Channel::sendAsync](/es/docs/reference/channel/send-async.html) — Envío no bloqueante
- [Channel::recv](/es/docs/reference/channel/recv.html) — Recibir un valor del canal
- [Channel::isFull](/es/docs/reference/channel/is-full.html) — Verificar si el búfer está lleno
- [Channel::close](/es/docs/reference/channel/close.html) — Cerrar el canal
