---
layout: docs
lang: it
path_key: "/docs/reference/channel/recv.html"
nav_active: docs
permalink: /it/docs/reference/channel/recv.html
page_title: "Channel::recv"
description: "Riceve un valore dal canale (operazione bloccante)."
---

# Channel::recv

(PHP 8.6+, True Async 1.0)

```php
public Channel::recv(?Completable $cancellationToken = null): mixed
```

Riceve il prossimo valore dal canale. Questa e' un'operazione bloccante — la coroutine
corrente viene sospesa se non ci sono valori disponibili nel canale.

Se il canale e' chiuso e il buffer e' vuoto, viene lanciata una `ChannelException`.
Se il canale e' chiuso ma ci sono ancora valori nel buffer, questi verranno restituiti.

## Parametri

**cancellationToken**
: Token di cancellazione (`Completable`) che consente di interrompere l'attesa in base a una condizione arbitraria.
  `null` — attesa senza limiti (predefinito).
  Quando il token viene completato, l'operazione viene interrotta e viene lanciata una `CancelledException`.
  Per limitare il tempo di attesa si puo' utilizzare `Async\timeout()`.

## Valori di ritorno

Il prossimo valore dal canale (`mixed`).

## Errori

- Lancia `Async\ChannelException` se il canale e' chiuso e il buffer e' vuoto.
- Lancia `Async\CancelledException` se il token di cancellazione e' stato completato.

## Esempi

### Esempio #1 Ricezione di valori da un canale

```php
<?php

use Async\Channel;

$channel = new Channel(5);

spawn(function() use ($channel) {
    for ($i = 1; $i <= 5; $i++) {
        $channel->send($i);
    }
    $channel->close();
});

spawn(function() use ($channel) {
    try {
        while (true) {
            $value = $channel->recv();
            echo "Ricevuto: $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "Canale chiuso e vuoto\n";
    }
});
```

### Esempio #2 Ricezione con timeout

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $value = $channel->recv(Async\timeout(2000));
        echo "Ricevuto: $value\n";
    } catch (\Async\CancelledException) {
        echo "Nessun dato ricevuto entro 2 secondi\n";
    }
});
```

### Esempio #3 Ricezione con token di cancellazione personalizzato

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel();
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $value = $channel->recv($cancel);
        echo "Ricevuto: $value\n";
    } catch (\Async\CancelledException) {
        echo "Ricezione cancellata\n";
    }
});

// Cancelliamo da un'altra coroutine
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## Vedi anche

- [Channel::recvAsync](/it/docs/reference/channel/recv-async.html) — Ricezione non bloccante
- [Channel::send](/it/docs/reference/channel/send.html) — Invia un valore al canale
- [Channel::isEmpty](/it/docs/reference/channel/is-empty.html) — Verifica se il buffer e' vuoto
- [Channel::getIterator](/it/docs/reference/channel/get-iterator.html) — Itera sul canale con foreach
