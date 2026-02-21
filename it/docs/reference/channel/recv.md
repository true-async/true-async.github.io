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
public Channel::recv(int $timeoutMs = 0): mixed
```

Riceve il prossimo valore dal canale. Questa e' un'operazione bloccante — la coroutine
corrente viene sospesa se non ci sono valori disponibili nel canale.

Se il canale e' chiuso e il buffer e' vuoto, viene lanciata una `ChannelException`.
Se il canale e' chiuso ma ci sono ancora valori nel buffer, questi verranno restituiti.

## Parametri

**timeoutMs**
: Tempo massimo di attesa in millisecondi.
  `0` — attesa indefinita (predefinito).
  Se il timeout viene superato, viene lanciata una `TimeoutException`.

## Valori di ritorno

Il prossimo valore dal canale (`mixed`).

## Errori

- Lancia `Async\ChannelException` se il canale e' chiuso e il buffer e' vuoto.
- Lancia `Async\TimeoutException` se il timeout e' scaduto.

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
        $value = $channel->recv(timeoutMs: 2000);
        echo "Ricevuto: $value\n";
    } catch (\Async\TimeoutException) {
        echo "Nessun dato ricevuto entro 2 secondi\n";
    }
});
```

## Vedi anche

- [Channel::recvAsync](/it/docs/reference/channel/recv-async.html) — Ricezione non bloccante
- [Channel::send](/it/docs/reference/channel/send.html) — Invia un valore al canale
- [Channel::isEmpty](/it/docs/reference/channel/is-empty.html) — Verifica se il buffer e' vuoto
- [Channel::getIterator](/it/docs/reference/channel/get-iterator.html) — Itera sul canale con foreach
