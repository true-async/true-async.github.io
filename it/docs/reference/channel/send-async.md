---
layout: docs
lang: it
path_key: "/docs/reference/channel/send-async.html"
nav_active: docs
permalink: /it/docs/reference/channel/send-async.html
page_title: "Channel::sendAsync"
description: "Invio non bloccante di un valore al canale."
---

# Channel::sendAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::sendAsync(mixed $value): bool
```

Esegue un tentativo non bloccante di invio di un valore al canale.
A differenza di `send()`, questo metodo **non sospende mai** la coroutine.

Restituisce `true` se il valore e' stato inviato con successo (inserito nel buffer
o consegnato a un ricevitore in attesa). Restituisce `false` se il buffer e' pieno
o il canale e' chiuso.

## Parametri

**value**
: Il valore da inviare. Puo' essere di qualsiasi tipo.

## Valori di ritorno

`true` — il valore e' stato inviato con successo.
`false` — il canale e' pieno o chiuso, il valore non e' stato inviato.

## Esempi

### Esempio #1 Tentativo di invio non bloccante

```php
<?php

use Async\Channel;

$channel = new Channel(2);

$channel->sendAsync('a'); // true — buffer vuoto
$channel->sendAsync('b'); // true — spazio disponibile
$result = $channel->sendAsync('c'); // false — buffer pieno

echo $result ? "Inviato" : "Canale pieno"; // "Canale pieno"
```

### Esempio #2 Invio con verifica di disponibilita'

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $data = generateBatch();

    foreach ($data as $item) {
        if (!$channel->sendAsync($item)) {
            // Buffer pieno — passa all'invio bloccante
            $channel->send($item);
        }
    }

    $channel->close();
});
```

## Vedi anche

- [Channel::send](/it/docs/reference/channel/send.html) — Invio bloccante
- [Channel::isFull](/it/docs/reference/channel/is-full.html) — Verifica se il buffer e' pieno
- [Channel::isClosed](/it/docs/reference/channel/is-closed.html) — Verifica se il canale e' chiuso
