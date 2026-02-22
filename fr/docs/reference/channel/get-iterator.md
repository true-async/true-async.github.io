---
layout: docs
lang: fr
path_key: "/docs/reference/channel/get-iterator.html"
nav_active: docs
permalink: /fr/docs/reference/channel/get-iterator.html
page_title: "Channel::getIterator"
description: "Obtenir un itérateur pour parcourir les valeurs du canal avec foreach."
---

# Channel::getIterator

(PHP 8.6+, True Async 1.0)

```php
public Channel::getIterator(): \Iterator
```

Retourne un itérateur pour parcourir les valeurs du canal. Channel implémente
l'interface `IteratorAggregate`, vous pouvez donc utiliser `foreach` directement.

L'itérateur suspend la coroutine courante en attendant la prochaine valeur.
L'itération se termine lorsque le canal est fermé **et** que le tampon est vide.

> **Important :** Si le canal n'est jamais fermé, `foreach` attendra indéfiniment de nouvelles valeurs.

## Valeurs de retour

Un objet `\Iterator` pour parcourir les valeurs du canal.

## Exemples

### Exemple #1 Lecture d'un canal avec foreach

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $channel->send('one');
    $channel->send('two');
    $channel->send('three');
    $channel->close(); // sans cela, foreach ne se terminera jamais
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Reçu : $value\n";
    }
    echo "Toutes les valeurs ont été traitées\n";
});
```

### Exemple #2 Patron producteur-consommateur

```php
<?php

use Async\Channel;

$jobs = new Channel(20);

// Producteur
spawn(function() use ($jobs) {
    $urls = ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'];

    foreach ($urls as $url) {
        $jobs->send($url);
    }
    $jobs->close();
});

// Consommateur
spawn(function() use ($jobs) {
    foreach ($jobs as $url) {
        $response = httpGet($url);
        echo "Téléchargé : $url ({$response->status})\n";
    }
});
```

## Voir aussi

- [Channel::recv](/fr/docs/reference/channel/recv.html) --- Recevoir une seule valeur
- [Channel::close](/fr/docs/reference/channel/close.html) --- Fermer le canal (termine l'itération)
- [Channel::isEmpty](/fr/docs/reference/channel/is-empty.html) --- Vérifier si le tampon est vide
