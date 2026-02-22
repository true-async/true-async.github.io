---
layout: docs
lang: fr
path_key: "/docs/reference/channel/is-empty.html"
nav_active: docs
permalink: /fr/docs/reference/channel/is-empty.html
page_title: "Channel::isEmpty"
description: "Vérifier si le tampon du canal est vide."
---

# Channel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public Channel::isEmpty(): bool
```

Vérifie si le tampon du canal est vide (aucune valeur disponible pour la réception).

Pour un canal rendez-vous (`capacity = 0`), cette méthode retourne toujours `true`,
car les données sont transférées directement sans mise en tampon.

## Valeurs de retour

`true` — le tampon est vide.
`false` — le tampon contient des valeurs.

## Exemples

### Exemple #1 Vérification des données disponibles

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isEmpty() ? "vide" : "contient des données"; // "vide"

$channel->send(42);

echo $channel->isEmpty() ? "vide" : "contient des données"; // "contient des données"
```

### Exemple #2 Traitement par lots des données

```php
<?php

use Async\Channel;

$channel = new Channel(100);

spawn(function() use ($channel) {
    while (!$channel->isClosed() || !$channel->isEmpty()) {
        if ($channel->isEmpty()) {
            delay(50); // attendre l'arrivée de données
            continue;
        }

        $batch = [];
        while (!$channel->isEmpty() && count($batch) < 10) {
            $batch[] = $channel->recv();
        }

        processBatch($batch);
    }
});
```

## Voir aussi

- [Channel::isFull](/fr/docs/reference/channel/is-full.html) --- Vérifier si le tampon est plein
- [Channel::count](/fr/docs/reference/channel/count.html) --- Nombre de valeurs dans le tampon
- [Channel::recv](/fr/docs/reference/channel/recv.html) --- Recevoir une valeur
