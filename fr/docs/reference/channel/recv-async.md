---
layout: docs
lang: fr
path_key: "/docs/reference/channel/recv-async.html"
nav_active: docs
permalink: /fr/docs/reference/channel/recv-async.html
page_title: "Channel::recvAsync"
description: "Réception non bloquante d'une valeur du canal, retourne un Future."
---

# Channel::recvAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::recvAsync(): Future
```

Effectue une réception non bloquante d'une valeur du canal et retourne un objet `Future`
qui peut être attendu ultérieurement.

Contrairement à `recv()`, cette méthode **ne suspend pas** immédiatement la coroutine courante.
Au lieu de cela, un `Future` est retourné qui sera résolu lorsqu'une valeur deviendra disponible.

## Valeurs de retour

Un objet `Future` qui sera résolu avec la valeur reçue du canal.

## Exemples

### Exemple #1 Réception non bloquante

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

    // On peut effectuer d'autres tâches tant que les données ne sont pas encore nécessaires
    doSomeWork();

    echo await($futureA) . "\n"; // "data A"
    echo await($futureB) . "\n"; // "data B"
});
```

### Exemple #2 Réception parallèle depuis plusieurs canaux

```php
<?php

use Async\Channel;

$orders = new Channel(10);
$notifications = new Channel(10);

spawn(function() use ($orders, $notifications) {
    $orderFuture = $orders->recvAsync();
    $notifFuture = $notifications->recvAsync();

    // Attendre la première valeur disponible de n'importe quel canal
    [$result, $index] = awaitAnyOf($orderFuture, $notifFuture);

    echo "Reçu du canal #$index : $result\n";
});
```

## Voir aussi

- [Channel::recv](/fr/docs/reference/channel/recv.html) — Réception bloquante
- [Channel::sendAsync](/fr/docs/reference/channel/send-async.html) — Envoi non bloquant
- [await](/fr/docs/reference/await.html) — Attendre un Future
