---
layout: docs
lang: fr
path_key: "/docs/reference/thread-channel/is-closed.html"
nav_active: docs
permalink: /fr/docs/reference/thread-channel/is-closed.html
page_title: "ThreadChannel::isClosed()"
description: "Vérifier si le canal de thread a été fermé."
---

# ThreadChannel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isClosed(): bool
```

Retourne `true` si le canal a été fermé via `close()`.

Un canal fermé n'accepte plus de nouvelles valeurs via `send()`, mais `recv()` continue
de retourner les valeurs restantes dans le tampon jusqu'à ce qu'il soit vidé.

`isClosed()` est thread-safe et peut être appelé depuis n'importe quel thread sans synchronisation.

## Valeurs de retour

`true` — le canal est fermé.
`false` — le canal est ouvert.

## Exemples

### Exemple #1 Vérifier l'état du canal depuis le thread principal

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    echo $channel->isClosed() ? "closed" : "open"; // "open"

    $channel->send('data');
    $channel->close();

    echo $channel->isClosed() ? "closed" : "open"; // "closed"

    // Les valeurs mises en tampon avant la fermeture sont toujours lisibles
    echo $channel->recv(), "\n"; // "data"
});
```

### Exemple #2 Boucle de consommation protégée par isClosed()

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 10; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // Continuer la lecture jusqu'à fermeture ET tampon vide
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                echo $channel->recv(), "\n";
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
    });

    await($producer);
    await($consumer);
});
```

## Voir aussi

- [ThreadChannel::close](/fr/docs/reference/thread-channel/close.html) — Fermer le canal
- [ThreadChannel::isEmpty](/fr/docs/reference/thread-channel/is-empty.html) — Vérifier si le tampon est vide
- [Vue d'ensemble du composant ThreadChannel](/fr/docs/components/thread-channels.html)
