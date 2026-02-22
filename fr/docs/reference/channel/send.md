---
layout: docs
lang: fr
path_key: "/docs/reference/channel/send.html"
nav_active: docs
permalink: /fr/docs/reference/channel/send.html
page_title: "Channel::send"
description: "Envoyer une valeur dans le canal (opération bloquante)."
---

# Channel::send

(PHP 8.6+, True Async 1.0)

```php
public Channel::send(mixed $value, int $timeoutMs = 0): void
```

Envoie une valeur dans le canal. C'est une opération bloquante — la coroutine courante est suspendue
si le canal ne peut pas accepter la valeur immédiatement.

Pour un **canal rendez-vous** (`capacity = 0`), l'expéditeur attend qu'une autre coroutine appelle `recv()`.
Pour un **canal avec tampon**, l'expéditeur attend uniquement lorsque le tampon est plein.

## Paramètres

**value**
: La valeur à envoyer. Peut être de n'importe quel type.

**timeoutMs**
: Temps d'attente maximum en millisecondes.
  `0` — attente indéfinie (par défaut).
  Si le délai est dépassé, une `TimeoutException` est levée.

## Erreurs

- Lève `Async\ChannelException` si le canal est fermé.
- Lève `Async\TimeoutException` si le délai d'attente a expiré.

## Exemples

### Exemple #1 Envoi de valeurs dans un canal

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('first');  // placé dans le tampon
    $channel->send('second'); // attend qu'un emplacement se libère
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "first"
    echo $channel->recv() . "\n"; // "second"
});
```

### Exemple #2 Envoi avec délai d'attente

```php
<?php

use Async\Channel;

$channel = new Channel(0); // rendez-vous

spawn(function() use ($channel) {
    try {
        $channel->send('data', timeoutMs: 1000);
    } catch (\Async\TimeoutException $e) {
        echo "Délai dépassé : personne n'a accepté la valeur en 1 seconde\n";
    }
});
```

## Voir aussi

- [Channel::sendAsync](/fr/docs/reference/channel/send-async.html) — Envoi non bloquant
- [Channel::recv](/fr/docs/reference/channel/recv.html) — Recevoir une valeur du canal
- [Channel::isFull](/fr/docs/reference/channel/is-full.html) — Vérifier si le tampon est plein
- [Channel::close](/fr/docs/reference/channel/close.html) — Fermer le canal
