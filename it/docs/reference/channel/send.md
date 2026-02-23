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
public Channel::send(mixed $value, ?Completable $cancellationToken = null): void
```

Invia un valore al canale. Questa e' un'operazione bloccante — la coroutine corrente viene sospesa
se il canale non puo' accettare il valore immediatamente.

Per un **canale rendezvous** (`capacity = 0`), il mittente attende fino a quando un'altra coroutine chiama `recv()`.
Per un **canale bufferizzato**, il mittente attende solo quando il buffer e' pieno.

## Parametri

**value**
: Il valore da inviare. Puo' essere di qualsiasi tipo.

**cancellationToken**
: Token di cancellazione (`Completable`) che consente di interrompere l'attesa in base a una condizione arbitraria.
  `null` — attesa senza limiti (predefinito).
  Quando il token viene completato, l'operazione viene interrotta e viene lanciata una `CancelledException`.
  Per limitare il tempo di attesa si puo' utilizzare `Async\timeout()`.

## Errori

- Lancia `Async\ChannelException` se il canale e' chiuso.
- Lancia `Async\CancelledException` se il token di cancellazione e' stato completato.

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
        $channel->send('data', Async\timeout(1000));
    } catch (\Async\CancelledException $e) {
        echo "Timeout: nessuno ha accettato il valore entro 1 secondo\n";
    }
});
```

### Esempio #3 Invio con token di cancellazione personalizzato

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel(0);
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $channel->send('data', $cancel);
    } catch (\Async\CancelledException $e) {
        echo "Invio cancellato\n";
    }
});

// Cancelliamo l'operazione da un'altra coroutine
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## Vedi anche

- [Channel::sendAsync](/it/docs/reference/channel/send-async.html) — Invio non bloccante
- [Channel::recv](/it/docs/reference/channel/recv.html) — Ricevi un valore dal canale
- [Channel::isFull](/it/docs/reference/channel/is-full.html) — Verifica se il buffer e' pieno
- [Channel::close](/it/docs/reference/channel/close.html) — Chiudi il canale
