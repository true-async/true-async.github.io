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
public Channel::recv(int $timeoutMs = 0): mixed
```

Recibe el siguiente valor del canal. Esta es una operación bloqueante — la corrutina
actual se suspende si no hay valores disponibles en el canal.

Si el canal está cerrado y el búfer está vacío, se lanza una `ChannelException`.
Si el canal está cerrado pero quedan valores en el búfer, se devolverán.

## Parámetros

**timeoutMs**
: Tiempo máximo de espera en milisegundos.
  `0` — esperar indefinidamente (por defecto).
  Si se excede el tiempo de espera, se lanza una `TimeoutException`.

## Valores de retorno

El siguiente valor del canal (`mixed`).

## Errores

- Lanza `Async\ChannelException` si el canal está cerrado y el búfer está vacío.
- Lanza `Async\TimeoutException` si el tiempo de espera ha expirado.

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
        $value = $channel->recv(timeoutMs: 2000);
        echo "Recibido: $value\n";
    } catch (\Async\TimeoutException) {
        echo "No se recibieron datos en 2 segundos\n";
    }
});
```

## Ver también

- [Channel::recvAsync](/es/docs/reference/channel/recv-async.html) — Recepción no bloqueante
- [Channel::send](/es/docs/reference/channel/send.html) — Enviar un valor al canal
- [Channel::isEmpty](/es/docs/reference/channel/is-empty.html) — Verificar si el búfer está vacío
- [Channel::getIterator](/es/docs/reference/channel/get-iterator.html) — Iterar sobre el canal usando foreach
