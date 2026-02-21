---
layout: docs
lang: it
path_key: "/docs/reference/channel/send.html"
nav_active: docs
permalink: /it/docs/reference/channel/send.html
page_title: "Channel::send"
description: "Invia un valore al canale (operazione bloccante)."
---

# Channel::send

(PHP 8.6+, True Async 1.0)

```php
public Channel::send(mixed $value, int $timeoutMs = 0): void
```

Invia un valore al canale. Questa e' un'operazione bloccante — la coroutine corrente viene sospesa
se il canale non puo' accettare il valore immediatamente.

Per un **canale rendezvous** (`capacity = 0`), il mittente attende fino a quando un'altra coroutine chiama `recv()`.
Per un **canale bufferizzato**, il mittente attende solo quando il buffer e' pieno.

## Parametri

**value**
: Il valore da inviare. Puo' essere di qualsiasi tipo.

**timeoutMs**
: Tempo massimo di attesa in millisecondi.
  `0` — attesa indefinita (predefinito).
  Se il timeout viene superato, viene lanciata una `TimeoutException`.

## Errori

- Lancia `Async\ChannelException` se il canale e' chiuso.
- Lancia `Async\TimeoutException` se il timeout e' scaduto.

## Esempi

### Esempio #1 Invio di valori a un canale

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('first');  // inserito nel buffer
    $channel->send('second'); // attende che si liberi spazio
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "first"
    echo $channel->recv() . "\n"; // "second"
});
```

### Esempio #2 Invio con timeout

```php
<?php

use Async\Channel;

$channel = new Channel(0); // rendezvous

spawn(function() use ($channel) {
    try {
        $channel->send('data', timeoutMs: 1000);
    } catch (\Async\TimeoutException $e) {
        echo "Timeout: nessuno ha accettato il valore entro 1 secondo\n";
    }
});
```

## Vedi anche

- [Channel::sendAsync](/it/docs/reference/channel/send-async.html) — Invio non bloccante
- [Channel::recv](/it/docs/reference/channel/recv.html) — Ricevi un valore dal canale
- [Channel::isFull](/it/docs/reference/channel/is-full.html) — Verifica se il buffer e' pieno
- [Channel::close](/it/docs/reference/channel/close.html) — Chiudi il canale
