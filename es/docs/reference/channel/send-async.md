---
layout: docs
lang: es
path_key: "/docs/reference/channel/send-async.html"
nav_active: docs
permalink: /es/docs/reference/channel/send-async.html
page_title: "Channel::sendAsync"
description: "Envío no bloqueante de un valor al canal."
---

# Channel::sendAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::sendAsync(mixed $value): bool
```

Realiza un intento no bloqueante de enviar un valor al canal.
A diferencia de `send()`, este método **nunca suspende** la corrutina.

Devuelve `true` si el valor fue enviado exitosamente (colocado en el búfer
o entregado a un receptor en espera). Devuelve `false` si el búfer está lleno
o el canal está cerrado.

## Parámetros

**value**
: El valor a enviar. Puede ser de cualquier tipo.

## Valores de retorno

`true` — el valor fue enviado exitosamente.
`false` — el canal está lleno o cerrado, el valor no fue enviado.

## Ejemplos

### Ejemplo #1 Intento de envío no bloqueante

```php
<?php

use Async\Channel;

$channel = new Channel(2);

$channel->sendAsync('a'); // true — el búfer está vacío
$channel->sendAsync('b'); // true — hay espacio disponible
$result = $channel->sendAsync('c'); // false — el búfer está lleno

echo $result ? "Enviado" : "Canal lleno"; // "Canal lleno"
```

### Ejemplo #2 Envío con verificación de disponibilidad

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $data = generateBatch();

    foreach ($data as $item) {
        if (!$channel->sendAsync($item)) {
            // El búfer está lleno — recurrir al envío bloqueante
            $channel->send($item);
        }
    }

    $channel->close();
});
```

## Ver también

- [Channel::send](/es/docs/reference/channel/send.html) — Envío bloqueante
- [Channel::isFull](/es/docs/reference/channel/is-full.html) — Verificar si el búfer está lleno
- [Channel::isClosed](/es/docs/reference/channel/is-closed.html) — Verificar si el canal está cerrado
