---
layout: docs
lang: fr
path_key: "/docs/reference/channel/capacity.html"
nav_active: docs
permalink: /fr/docs/reference/channel/capacity.html
page_title: "Channel::capacity"
description: "Obtenir la capacité du tampon du canal."
---

# Channel::capacity

(PHP 8.6+, True Async 1.0)

```php
public Channel::capacity(): int
```

Retourne la capacité du canal définie lors de la création via le constructeur.

- `0` — canal rendez-vous (sans tampon).
- Nombre positif — taille maximale du tampon.

La valeur ne change pas pendant la durée de vie du canal.

## Valeurs de retour

La capacité du tampon du canal (`int`).

## Exemples

### Exemple #1 Vérification de la capacité

```php
<?php

use Async\Channel;

$rendezvous = new Channel();
echo $rendezvous->capacity(); // 0

$buffered = new Channel(100);
echo $buffered->capacity(); // 100
```

### Exemple #2 Logique adaptative selon le type de canal

```php
<?php

use Async\Channel;

function processChannel(Channel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Canal rendez-vous : chaque envoi attend un récepteur\n";
    } else {
        echo "Canal avec tampon : capacité {$ch->capacity()}\n";
        echo "Libre : " . ($ch->capacity() - $ch->count()) . " emplacements\n";
    }
}
```

## Voir aussi

- [Channel::__construct](/fr/docs/reference/channel/construct.html) — Créer un canal
- [Channel::count](/fr/docs/reference/channel/count.html) — Nombre de valeurs dans le tampon
- [Channel::isFull](/fr/docs/reference/channel/is-full.html) — Vérifier si le tampon est plein
