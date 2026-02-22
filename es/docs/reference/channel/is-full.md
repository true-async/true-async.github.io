---
layout: docs
lang: es
path_key: "/docs/reference/channel/is-full.html"
nav_active: docs
permalink: /es/docs/reference/channel/is-full.html
page_title: "Channel::isFull"
description: "Verificar si el búfer del canal está lleno."
---

# Channel::isFull

(PHP 8.6+, True Async 1.0)

```php
public Channel::isFull(): bool
```

Verifica si el búfer del canal está lleno a su capacidad máxima.

Para un canal rendezvous (`capacity = 0`), esto siempre devuelve `true`,
ya que no hay búfer.

## Valores de retorno

`true` — el búfer está lleno (o es un canal rendezvous).
`false` — el búfer tiene espacio libre.

## Ejemplos

### Ejemplo #1 Verificar si el búfer está lleno

```php
<?php

use Async\Channel;

$channel = new Channel(2);

echo $channel->isFull() ? "lleno" : "tiene espacio"; // "tiene espacio"

$channel->send('a');
$channel->send('b');

echo $channel->isFull() ? "lleno" : "tiene espacio"; // "lleno"
```

### Ejemplo #2 Velocidad de envío adaptativa

```php
<?php

use Async\Channel;

$channel = new Channel(50);

spawn(function() use ($channel) {
    foreach (readLargeFile('data.csv') as $line) {
        if ($channel->isFull()) {
            echo "Búfer lleno, ralentizando el procesamiento\n";
        }
        $channel->send($line); // se suspende si está lleno
    }
    $channel->close();
});
```

## Ver también

- [Channel::isEmpty](/es/docs/reference/channel/is-empty.html) --- Verificar si el búfer está vacío
- [Channel::capacity](/es/docs/reference/channel/capacity.html) --- Capacidad del canal
- [Channel::count](/es/docs/reference/channel/count.html) --- Número de valores en el búfer
- [Channel::sendAsync](/es/docs/reference/channel/send-async.html) --- Envío no bloqueante
