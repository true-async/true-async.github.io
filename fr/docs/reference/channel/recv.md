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
public Channel::recv(int $timeoutMs = 0): mixed
```

Reçoit la prochaine valeur du canal. C'est une opération bloquante — la coroutine
courante est suspendue si aucune valeur n'est disponible dans le canal.

Si le canal est fermé et que le tampon est vide, une `ChannelException` est levée.
Si le canal est fermé mais que des valeurs restent dans le tampon, elles seront retournées.

## Paramètres

**timeoutMs**
: Temps d'attente maximum en millisecondes.
  `0` — attente indéfinie (par défaut).
  Si le délai est dépassé, une `TimeoutException` est levée.

## Valeurs de retour

La prochaine valeur du canal (`mixed`).

## Erreurs

- Lève `Async\ChannelException` si le canal est fermé et que le tampon est vide.
- Lève `Async\TimeoutException` si le délai d'attente a expiré.

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
        $value = $channel->recv(timeoutMs: 2000);
        echo "Reçu : $value\n";
    } catch (\Async\TimeoutException) {
        echo "Aucune donnée reçue dans les 2 secondes\n";
    }
});
```

## Voir aussi

- [Channel::recvAsync](/fr/docs/reference/channel/recv-async.html) — Réception non bloquante
- [Channel::send](/fr/docs/reference/channel/send.html) — Envoyer une valeur dans le canal
- [Channel::isEmpty](/fr/docs/reference/channel/is-empty.html) — Vérifier si le tampon est vide
- [Channel::getIterator](/fr/docs/reference/channel/get-iterator.html) — Itérer sur le canal avec foreach
