---
layout: docs
lang: fr
path_key: "/docs/reference/thread-channel/count.html"
nav_active: docs
permalink: /fr/docs/reference/thread-channel/count.html
page_title: "ThreadChannel::count()"
description: "Obtenir le nombre de valeurs actuellement dans le tampon du canal de thread."
---

# ThreadChannel::count

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::count(): int
```

Retourne le nombre actuel de valeurs contenues dans le tampon du canal.

`ThreadChannel` implémente l'interface `Countable`, vous pouvez donc également utiliser `count($channel)`.

Pour un canal non bufferisé (`capacity = 0`), cette méthode retourne toujours `0` — les valeurs sont
transférées directement entre threads sans mise en tampon.

Le comptage est lu de manière atomique et est précis au moment de l'appel, même si d'autres threads
envoient ou reçoivent de manière concurrente.

## Valeurs de retour

Le nombre de valeurs actuellement dans le tampon (`int`).

## Exemples

### Exemple #1 Surveiller le niveau de remplissage du tampon

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(10);

$channel->send('a');
$channel->send('b');
$channel->send('c');

echo $channel->count();   // 3
echo count($channel);     // 3 — interface Countable

$channel->recv();
echo $channel->count();   // 2
```

### Exemple #2 Journaliser la charge du canal depuis un thread de surveillance

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $tasks = new ThreadChannel(100);

    // Thread de surveillance : journalise périodiquement l'utilisation du tampon
    $monitor = spawn_thread(function() use ($tasks) {
        while (!$tasks->isClosed()) {
            $pct = $tasks->capacity() > 0
                ? round($tasks->count() / $tasks->capacity() * 100)
                : 0;
            echo "Tampon : {$tasks->count()}/{$tasks->capacity()} ({$pct}%)\n";
            // Dans un vrai thread, utilisez sleep() ou un sémaphore ici
        }
    });

    // ... threads producteur et consommateur ...

    $tasks->close();
    await($monitor);
});
```

## Voir aussi

- [ThreadChannel::capacity](/fr/docs/reference/thread-channel/capacity.html) — Capacité du canal
- [ThreadChannel::isEmpty](/fr/docs/reference/thread-channel/is-empty.html) — Vérifier si le tampon est vide
- [ThreadChannel::isFull](/fr/docs/reference/thread-channel/is-full.html) — Vérifier si le tampon est plein
- [Vue d'ensemble du composant ThreadChannel](/fr/docs/components/thread-channels.html)
