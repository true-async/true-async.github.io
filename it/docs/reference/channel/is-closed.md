---
layout: docs
lang: it
path_key: "/docs/reference/channel/is-closed.html"
nav_active: docs
permalink: /it/docs/reference/channel/is-closed.html
page_title: "Channel::isClosed"
description: "Verifica se il canale e' chiuso."
---

# Channel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Channel::isClosed(): bool
```

Verifica se il canale e' stato chiuso da una chiamata a `close()`.

Un canale chiuso non accetta nuovi valori tramite `send()`, ma consente
la lettura dei valori rimanenti dal buffer tramite `recv()`.

## Valori di ritorno

`true` — il canale e' chiuso.
`false` — il canale e' aperto.

## Esempi

### Esempio #1 Verifica dello stato del canale

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isClosed() ? "chiuso" : "aperto"; // "aperto"

$channel->send('data');
$channel->close();

echo $channel->isClosed() ? "chiuso" : "aperto"; // "chiuso"

// E' ancora possibile leggere il buffer anche dopo la chiusura
$value = $channel->recv(); // "data"
```

### Esempio #2 Invio condizionale

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
    echo "Canale chiuso, invii interrotti\n";
});
```

## Vedi anche

- [Channel::close](/it/docs/reference/channel/close.html) — Chiudi il canale
- [Channel::isEmpty](/it/docs/reference/channel/is-empty.html) — Verifica se il buffer e' vuoto
