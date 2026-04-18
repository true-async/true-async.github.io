---
layout: docs
lang: it
path_key: "/docs/reference/thread-channel/capacity.html"
nav_active: docs
permalink: /it/docs/reference/thread-channel/capacity.html
page_title: "ThreadChannel::capacity()"
description: "Ottieni la capacità del buffer del canale thread."
---

# ThreadChannel::capacity

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::capacity(): int
```

Restituisce la capacità del canale impostata al momento della costruzione.

- `0` — canale non bufferizzato (sincrono): `send()` si blocca fino a quando il ricevitore è pronto.
- Numero positivo — numero massimo di valori che il buffer può contenere simultaneamente.

La capacità è fissa per tutta la durata del canale e non cambia.

## Valori restituiti

La capacità del buffer del canale (`int`).

## Esempi

### Esempio #1 Verifica della capacità

```php
<?php

use Async\ThreadChannel;

$unbuffered = new ThreadChannel();
echo $unbuffered->capacity(); // 0

$buffered = new ThreadChannel(64);
echo $buffered->capacity(); // 64
```

### Esempio #2 Logica adattiva basata sul tipo di canale

```php
<?php

use Async\ThreadChannel;

function describeChannel(ThreadChannel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Non bufferizzato: ogni send() si blocca fino alla chiamata recv()\n";
    } else {
        $free = $ch->capacity() - $ch->count();
        echo "Bufferizzato: capacità {$ch->capacity()}, {$free} posto/i libero/i\n";
    }
}

$ch = new ThreadChannel(8);
$ch->send('item');
describeChannel($ch); // "Bufferizzato: capacità 8, 7 posto/i libero/i"
```

## Vedere anche

- [ThreadChannel::__construct](/it/docs/reference/thread-channel/__construct.html) — Creare un canale
- [ThreadChannel::count](/it/docs/reference/thread-channel/count.html) — Numero di valori attualmente nel buffer
- [ThreadChannel::isFull](/it/docs/reference/thread-channel/is-full.html) — Verificare se il buffer è pieno
- [Panoramica del componente ThreadChannel](/it/docs/components/thread-channels.html)
