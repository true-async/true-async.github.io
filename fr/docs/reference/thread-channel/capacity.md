---
layout: docs
lang: fr
path_key: "/docs/reference/thread-channel/capacity.html"
nav_active: docs
permalink: /fr/docs/reference/thread-channel/capacity.html
page_title: "ThreadChannel::capacity()"
description: "Obtenir la capacité du tampon du canal de thread."
---

# ThreadChannel::capacity

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::capacity(): int
```

Retourne la capacité du canal définie à la construction.

- `0` — canal non bufferisé (synchrone) : `send()` bloque jusqu'à ce que le récepteur soit prêt.
- Nombre positif — nombre maximum de valeurs que le tampon peut contenir simultanément.

La capacité est fixée pour la durée de vie du canal et ne change pas.

## Valeurs de retour

La capacité du tampon du canal (`int`).

## Exemples

### Exemple #1 Vérifier la capacité

```php
<?php

use Async\ThreadChannel;

$unbuffered = new ThreadChannel();
echo $unbuffered->capacity(); // 0

$buffered = new ThreadChannel(64);
echo $buffered->capacity(); // 64
```

### Exemple #2 Logique adaptative selon le type de canal

```php
<?php

use Async\ThreadChannel;

function describeChannel(ThreadChannel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Non bufferisé : chaque send() bloque jusqu'à ce que recv() soit appelé\n";
    } else {
        $free = $ch->capacity() - $ch->count();
        echo "Bufferisé : capacité {$ch->capacity()}, {$free} emplacement(s) libre(s)\n";
    }
}

$ch = new ThreadChannel(8);
$ch->send('item');
describeChannel($ch); // "Buffered: capacity 8, 7 slot(s) free"
```

## Voir aussi

- [ThreadChannel::__construct](/fr/docs/reference/thread-channel/__construct.html) — Créer un canal
- [ThreadChannel::count](/fr/docs/reference/thread-channel/count.html) — Nombre de valeurs actuellement dans le tampon
- [ThreadChannel::isFull](/fr/docs/reference/thread-channel/is-full.html) — Vérifier si le tampon est plein
- [Vue d'ensemble du composant ThreadChannel](/fr/docs/components/thread-channels.html)
