---
layout: docs
lang: fr
path_key: "/docs/reference/thread-channel/is-empty.html"
nav_active: docs
permalink: /fr/docs/reference/thread-channel/is-empty.html
page_title: "ThreadChannel::isEmpty()"
description: "Vérifier si le tampon du canal de thread ne contient actuellement aucune valeur."
---

# ThreadChannel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isEmpty(): bool
```

Retourne `true` si le tampon du canal ne contient aucune valeur.

Pour un canal non bufferisé (`capacity = 0`), cette méthode retourne toujours `true` car les données
sont transférées directement entre threads sans mise en tampon.

`isEmpty()` est thread-safe. Le résultat reflète l'état au moment de l'appel ;
un autre thread peut placer une valeur dans le canal immédiatement après.

## Valeurs de retour

`true` — le tampon est vide (aucune valeur disponible).
`false` — le tampon contient au moins une valeur.

## Exemples

### Exemple #1 Vérifier la présence de données avant de recevoir

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"

$channel->send(42);

echo $channel->isEmpty() ? "empty" : "has data"; // "has data"

$channel->recv();

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"
```

### Exemple #2 Consommateur qui vide un canal fermé

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(50);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 20; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // Attendre qu'il y ait quelque chose à lire, ou que le canal se ferme
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            if ($channel->isEmpty()) {
                // Tampon momentanément vide — céder et réessayer
                continue;
            }
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

- [ThreadChannel::isFull](/fr/docs/reference/thread-channel/is-full.html) — Vérifier si le tampon est plein
- [ThreadChannel::count](/fr/docs/reference/thread-channel/count.html) — Nombre de valeurs dans le tampon
- [ThreadChannel::recv](/fr/docs/reference/thread-channel/recv.html) — Recevoir une valeur
- [Vue d'ensemble du composant ThreadChannel](/fr/docs/components/thread-channels.html)
