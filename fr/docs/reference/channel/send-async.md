---
layout: docs
lang: fr
path_key: "/docs/reference/channel/send-async.html"
nav_active: docs
permalink: /fr/docs/reference/channel/send-async.html
page_title: "Channel::sendAsync"
description: "Envoi non bloquant d'une valeur dans le canal."
---

# Channel::sendAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::sendAsync(mixed $value): bool
```

Effectue une tentative d'envoi non bloquante d'une valeur dans le canal.
Contrairement à `send()`, cette méthode **ne suspend jamais** la coroutine.

Retourne `true` si la valeur a été envoyée avec succès (placée dans le tampon
ou transmise à un récepteur en attente). Retourne `false` si le tampon est plein
ou si le canal est fermé.

## Paramètres

**value**
: La valeur à envoyer. Peut être de n'importe quel type.

## Valeurs de retour

`true` — la valeur a été envoyée avec succès.
`false` — le canal est plein ou fermé, la valeur n'a pas été envoyée.

## Exemples

### Exemple #1 Tentative d'envoi non bloquant

```php
<?php

use Async\Channel;

$channel = new Channel(2);

$channel->sendAsync('a'); // true — le tampon est vide
$channel->sendAsync('b'); // true — place disponible
$result = $channel->sendAsync('c'); // false — le tampon est plein

echo $result ? "Envoyé" : "Canal plein"; // "Canal plein"
```

### Exemple #2 Envoi avec vérification de disponibilité

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $data = generateBatch();

    foreach ($data as $item) {
        if (!$channel->sendAsync($item)) {
            // Le tampon est plein — basculer vers un envoi bloquant
            $channel->send($item);
        }
    }

    $channel->close();
});
```

## Voir aussi

- [Channel::send](/fr/docs/reference/channel/send.html) — Envoi bloquant
- [Channel::isFull](/fr/docs/reference/channel/is-full.html) — Vérifier si le tampon est plein
- [Channel::isClosed](/fr/docs/reference/channel/is-closed.html) — Vérifier si le canal est fermé
