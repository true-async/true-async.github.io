---
layout: docs
lang: fr
path_key: "/docs/reference/thread-channel/recv.html"
nav_active: docs
permalink: /fr/docs/reference/thread-channel/recv.html
page_title: "ThreadChannel::recv()"
description: "Recevoir la prochaine valeur du canal de thread, bloquant le thread appelant si aucune valeur n'est disponible."
---

# ThreadChannel::recv

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::recv(): mixed
```

Reçoit la prochaine valeur du canal. Il s'agit d'une opération **bloquante** — le thread appelant
est bloqué si aucune valeur n'est actuellement disponible dans le canal.

- Pour un **canal bufferisé**, `recv()` retourne immédiatement si le tampon contient au moins une valeur.
  Si le tampon est vide, le thread se bloque jusqu'à ce qu'un émetteur place une valeur.
- Pour un **canal non bufferisé** (`capacity = 0`), `recv()` se bloque jusqu'à ce qu'un autre thread appelle `send()`.

Si le canal est fermé et que le tampon contient encore des valeurs, ces valeurs sont retournées normalement.
Une fois le tampon vidé et le canal fermé, `recv()` lève une `ChannelClosedException`.

La valeur reçue est une **copie profonde** de l'originale — les modifications apportées à la valeur
retournée n'affectent pas la copie de l'émetteur.

## Valeurs de retour

La prochaine valeur du canal (`mixed`).

## Erreurs

- Lève `Async\ChannelClosedException` si le canal est fermé et que le tampon est vide.

## Exemples

### Exemple #1 Recevoir des valeurs produites par un thread de travail

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    $worker = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 5; $i++) {
            $channel->send($i * 10);
        }
        $channel->close();
    });

    // Recevoir toutes les valeurs — bloque lorsque le tampon est vide
    try {
        while (true) {
            echo $channel->recv(), "\n";
        }
    } catch (\Async\ChannelClosedException) {
        echo "All values received\n";
    }

    await($worker);
});
```

### Exemple #2 Thread consommateur vidant un canal partagé

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    // Producteur : remplit le canal depuis un thread
    $producer = spawn_thread(function() use ($channel) {
        foreach (range('a', 'e') as $letter) {
            $channel->send($letter);
        }
        $channel->close();
    });

    // Consommateur : vide le canal depuis un autre thread
    $consumer = spawn_thread(function() use ($channel) {
        $collected = [];
        try {
            while (true) {
                $collected[] = $channel->recv();
            }
        } catch (\Async\ChannelClosedException) {
            // tampon vidé et canal fermé
        }
        return $collected;
    });

    await($producer);
    $result = await($consumer);
    echo implode(', ', $result), "\n"; // "a, b, c, d, e"
});
```

### Exemple #3 Recevoir depuis un canal non bufferisé

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // non bufferisé

    $sender = spawn_thread(function() use ($channel) {
        // Bloque ici jusqu'à ce que le thread principal appelle recv()
        $channel->send(['task' => 'compress', 'file' => '/tmp/data.bin']);
    });

    // La coroutine (thread) principale appelle recv() — débloque l'émetteur
    $task = $channel->recv();
    echo "Got task: {$task['task']} on {$task['file']}\n";

    await($sender);
});
```

## Voir aussi

- [ThreadChannel::send](/fr/docs/reference/thread-channel/send.html) — Envoyer une valeur dans le canal
- [ThreadChannel::isEmpty](/fr/docs/reference/thread-channel/is-empty.html) — Vérifier si le tampon est vide
- [ThreadChannel::close](/fr/docs/reference/thread-channel/close.html) — Fermer le canal
- [Vue d'ensemble du composant ThreadChannel](/fr/docs/components/thread-channels.html)
