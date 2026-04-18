---
layout: docs
lang: fr
path_key: "/docs/reference/thread-channel/send.html"
nav_active: docs
permalink: /fr/docs/reference/thread-channel/send.html
page_title: "ThreadChannel::send()"
description: "Envoyer une valeur dans le canal de thread, bloquant le thread appelant si le canal ne peut pas l'accepter immédiatement."
---

# ThreadChannel::send

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::send(mixed $value): void
```

Envoie une valeur dans le canal. Il s'agit d'une opération **bloquante** — le thread appelant est bloqué
si le canal ne peut pas accepter la valeur immédiatement.

- Pour un **canal non bufferisé** (`capacity = 0`), le thread se bloque jusqu'à ce qu'un autre thread appelle `recv()`.
- Pour un **canal bufferisé**, le thread se bloque uniquement lorsque le tampon est plein, et se débloque dès
  qu'un récepteur libère un emplacement.

Contrairement à `Channel::send()` (qui suspend une coroutine), `ThreadChannel::send()` bloque
l'intégralité du thread OS. Concevez votre architecture en conséquence — par exemple, laissez le thread
émetteur libre de se bloquer, ou utilisez un canal bufferisé pour réduire la contention.

La valeur est **copiée en profondeur** avant d'être placée dans le canal. Les fermetures, ressources et
objets non sérialisables provoqueront une `ThreadTransferException`.

## Paramètres

**value**
: La valeur à envoyer. Peut être de tout type sérialisable (scalaire, tableau ou objet sérialisable).

## Erreurs

- Lève `Async\ChannelClosedException` si le canal est déjà fermé.
- Lève `Async\ThreadTransferException` si la valeur ne peut pas être sérialisée pour le transfert inter-threads.

## Exemples

### Exemple #1 Envoyer des résultats depuis un thread de travail

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
            $result = $i * $i;
            $channel->send($result);
        }
        $channel->close();
    });

    await($worker);

    while (!$channel->isClosed() || !$channel->isEmpty()) {
        try {
            echo $channel->recv(), "\n";
        } catch (\Async\ChannelClosedException) {
            break;
        }
    }
});
```

### Exemple #2 Handshake non bufferisé entre threads

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $requests  = new ThreadChannel(); // non bufferisé
    $responses = new ThreadChannel();

    $server = spawn_thread(function() use ($requests, $responses) {
        $req = $requests->recv();             // bloque jusqu'à l'arrivée de la requête
        $responses->send(strtoupper($req));   // bloque jusqu'à ce que la réponse soit acceptée
    });

    $requests->send('hello');                 // bloque jusqu'à ce que le serveur appelle recv()
    $reply = $responses->recv();              // bloque jusqu'à ce que le serveur appelle send()
    await($server);

    echo $reply, "\n"; // "HELLO"
});
```

### Exemple #3 Gérer un canal fermé

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(1);
    $channel->close();

    $thread = spawn_thread(function() use ($channel) {
        try {
            $channel->send('too late');
        } catch (\Async\ChannelClosedException $e) {
            return "Send failed: " . $e->getMessage();
        }
    });

    echo await($thread), "\n";
});
```

## Voir aussi

- [ThreadChannel::recv](/fr/docs/reference/thread-channel/recv.html) — Recevoir une valeur du canal
- [ThreadChannel::isFull](/fr/docs/reference/thread-channel/is-full.html) — Vérifier si le tampon est plein
- [ThreadChannel::close](/fr/docs/reference/thread-channel/close.html) — Fermer le canal
- [Vue d'ensemble du composant ThreadChannel](/fr/docs/components/thread-channels.html)
