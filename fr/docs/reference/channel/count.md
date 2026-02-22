---
layout: docs
lang: fr
path_key: "/docs/reference/channel/count.html"
nav_active: docs
permalink: /fr/docs/reference/channel/count.html
page_title: "Channel::count"
description: "Obtenir le nombre de valeurs dans le tampon du canal."
---

# Channel::count

(PHP 8.6+, True Async 1.0)

```php
public Channel::count(): int
```

Retourne le nombre actuel de valeurs dans le tampon du canal.

Channel implémente l'interface `Countable`, vous pouvez donc utiliser `count($channel)`.

Pour un canal rendez-vous (`capacity = 0`), cette méthode retourne toujours `0`.

## Valeurs de retour

Le nombre de valeurs dans le tampon (`int`).

## Exemples

### Exemple #1 Surveillance du niveau de remplissage du tampon

```php
<?php

use Async\Channel;

$channel = new Channel(5);

$channel->send(1);
$channel->send(2);
$channel->send(3);

echo count($channel);        // 3
echo $channel->count();      // 3

$channel->recv();
echo count($channel);        // 2
```

### Exemple #2 Journalisation de la charge du canal

```php
<?php

use Async\Channel;

$tasks = new Channel(100);

spawn(function() use ($tasks) {
    while (!$tasks->isClosed()) {
        $usage = $tasks->count() / $tasks->capacity() * 100;
        echo "Le tampon est rempli à " . round($usage) . "%\n";
        delay(1000);
    }
});
```

## Voir aussi

- [Channel::capacity](/fr/docs/reference/channel/capacity.html) --- Capacité du canal
- [Channel::isEmpty](/fr/docs/reference/channel/is-empty.html) --- Vérifier si le tampon est vide
- [Channel::isFull](/fr/docs/reference/channel/is-full.html) --- Vérifier si le tampon est plein
