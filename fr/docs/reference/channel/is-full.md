---
layout: docs
lang: fr
path_key: "/docs/reference/channel/is-full.html"
nav_active: docs
permalink: /fr/docs/reference/channel/is-full.html
page_title: "Channel::isFull"
description: "Vérifier si le tampon du canal est plein."
---

# Channel::isFull

(PHP 8.6+, True Async 1.0)

```php
public Channel::isFull(): bool
```

Vérifie si le tampon du canal est rempli à sa capacité maximale.

Pour un canal rendez-vous (`capacity = 0`), cette méthode retourne toujours `true`,
car il n'y a pas de tampon.

## Valeurs de retour

`true` — le tampon est plein (ou c'est un canal rendez-vous).
`false` — le tampon dispose d'espace libre.

## Exemples

### Exemple #1 Vérification du remplissage du tampon

```php
<?php

use Async\Channel;

$channel = new Channel(2);

echo $channel->isFull() ? "plein" : "place disponible"; // "place disponible"

$channel->send('a');
$channel->send('b');

echo $channel->isFull() ? "plein" : "place disponible"; // "plein"
```

### Exemple #2 Débit d'envoi adaptatif

```php
<?php

use Async\Channel;

$channel = new Channel(50);

spawn(function() use ($channel) {
    foreach (readLargeFile('data.csv') as $line) {
        if ($channel->isFull()) {
            echo "Tampon plein, ralentissement du traitement\n";
        }
        $channel->send($line); // se suspend si plein
    }
    $channel->close();
});
```

## Voir aussi

- [Channel::isEmpty](/fr/docs/reference/channel/is-empty.html) --- Vérifier si le tampon est vide
- [Channel::capacity](/fr/docs/reference/channel/capacity.html) --- Capacité du canal
- [Channel::count](/fr/docs/reference/channel/count.html) --- Nombre de valeurs dans le tampon
- [Channel::sendAsync](/fr/docs/reference/channel/send-async.html) --- Envoi non bloquant
