---
layout: docs
lang: es
path_key: "/docs/reference/thread-channel/capacity.html"
nav_active: docs
permalink: /es/docs/reference/thread-channel/capacity.html
page_title: "ThreadChannel::capacity()"
description: "Obtener la capacidad del buffer del canal de hilos."
---

# ThreadChannel::capacity

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::capacity(): int
```

Devuelve la capacidad del canal establecida en el momento de la construcción.

- `0` — canal sin buffer (síncrono): `send()` bloquea hasta que el receptor esté listo.
- Número positivo — número máximo de valores que el buffer puede contener simultáneamente.

La capacidad es fija durante la vida útil del canal y no cambia.

## Valores de retorno

La capacidad del buffer del canal (`int`).

## Ejemplos

### Ejemplo #1 Comprobar la capacidad

```php
<?php

use Async\ThreadChannel;

$unbuffered = new ThreadChannel();
echo $unbuffered->capacity(); // 0

$buffered = new ThreadChannel(64);
echo $buffered->capacity(); // 64
```

### Ejemplo #2 Lógica adaptativa basada en el tipo de canal

```php
<?php

use Async\ThreadChannel;

function describeChannel(ThreadChannel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Sin buffer: cada send() bloquea hasta que se llame a recv()\n";
    } else {
        $free = $ch->capacity() - $ch->count();
        echo "Con buffer: capacidad {$ch->capacity()}, {$free} slot(s) libre(s)\n";
    }
}

$ch = new ThreadChannel(8);
$ch->send('item');
describeChannel($ch); // "Con buffer: capacidad 8, 7 slot(s) libre(s)"
```

## Véase también

- [ThreadChannel::__construct](/es/docs/reference/thread-channel/__construct.html) — Crear un canal
- [ThreadChannel::count](/es/docs/reference/thread-channel/count.html) — Número de valores actualmente en el buffer
- [ThreadChannel::isFull](/es/docs/reference/thread-channel/is-full.html) — Comprobar si el buffer está lleno
- [Resumen del componente ThreadChannel](/es/docs/components/thread-channels.html)
