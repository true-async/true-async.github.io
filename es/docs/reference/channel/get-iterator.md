---
layout: docs
lang: es
path_key: "/docs/reference/channel/get-iterator.html"
nav_active: docs
permalink: /es/docs/reference/channel/get-iterator.html
page_title: "Channel::getIterator"
description: "Obtener un iterador para recorrer los valores del canal usando foreach."
---

# Channel::getIterator

(PHP 8.6+, True Async 1.0)

```php
public Channel::getIterator(): \Iterator
```

Devuelve un iterador para recorrer los valores del canal. Channel implementa
la interfaz `IteratorAggregate`, por lo que puede usar `foreach` directamente.

El iterador suspende la corrutina actual mientras espera el siguiente valor.
La iteración termina cuando el canal está cerrado **y** el búfer está vacío.

> **Importante:** Si el canal nunca se cierra, `foreach` esperará nuevos valores indefinidamente.

## Valores de retorno

Un objeto `\Iterator` para recorrer los valores del canal.

## Ejemplos

### Ejemplo #1 Lectura de un canal con foreach

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $channel->send('uno');
    $channel->send('dos');
    $channel->send('tres');
    $channel->close(); // sin esto, foreach nunca terminará
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Recibido: $value\n";
    }
    echo "Todos los valores procesados\n";
});
```

### Ejemplo #2 Patrón productor-consumidor

```php
<?php

use Async\Channel;

$jobs = new Channel(20);

// Productor
spawn(function() use ($jobs) {
    $urls = ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'];

    foreach ($urls as $url) {
        $jobs->send($url);
    }
    $jobs->close();
});

// Consumidor
spawn(function() use ($jobs) {
    foreach ($jobs as $url) {
        $response = httpGet($url);
        echo "Descargado: $url ({$response->status})\n";
    }
});
```

## Ver también

- [Channel::recv](/es/docs/reference/channel/recv.html) --- Recibir un solo valor
- [Channel::close](/es/docs/reference/channel/close.html) --- Cerrar el canal (termina la iteración)
- [Channel::isEmpty](/es/docs/reference/channel/is-empty.html) --- Verificar si el búfer está vacío
