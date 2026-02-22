---
layout: docs
lang: fr
path_key: "/docs/reference/channel/is-closed.html"
nav_active: docs
permalink: /fr/docs/reference/channel/is-closed.html
page_title: "Channel::isClosed"
description: "Vérifier si le canal est fermé."
---

# Channel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Channel::isClosed(): bool
```

Vérifie si le canal a été fermé par un appel à `close()`.

Un canal fermé n'accepte pas de nouvelles valeurs via `send()`, mais permet
de lire les valeurs restantes du tampon via `recv()`.

## Valeurs de retour

`true` — le canal est fermé.
`false` — le canal est ouvert.

## Exemples

### Exemple #1 Vérification de l'état du canal

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isClosed() ? "fermé" : "ouvert"; // "ouvert"

$channel->send('data');
$channel->close();

echo $channel->isClosed() ? "fermé" : "ouvert"; // "fermé"

// On peut encore lire le tampon même après la fermeture
$value = $channel->recv(); // "data"
```

### Exemple #2 Envoi conditionnel

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    while (!$channel->isClosed()) {
        $data = produceData();
        $channel->send($data);
        delay(100);
    }
    echo "Canal fermé, arrêt des envois\n";
});
```

## Voir aussi

- [Channel::close](/fr/docs/reference/channel/close.html) — Fermer le canal
- [Channel::isEmpty](/fr/docs/reference/channel/is-empty.html) — Vérifier si le tampon est vide
