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
public Channel::send(mixed $value, ?Completable $cancellationToken = null): void
```

Envoie une valeur dans le canal. C'est une opération bloquante — la coroutine courante est suspendue
si le canal ne peut pas accepter la valeur immédiatement.

Pour un **canal rendez-vous** (`capacity = 0`), l'expéditeur attend qu'une autre coroutine appelle `recv()`.
Pour un **canal avec tampon**, l'expéditeur attend uniquement lorsque le tampon est plein.

## Paramètres

**value**
: La valeur à envoyer. Peut être de n'importe quel type.

**cancellationToken**
: Jeton d'annulation (`Completable`) permettant d'interrompre l'attente selon une condition arbitraire.
  `null` — attente sans limite (par défaut).
  Lorsque le jeton est complété, l'opération est interrompue et une `CancelledException` est levée.
  Pour limiter l'attente dans le temps, vous pouvez utiliser `Async\timeout()`.

## Erreurs

- Lève `Async\ChannelException` si le canal est fermé.
- Lève `Async\CancelledException` si le jeton d'annulation a été complété.

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
        $channel->send('data', Async\timeout(1000));
    } catch (\Async\CancelledException $e) {
        echo "Délai dépassé : personne n'a accepté la valeur en 1 seconde\n";
    }
});
```

### Exemple #3 Envoi avec un jeton d'annulation personnalisé

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
        echo "Envoi annulé\n";
    }
});

// Annuler l'opération depuis une autre coroutine
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## Voir aussi

- [Channel::sendAsync](/fr/docs/reference/channel/send-async.html) — Envoi non bloquant
- [Channel::recv](/fr/docs/reference/channel/recv.html) — Recevoir une valeur du canal
- [Channel::isFull](/fr/docs/reference/channel/is-full.html) — Vérifier si le tampon est plein
- [Channel::close](/fr/docs/reference/channel/close.html) — Fermer le canal
