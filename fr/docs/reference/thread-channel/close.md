---
layout: docs
lang: fr
path_key: "/docs/reference/thread-channel/close.html"
nav_active: docs
permalink: /fr/docs/reference/thread-channel/close.html
page_title: "ThreadChannel::close()"
description: "Fermer le canal de thread, signalant qu'aucune autre valeur ne sera envoyée."
---

# ThreadChannel::close

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::close(): void
```

Ferme le canal. Après la fermeture :

- Appeler `send()` lève une `ChannelClosedException`.
- Appeler `recv()` continue de retourner les valeurs déjà dans le tampon jusqu'à ce qu'il soit vidé.
  Une fois le tampon vide, `recv()` lève une `ChannelClosedException`.
- Les threads actuellement bloqués dans `send()` ou `recv()` sont débloqués et reçoivent une
  `ChannelClosedException`.

Appeler `close()` sur un canal déjà fermé est une opération sans effet — cela ne lève pas d'exception.

`close()` est la manière standard de signaler « fin de flux » au côté consommateur. Le producteur
ferme le canal après avoir envoyé tous les éléments ; le consommateur lit jusqu'à intercepter
`ChannelClosedException`.

`close()` est lui-même thread-safe et peut être appelé depuis n'importe quel thread.

## Exemples

### Exemple #1 Le producteur ferme après avoir envoyé tous les éléments

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        foreach (['alpha', 'beta', 'gamma'] as $item) {
            $channel->send($item);
        }
        $channel->close(); // signal : pas d'autres données
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                echo $channel->recv(), "\n";
            }
        } catch (\Async\ChannelClosedException) {
            echo "Stream ended\n";
        }
    });

    await($producer);
    await($consumer);
});
```

### Exemple #2 Close débloque un récepteur en attente

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // non bufferisé

    // Ce thread se bloquera dans recv() en attendant une valeur
    $waiter = spawn_thread(function() use ($channel) {
        try {
            $channel->recv(); // bloque
        } catch (\Async\ChannelClosedException) {
            return "Unblocked by close()";
        }
    });

    // Fermer le canal depuis un autre thread — débloque le waiter
    spawn_thread(function() use ($channel) {
        $channel->close();
    });

    echo await($waiter), "\n";
});
```

### Exemple #3 Appeler close() deux fois est sans danger

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);
$channel->close();
$channel->close(); // no-op, aucune exception levée

echo $channel->isClosed() ? "closed" : "open"; // "closed"
```

## Voir aussi

- [ThreadChannel::isClosed](/fr/docs/reference/thread-channel/is-closed.html) — Vérifier si le canal est fermé
- [ThreadChannel::recv](/fr/docs/reference/thread-channel/recv.html) — Recevoir les valeurs restantes après fermeture
- [Vue d'ensemble du composant ThreadChannel](/fr/docs/components/thread-channels.html)
