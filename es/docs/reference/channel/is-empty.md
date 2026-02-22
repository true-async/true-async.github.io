---
layout: docs
lang: es
path_key: "/docs/reference/channel/is-empty.html"
nav_active: docs
permalink: /es/docs/reference/channel/is-empty.html
page_title: "Channel::isEmpty"
description: "Verificar si el búfer del canal está vacío."
---

# Channel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public Channel::isEmpty(): bool
```

Verifica si el búfer del canal está vacío (no hay valores disponibles para recibir).

Para un canal rendezvous (`capacity = 0`), esto siempre devuelve `true`,
ya que los datos se transfieren directamente sin almacenamiento en búfer.

## Valores de retorno

`true` — el búfer está vacío.
`false` — el búfer contiene valores.

## Ejemplos

### Ejemplo #1 Verificar datos disponibles

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isEmpty() ? "vacío" : "tiene datos"; // "vacío"

$channel->send(42);

echo $channel->isEmpty() ? "vacío" : "tiene datos"; // "tiene datos"
```

### Ejemplo #2 Procesamiento de datos por lotes

```php
<?php

use Async\Channel;

$channel = new Channel(100);

spawn(function() use ($channel) {
    while (!$channel->isClosed() || !$channel->isEmpty()) {
        if ($channel->isEmpty()) {
            delay(50); // esperar a que lleguen datos
            continue;
        }

        $batch = [];
        while (!$channel->isEmpty() && count($batch) < 10) {
            $batch[] = $channel->recv();
        }

        processBatch($batch);
    }
});
```

## Ver también

- [Channel::isFull](/es/docs/reference/channel/is-full.html) --- Verificar si el búfer está lleno
- [Channel::count](/es/docs/reference/channel/count.html) --- Número de valores en el búfer
- [Channel::recv](/es/docs/reference/channel/recv.html) --- Recibir un valor
