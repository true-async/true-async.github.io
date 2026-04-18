---
layout: docs
lang: fr
path_key: "/docs/reference/thread-channel/__construct.html"
nav_active: docs
permalink: /fr/docs/reference/thread-channel/__construct.html
page_title: "ThreadChannel::__construct()"
description: "Créer un nouveau canal thread-safe pour échanger des données entre des threads OS."
---

# ThreadChannel::__construct

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::__construct(int $capacity = 0)
```

Crée un nouveau canal thread-safe pour passer des données entre des threads OS.

`ThreadChannel` est le pendant inter-threads de [`Channel`](/fr/docs/components/channels.html).
Tandis que `Channel` est conçu pour la communication entre coroutines au sein d'un seul thread,
`ThreadChannel` permet aux données de circuler en toute sécurité entre **des threads OS distincts** — par exemple,
entre le thread principal et un worker démarré avec `spawn_thread()` ou soumis à un `ThreadPool`.

Le comportement du canal dépend du paramètre `$capacity` :

- **`capacity = 0`** — canal non bufferisé (synchrone). `send()` bloque le thread appelant
  jusqu'à ce qu'un autre thread appelle `recv()`. Cela garantit que le récepteur est prêt avant que
  l'émetteur ne continue.
- **`capacity > 0`** — canal bufferisé. `send()` ne bloque pas tant qu'il y a de la place dans le
  tampon. Lorsque le tampon est plein, le thread appelant se bloque jusqu'à ce qu'un espace se libère.

Toutes les valeurs transférées via le canal sont **copiées en profondeur** — les mêmes règles de
sérialisation s'appliquent qu'avec `spawn_thread()`. Les objets qui ne peuvent pas être sérialisés
(ex. fermetures, ressources, `stdClass` avec références) provoqueront une `ThreadTransferException`.

## Paramètres

**capacity**
: La capacité du tampon interne du canal.
  `0` — canal non bufferisé (par défaut), `send()` bloque jusqu'à ce qu'un récepteur soit prêt.
  Nombre positif — taille du tampon ; `send()` ne bloque que lorsque le tampon est plein.

## Exemples

### Exemple #1 Canal non bufferisé entre threads

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // capacity = 0

    $thread = spawn_thread(function() use ($channel) {
        $value = $channel->recv(); // bloque jusqu'à ce que le thread principal envoie
        return "Worker received: $value";
    });

    $channel->send('hello'); // bloque jusqu'à ce que le worker appelle recv()
    echo await($thread), "\n";
});
```

### Exemple #2 Canal bufferisé entre threads

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10); // tampon pour 10 éléments

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 10; $i++) {
            $channel->send($i); // ne bloque pas tant que le tampon n'est pas plein
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        $results = [];
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                $results[] = $channel->recv();
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
        return $results;
    });

    await($producer);
    $results = await($consumer);
    echo implode(', ', $results), "\n";
});
```

## Voir aussi

- [ThreadChannel::send](/fr/docs/reference/thread-channel/send.html) — Envoyer une valeur dans le canal
- [ThreadChannel::recv](/fr/docs/reference/thread-channel/recv.html) — Recevoir une valeur du canal
- [ThreadChannel::capacity](/fr/docs/reference/thread-channel/capacity.html) — Obtenir la capacité du canal
- [ThreadChannel::close](/fr/docs/reference/thread-channel/close.html) — Fermer le canal
- [Vue d'ensemble du composant ThreadChannel](/fr/docs/components/thread-channels.html)
