---
layout: docs
lang: it
path_key: "/docs/reference/channel/is-empty.html"
nav_active: docs
permalink: /it/docs/reference/channel/is-empty.html
page_title: "Channel::isEmpty"
description: "Verifica se il buffer del canale e' vuoto."
---

# Channel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public Channel::isEmpty(): bool
```

Verifica se il buffer del canale e' vuoto (nessun valore disponibile per la ricezione).

Per un canale rendezvous (`capacity = 0`), restituisce sempre `true`,
poiche' i dati vengono trasferiti direttamente senza bufferizzazione.

## Valori di ritorno

`true` — il buffer e' vuoto.
`false` — il buffer contiene valori.

## Esempi

### Esempio #1 Verifica della disponibilita' dei dati

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isEmpty() ? "vuoto" : "ha dati"; // "vuoto"

$channel->send(42);

echo $channel->isEmpty() ? "vuoto" : "ha dati"; // "ha dati"
```

### Esempio #2 Elaborazione batch dei dati

```php
<?php

use Async\Channel;

$channel = new Channel(100);

spawn(function() use ($channel) {
    while (!$channel->isClosed() || !$channel->isEmpty()) {
        if ($channel->isEmpty()) {
            delay(50); // attende l'arrivo dei dati
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

## Vedi anche

- [Channel::isFull](/it/docs/reference/channel/is-full.html) --- Verifica se il buffer e' pieno
- [Channel::count](/it/docs/reference/channel/count.html) --- Numero di valori nel buffer
- [Channel::recv](/it/docs/reference/channel/recv.html) --- Ricevi un valore
