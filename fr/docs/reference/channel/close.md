---
layout: docs
lang: fr
path_key: "/docs/reference/channel/close.html"
nav_active: docs
permalink: /fr/docs/reference/channel/close.html
page_title: "Channel::close"
description: "Fermer le canal pour tout envoi ultérieur de données."
---

# Channel::close

(PHP 8.6+, True Async 1.0)

```php
public Channel::close(): void
```

Ferme le canal. Après la fermeture :

- L'appel à `send()` lève une `ChannelException`.
- L'appel à `recv()` continue de retourner les valeurs du tampon jusqu'à ce qu'il soit vide.
  Ensuite, `recv()` lève une `ChannelException`.
- Toutes les coroutines en attente dans `send()` ou `recv()` reçoivent une `ChannelException`.
- L'itération via `foreach` se termine lorsque le tampon est vide.

Appeler `close()` à nouveau sur un canal déjà fermé ne provoque pas d'erreur.

## Exemples

### Exemple #1 Fermeture d'un canal après l'envoi de données

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    for ($i = 0; $i < 5; $i++) {
        $channel->send($i);
    }
    $channel->close(); // signal au récepteur qu'il n'y aura plus de données
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Reçu : $value\n";
    }
    // foreach se termine après la fermeture et le vidage du tampon
    echo "Canal épuisé\n";
});
```

### Exemple #2 Gestion de la fermeture par les coroutines en attente

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $channel->send('data'); // en attente d'un récepteur
    } catch (\Async\ChannelException $e) {
        echo "Canal fermé : {$e->getMessage()}\n";
    }
});

spawn(function() use ($channel) {
    delay(100); // court délai
    $channel->close(); // débloque l'expéditeur avec une exception
});
```

## Voir aussi

- [Channel::isClosed](/fr/docs/reference/channel/is-closed.html) — Vérifier si le canal est fermé
- [Channel::recv](/fr/docs/reference/channel/recv.html) — Recevoir une valeur (vide le tampon)
- [Channel::getIterator](/fr/docs/reference/channel/get-iterator.html) — Itérer jusqu'à la fermeture
