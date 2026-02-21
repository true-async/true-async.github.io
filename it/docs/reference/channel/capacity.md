---
layout: docs
lang: it
path_key: "/docs/reference/channel/capacity.html"
nav_active: docs
permalink: /it/docs/reference/channel/capacity.html
page_title: "Channel::capacity"
description: "Ottiene la capacita' del buffer del canale."
---

# Channel::capacity

(PHP 8.6+, True Async 1.0)

```php
public Channel::capacity(): int
```

Restituisce la capacita' del canale impostata al momento della creazione tramite il costruttore.

- `0` — canale rendezvous (non bufferizzato).
- Numero positivo — dimensione massima del buffer.

Il valore non cambia durante la vita del canale.

## Valori di ritorno

La capacita' del buffer del canale (`int`).

## Esempi

### Esempio #1 Verifica della capacita'

```php
<?php

use Async\Channel;

$rendezvous = new Channel();
echo $rendezvous->capacity(); // 0

$buffered = new Channel(100);
echo $buffered->capacity(); // 100
```

### Esempio #2 Logica adattiva basata sul tipo di canale

```php
<?php

use Async\Channel;

function processChannel(Channel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Canale rendezvous: ogni invio attende un ricevitore\n";
    } else {
        echo "Canale bufferizzato: capacita' {$ch->capacity()}\n";
        echo "Liberi: " . ($ch->capacity() - $ch->count()) . " slot\n";
    }
}
```

## Vedi anche

- [Channel::__construct](/it/docs/reference/channel/construct.html) — Crea un canale
- [Channel::count](/it/docs/reference/channel/count.html) — Numero di valori nel buffer
- [Channel::isFull](/it/docs/reference/channel/is-full.html) — Verifica se il buffer e' pieno
