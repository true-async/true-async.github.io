---
layout: docs
lang: es
path_key: "/docs/reference/channel/is-closed.html"
nav_active: docs
permalink: /es/docs/reference/channel/is-closed.html
page_title: "Channel::isClosed"
description: "Verificar si el canal está cerrado."
---

# Channel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Channel::isClosed(): bool
```

Verifica si el canal ha sido cerrado mediante una llamada a `close()`.

Un canal cerrado no acepta nuevos valores a través de `send()`, pero permite
leer los valores restantes del búfer a través de `recv()`.

## Valores de retorno

`true` — el canal está cerrado.
`false` — el canal está abierto.

## Ejemplos

### Ejemplo #1 Verificar el estado del canal

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isClosed() ? "cerrado" : "abierto"; // "abierto"

$channel->send('data');
$channel->close();

echo $channel->isClosed() ? "cerrado" : "abierto"; // "cerrado"

// Aún se puede leer el búfer incluso después de cerrar
$value = $channel->recv(); // "data"
```

### Ejemplo #2 Envío condicional

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    while (!$channel->isClosed()) {
        $data = produceData();
        $channel->send($data);
        delay(100);
    }
    echo "Canal cerrado, deteniendo envíos\n";
});
```

## Ver también

- [Channel::close](/es/docs/reference/channel/close.html) — Cerrar el canal
- [Channel::isEmpty](/es/docs/reference/channel/is-empty.html) — Verificar si el búfer está vacío
