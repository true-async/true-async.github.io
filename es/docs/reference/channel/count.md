---
layout: docs
lang: es
path_key: "/docs/reference/channel/count.html"
nav_active: docs
permalink: /es/docs/reference/channel/count.html
page_title: "Channel::count"
description: "Obtener el número de valores en el búfer del canal."
---

# Channel::count

(PHP 8.6+, True Async 1.0)

```php
public Channel::count(): int
```

Devuelve el número actual de valores en el búfer del canal.

Channel implementa la interfaz `Countable`, por lo que puede usar `count($channel)`.

Para un canal rendezvous (`capacity = 0`), esto siempre devuelve `0`.

## Valores de retorno

El número de valores en el búfer (`int`).

## Ejemplos

### Ejemplo #1 Monitoreo del nivel de llenado del búfer

```php
<?php

use Async\Channel;

$channel = new Channel(5);

$channel->send(1);
$channel->send(2);
$channel->send(3);

echo count($channel);        // 3
echo $channel->count();      // 3

$channel->recv();
echo count($channel);        // 2
```

### Ejemplo #2 Registro de carga del canal

```php
<?php

use Async\Channel;

$tasks = new Channel(100);

spawn(function() use ($tasks) {
    while (!$tasks->isClosed()) {
        $usage = $tasks->count() / $tasks->capacity() * 100;
        echo "Búfer al " . round($usage) . "% de capacidad\n";
        delay(1000);
    }
});
```

## Ver también

- [Channel::capacity](/es/docs/reference/channel/capacity.html) --- Capacidad del canal
- [Channel::isEmpty](/es/docs/reference/channel/is-empty.html) --- Verificar si el búfer está vacío
- [Channel::isFull](/es/docs/reference/channel/is-full.html) --- Verificar si el búfer está lleno
