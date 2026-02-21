---
layout: docs
lang: de
path_key: "/docs/reference/channel/recv-async.html"
nav_active: docs
permalink: /de/docs/reference/channel/recv-async.html
page_title: "Channel::recvAsync"
description: "Nicht-blockierendes Empfangen eines Werts vom Channel, gibt ein Future zurück."
---

# Channel::recvAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::recvAsync(): Future
```

Führt ein nicht-blockierendes Empfangen eines Werts vom Channel durch und gibt ein `Future`-Objekt zurück,
das später abgewartet werden kann.

Im Gegensatz zu `recv()` **suspendiert** diese Methode die aktuelle Coroutine **nicht** sofort.
Stattdessen wird ein `Future` zurückgegeben, das aufgelöst wird, sobald ein Wert verfügbar ist.

## Rückgabewerte

Ein `Future`-Objekt, das mit dem empfangenen Wert aus dem Channel aufgelöst wird.

## Beispiele

### Beispiel #1 Nicht-blockierendes Empfangen

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

    // Kann andere Arbeit erledigen, solange die Daten noch nicht benötigt werden
    doSomeWork();

    echo await($futureA) . "\n"; // "data A"
    echo await($futureB) . "\n"; // "data B"
});
```

### Beispiel #2 Paralleles Empfangen von mehreren Channels

```php
<?php

use Async\Channel;

$orders = new Channel(10);
$notifications = new Channel(10);

spawn(function() use ($orders, $notifications) {
    $orderFuture = $orders->recvAsync();
    $notifFuture = $notifications->recvAsync();

    // Auf den ersten verfügbaren Wert aus einem beliebigen Channel warten
    [$result, $index] = awaitAnyOf($orderFuture, $notifFuture);

    echo "Empfangen von Channel #$index: $result\n";
});
```

## Siehe auch

- [Channel::recv](/de/docs/reference/channel/recv.html) — Blockierendes Empfangen
- [Channel::sendAsync](/de/docs/reference/channel/send-async.html) — Nicht-blockierendes Senden
- [await](/de/docs/reference/await.html) — Ein Future abwarten
