---
layout: docs
lang: fr
path_key: "/docs/reference/thread-channel/is-full.html"
nav_active: docs
permalink: /fr/docs/reference/thread-channel/is-full.html
page_title: "ThreadChannel::isFull()"
description: "Vérifier si le tampon du canal de thread a atteint sa capacité maximale."
---

# ThreadChannel::isFull

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isFull(): bool
```

Retourne `true` si le tampon du canal a atteint sa capacité maximale.

Pour un canal non bufferisé (`capacity = 0`), cette méthode retourne toujours `true` car il n'y a
pas de tampon — chaque `send()` doit attendre un `recv()` correspondant.

`isFull()` est thread-safe. Le résultat reflète l'état au moment de l'appel ;
un autre thread peut libérer un emplacement immédiatement après.

## Valeurs de retour

`true` — le tampon est à capacité maximale (ou c'est un canal non bufferisé).
`false` — le tampon dispose d'au moins un emplacement libre.

## Exemples

### Exemple #1 Vérifier la saturation du tampon avant d'envoyer

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(3);

echo $channel->isFull() ? "full" : "has space"; // "has space"

$channel->send('x');
$channel->send('y');
$channel->send('z');

echo $channel->isFull() ? "full" : "has space"; // "full"
```

### Exemple #2 Surveillance de la contre-pression dans un thread producteur

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        $items = range(1, 30);
        foreach ($items as $item) {
            if ($channel->isFull()) {
                // Le tampon est actuellement plein — send() va bloquer ;
                // journaliser la contre-pression pour l'observabilité
                error_log("ThreadChannel back-pressure: buffer full");
            }
            $channel->send($item); // bloque jusqu'à ce qu'un emplacement soit disponible
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                // Simuler un consommateur lent
                $val = $channel->recv();
                // traiter $val ...
            }
        } catch (\Async\ChannelClosedException) {
            echo "Done\n";
        }
    });

    await($producer);
    await($consumer);
});
```

## Voir aussi

- [ThreadChannel::isEmpty](/fr/docs/reference/thread-channel/is-empty.html) — Vérifier si le tampon est vide
- [ThreadChannel::capacity](/fr/docs/reference/thread-channel/capacity.html) — Capacité du canal
- [ThreadChannel::count](/fr/docs/reference/thread-channel/count.html) — Nombre de valeurs dans le tampon
- [ThreadChannel::send](/fr/docs/reference/thread-channel/send.html) — Envoyer une valeur (bloque lorsque plein)
- [Vue d'ensemble du composant ThreadChannel](/fr/docs/components/thread-channels.html)
