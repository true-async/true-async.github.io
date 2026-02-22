---
layout: docs
lang: es
path_key: "/docs/reference/channel/capacity.html"
nav_active: docs
permalink: /es/docs/reference/channel/capacity.html
page_title: "Channel::capacity"
description: "Obtener la capacidad del búfer del canal."
---

# Channel::capacity

(PHP 8.6+, True Async 1.0)

```php
public Channel::capacity(): int
```

Devuelve la capacidad del canal establecida en el momento de la creación a través del constructor.

- `0` — canal rendezvous (sin búfer).
- Número positivo — tamaño máximo del búfer.

El valor no cambia durante la vida útil del canal.

## Valores de retorno

La capacidad del búfer del canal (`int`).

## Ejemplos

### Ejemplo #1 Verificar la capacidad

```php
<?php

use Async\Channel;

$rendezvous = new Channel();
echo $rendezvous->capacity(); // 0

$buffered = new Channel(100);
echo $buffered->capacity(); // 100
```

### Ejemplo #2 Lógica adaptativa según el tipo de canal

```php
<?php

use Async\Channel;

function processChannel(Channel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Canal rendezvous: cada envío espera un receptor\n";
    } else {
        echo "Canal con búfer: capacidad {$ch->capacity()}\n";
        echo "Libres: " . ($ch->capacity() - $ch->count()) . " posiciones\n";
    }
}
```

## Ver también

- [Channel::__construct](/es/docs/reference/channel/construct.html) — Crear un canal
- [Channel::count](/es/docs/reference/channel/count.html) — Número de valores en el búfer
- [Channel::isFull](/es/docs/reference/channel/is-full.html) — Verificar si el búfer está lleno
