---
layout: docs
lang: fr
path_key: "/docs/reference/channel/construct.html"
nav_active: docs
permalink: /fr/docs/reference/channel/construct.html
page_title: "Channel::__construct"
description: "Créer un nouveau canal pour l'échange de données entre coroutines."
---

# Channel::__construct

(PHP 8.6+, True Async 1.0)

```php
public Channel::__construct(int $capacity = 0)
```

Crée un nouveau canal pour le passage de données entre coroutines.

Un canal est une primitive de synchronisation qui permet aux coroutines d'échanger des données en toute sécurité.
Le comportement du canal dépend du paramètre `$capacity` :

- **`capacity = 0`** — canal rendez-vous (sans tampon). L'opération `send()` suspend l'expéditeur
  jusqu'à ce qu'une autre coroutine appelle `recv()`. Cela garantit un transfert de données synchrone.
- **`capacity > 0`** — canal avec tampon. L'opération `send()` ne bloque pas tant qu'il y a de la place dans le tampon.
  Lorsque le tampon est plein, l'expéditeur est suspendu jusqu'à ce qu'un emplacement se libère.

## Paramètres

**capacity**
: La capacité du tampon interne du canal.
  `0` — canal rendez-vous (par défaut), l'envoi bloque jusqu'à la réception.
  Nombre positif — taille du tampon.

## Exemples

### Exemple #1 Canal rendez-vous (sans tampon)

```php
<?php

use Async\Channel;

$channel = new Channel(); // capacity = 0

spawn(function() use ($channel) {
    $channel->send('hello'); // se suspend jusqu'à ce que quelqu'un appelle recv()
    echo "Envoyé\n";
});

spawn(function() use ($channel) {
    $value = $channel->recv(); // reçoit 'hello', débloque l'expéditeur
    echo "Reçu : $value\n";
});
```

### Exemple #2 Canal avec tampon

```php
<?php

use Async\Channel;

$channel = new Channel(3); // tampon pour 3 éléments

spawn(function() use ($channel) {
    $channel->send(1); // ne bloque pas — le tampon est vide
    $channel->send(2); // ne bloque pas — place disponible
    $channel->send(3); // ne bloque pas — dernier emplacement
    $channel->send(4); // se suspend — le tampon est plein
});
```

## Voir aussi

- [Channel::send](/fr/docs/reference/channel/send.html) — Envoyer une valeur dans le canal
- [Channel::recv](/fr/docs/reference/channel/recv.html) — Recevoir une valeur du canal
- [Channel::capacity](/fr/docs/reference/channel/capacity.html) — Obtenir la capacité du canal
- [Channel::close](/fr/docs/reference/channel/close.html) — Fermer le canal
