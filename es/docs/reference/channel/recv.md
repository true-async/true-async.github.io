---
layout: docs
lang: es
path_key: "/docs/reference/channel/recv.html"
nav_active: docs
permalink: /es/docs/reference/channel/recv.html
page_title: "Channel::recv"
description: "Recibir un valor del canal (operación bloqueante)."
---

# Channel::recv

(PHP 8.6+, True Async 1.0)

```php
public Channel::recv(?Completable $cancellationToken = null): mixed
```

Recibe el siguiente valor del canal. Esta es una operación bloqueante — la corrutina
actual se suspende si no hay valores disponibles en el canal.

Si el canal está cerrado y el búfer está vacío, se lanza una `ChannelException`.
Si el canal está cerrado pero quedan valores en el búfer, se devolverán.

## Parámetros

**cancellationToken**
: Token de cancelación (`Completable`) que permite interrumpir la espera según una condición arbitraria.
  `null` — espera sin límite (por defecto).
  Cuando el token se completa, la operación se interrumpe y se lanza una `CancelledException`.
  Para limitar el tiempo de espera se puede utilizar `Async\timeout()`.

## Valores de retorno

El siguiente valor del canal (`mixed`).

## Errores

- Lanza `Async\ChannelException` si el canal está cerrado y el búfer está vacío.
- Lanza `Async\CancelledException` si el token de cancelación fue completado.

## Ejemplos

### Ejemplo #1 Recepción de valores de un canal

```php
<?php

use Async\Channel;

$channel = new Channel(5);

spawn(function() use ($channel) {
    for ($i = 1; $i <= 5; $i++) {
        $channel->send($i);
    }
    $channel->close();
});

spawn(function() use ($channel) {
    try {
        while (true) {
            $value = $channel->recv();
            echo "Recibido: $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "Canal cerrado y vacío\n";
    }
});
```

### Ejemplo #2 Recepción con tiempo de espera

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $value = $channel->recv(Async\timeout(2000));
        echo "Recibido: $value\n";
    } catch (\Async\CancelledException) {
        echo "No se recibieron datos en 2 segundos\n";
    }
});
```

### Ejemplo #3 Recepción con token de cancelación personalizado

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel();
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $value = $channel->recv($cancel);
        echo "Recibido: $value\n";
    } catch (\Async\CancelledException) {
        echo "Recepción cancelada\n";
    }
});

// Cancelar desde otra corrutina
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## Ver también

- [Channel::recvAsync](/es/docs/reference/channel/recv-async.html) — Recepción no bloqueante
- [Channel::send](/es/docs/reference/channel/send.html) — Enviar un valor al canal
- [Channel::isEmpty](/es/docs/reference/channel/is-empty.html) — Verificar si el búfer está vacío
- [Channel::getIterator](/es/docs/reference/channel/get-iterator.html) — Iterar sobre el canal usando foreach
