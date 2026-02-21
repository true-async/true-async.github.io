---
layout: docs
lang: it
path_key: "/docs/reference/channel/recv-async.html"
nav_active: docs
permalink: /it/docs/reference/channel/recv-async.html
page_title: "Channel::recvAsync"
description: "Ricezione non bloccante di un valore dal canale, restituisce un Future."
---

# Channel::recvAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::recvAsync(): Future
```

Esegue una ricezione non bloccante di un valore dal canale e restituisce un oggetto `Future`
che puo' essere atteso successivamente.

A differenza di `recv()`, questo metodo **non sospende** immediatamente la coroutine corrente.
Viene invece restituito un `Future` che sara' risolto quando un valore diventera' disponibile.

## Valori di ritorno

Un oggetto `Future` che verra' risolto con il valore ricevuto dal canale.

## Esempi

### Esempio #1 Ricezione non bloccante

```php
<?php

use Async\Channel;

$channel = new Channel(3);

spawn(function() use ($channel) {
    $channel->send('data A');
    $channel->send('data B');
    $channel->close();
});

spawn(function() use ($channel) {
    $futureA = $channel->recvAsync();
    $futureB = $channel->recvAsync();

    // Puo' eseguire altro lavoro mentre i dati non sono ancora necessari
    doSomeWork();

    echo await($futureA) . "\n"; // "data A"
    echo await($futureB) . "\n"; // "data B"
});
```

### Esempio #2 Ricezione parallela da canali multipli

```php
<?php

use Async\Channel;

$orders = new Channel(10);
$notifications = new Channel(10);

spawn(function() use ($orders, $notifications) {
    $orderFuture = $orders->recvAsync();
    $notifFuture = $notifications->recvAsync();

    // Attende il primo valore disponibile da qualsiasi canale
    [$result, $index] = awaitAnyOf($orderFuture, $notifFuture);

    echo "Ricevuto dal canale #$index: $result\n";
});
```

## Vedi anche

- [Channel::recv](/it/docs/reference/channel/recv.html) — Ricezione bloccante
- [Channel::sendAsync](/it/docs/reference/channel/send-async.html) — Invio non bloccante
- [await](/it/docs/reference/await.html) — Attende un Future
