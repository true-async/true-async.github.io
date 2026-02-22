---
layout: docs
lang: es
path_key: "/docs/reference/channel/recv-async.html"
nav_active: docs
permalink: /es/docs/reference/channel/recv-async.html
page_title: "Channel::recvAsync"
description: "Recepción no bloqueante de un valor del canal, devuelve un Future."
---

# Channel::recvAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::recvAsync(): Future
```

Realiza una recepción no bloqueante de un valor del canal y devuelve un objeto `Future`
que puede ser esperado posteriormente.

A diferencia de `recv()`, este método **no suspende** la corrutina actual inmediatamente.
En su lugar, se devuelve un `Future` que se resolverá cuando un valor esté disponible.

## Valores de retorno

Un objeto `Future` que se resolverá con el valor recibido del canal.

## Ejemplos

### Ejemplo #1 Recepción no bloqueante

```php
<?php

use Async\Channel;

$channel = new Channel(3);

spawn(function() use ($channel) {
    $channel->send('data A');
    $channel->send('data B');
    $channel->close();
});

spawn(function() use ($channel) {
    $futureA = $channel->recvAsync();
    $futureB = $channel->recvAsync();

    // Puede realizar otro trabajo mientras los datos no son necesarios aún
    doSomeWork();

    echo await($futureA) . "\n"; // "data A"
    echo await($futureB) . "\n"; // "data B"
});
```

### Ejemplo #2 Recepción paralela de múltiples canales

```php
<?php

use Async\Channel;

$orders = new Channel(10);
$notifications = new Channel(10);

spawn(function() use ($orders, $notifications) {
    $orderFuture = $orders->recvAsync();
    $notifFuture = $notifications->recvAsync();

    // Esperar el primer valor disponible de cualquier canal
    [$result, $index] = awaitAnyOf($orderFuture, $notifFuture);

    echo "Recibido del canal #$index: $result\n";
});
```

## Ver también

- [Channel::recv](/es/docs/reference/channel/recv.html) — Recepción bloqueante
- [Channel::sendAsync](/es/docs/reference/channel/send-async.html) — Envío no bloqueante
- [await](/es/docs/reference/await.html) — Esperar un Future
