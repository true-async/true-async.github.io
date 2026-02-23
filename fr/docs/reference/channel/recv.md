---
layout: docs
lang: fr
path_key: "/docs/reference/channel/recv.html"
nav_active: docs
permalink: /fr/docs/reference/channel/recv.html
page_title: "Channel::recv"
description: "Recevoir une valeur du canal (opération bloquante)."
---

# Channel::recv

(PHP 8.6+, True Async 1.0)

```php
public Channel::recv(?Completable $cancellationToken = null): mixed
```

Reçoit la prochaine valeur du canal. C'est une opération bloquante — la coroutine
courante est suspendue si aucune valeur n'est disponible dans le canal.

Si le canal est fermé et que le tampon est vide, une `ChannelException` est levée.
Si le canal est fermé mais que des valeurs restent dans le tampon, elles seront retournées.

## Paramètres

**cancellationToken**
: Jeton d'annulation (`Completable`) permettant d'interrompre l'attente selon une condition arbitraire.
  `null` — attente sans limite (par défaut).
  Lorsque le jeton est complété, l'opération est interrompue et une `CancelledException` est levée.
  Pour limiter l'attente dans le temps, vous pouvez utiliser `Async\timeout()`.

## Valeurs de retour

La prochaine valeur du canal (`mixed`).

## Erreurs

- Lève `Async\ChannelException` si le canal est fermé et que le tampon est vide.
- Lève `Async\CancelledException` si le jeton d'annulation a été complété.

## Exemples

### Exemple #1 Réception de valeurs depuis un canal

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
            echo "Reçu : $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "Canal fermé et vide\n";
    }
});
```

### Exemple #2 Réception avec délai d'attente

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $value = $channel->recv(Async\timeout(2000));
        echo "Reçu : $value\n";
    } catch (\Async\CancelledException) {
        echo "Aucune donnée reçue dans les 2 secondes\n";
    }
});
```

### Exemple #3 Réception avec un jeton d'annulation personnalisé

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel();
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $value = $channel->recv($cancel);
        echo "Reçu : $value\n";
    } catch (\Async\CancelledException) {
        echo "Réception annulée\n";
    }
});

// Annuler depuis une autre coroutine
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## Voir aussi

- [Channel::recvAsync](/fr/docs/reference/channel/recv-async.html) — Réception non bloquante
- [Channel::send](/fr/docs/reference/channel/send.html) — Envoyer une valeur dans le canal
- [Channel::isEmpty](/fr/docs/reference/channel/is-empty.html) — Vérifier si le tampon est vide
- [Channel::getIterator](/fr/docs/reference/channel/get-iterator.html) — Itérer sur le canal avec foreach
