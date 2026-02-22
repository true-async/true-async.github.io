---
layout: docs
lang: es
path_key: "/docs/reference/channel/construct.html"
nav_active: docs
permalink: /es/docs/reference/channel/construct.html
page_title: "Channel::__construct"
description: "Crear un nuevo canal para intercambiar datos entre corrutinas."
---

# Channel::__construct

(PHP 8.6+, True Async 1.0)

```php
public Channel::__construct(int $capacity = 0)
```

Crea un nuevo canal para pasar datos entre corrutinas.

Un canal es una primitiva de sincronización que permite a las corrutinas intercambiar datos de forma segura.
El comportamiento del canal depende del parámetro `$capacity`:

- **`capacity = 0`** — canal rendezvous (sin búfer). La operación `send()` suspende al emisor
  hasta que otra corrutina llame a `recv()`. Esto garantiza la transferencia sincrónica de datos.
- **`capacity > 0`** — canal con búfer. La operación `send()` no bloquea mientras haya espacio en el búfer.
  Cuando el búfer está lleno, el emisor se suspende hasta que haya espacio disponible.

## Parámetros

**capacity**
: La capacidad del búfer interno del canal.
  `0` — canal rendezvous (por defecto), send bloquea hasta que se reciba.
  Número positivo — tamaño del búfer.

## Ejemplos

### Ejemplo #1 Canal rendezvous (sin búfer)

```php
<?php

use Async\Channel;

$channel = new Channel(); // capacity = 0

spawn(function() use ($channel) {
    $channel->send('hello'); // se suspende hasta que alguien llame a recv()
    echo "Enviado\n";
});

spawn(function() use ($channel) {
    $value = $channel->recv(); // recibe 'hello', desbloquea al emisor
    echo "Recibido: $value\n";
});
```

### Ejemplo #2 Canal con búfer

```php
<?php

use Async\Channel;

$channel = new Channel(3); // búfer para 3 elementos

spawn(function() use ($channel) {
    $channel->send(1); // no bloquea — el búfer está vacío
    $channel->send(2); // no bloquea — hay espacio disponible
    $channel->send(3); // no bloquea — última posición
    $channel->send(4); // se suspende — el búfer está lleno
});
```

## Ver también

- [Channel::send](/es/docs/reference/channel/send.html) — Enviar un valor al canal
- [Channel::recv](/es/docs/reference/channel/recv.html) — Recibir un valor del canal
- [Channel::capacity](/es/docs/reference/channel/capacity.html) — Obtener la capacidad del canal
- [Channel::close](/es/docs/reference/channel/close.html) — Cerrar el canal
