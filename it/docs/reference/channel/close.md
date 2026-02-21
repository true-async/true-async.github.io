---
layout: docs
lang: it
path_key: "/docs/reference/channel/close.html"
nav_active: docs
permalink: /it/docs/reference/channel/close.html
page_title: "Channel::close"
description: "Chiude il canale per ulteriori invii di dati."
---

# Channel::close

(PHP 8.6+, True Async 1.0)

```php
public Channel::close(): void
```

Chiude il canale. Dopo la chiusura:

- La chiamata a `send()` lancia una `ChannelException`.
- La chiamata a `recv()` continua a restituire valori dal buffer fino a quando non e' vuoto.
  Dopodiche', `recv()` lancia una `ChannelException`.
- Tutte le coroutine in attesa in `send()` o `recv()` ricevono una `ChannelException`.
- L'iterazione tramite `foreach` termina quando il buffer e' vuoto.

Chiamare `close()` di nuovo su un canale gia' chiuso non causa errori.

## Esempi

### Esempio #1 Chiusura di un canale dopo l'invio dei dati

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    for ($i = 0; $i < 5; $i++) {
        $channel->send($i);
    }
    $channel->close(); // segnala al ricevitore che non arriveranno piu' dati
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Ricevuto: $value\n";
    }
    // foreach termina dopo la chiusura e lo svuotamento del buffer
    echo "Canale esaurito\n";
});
```

### Esempio #2 Gestione della chiusura da parte delle coroutine in attesa

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $channel->send('data'); // in attesa di un ricevitore
    } catch (\Async\ChannelException $e) {
        echo "Canale chiuso: {$e->getMessage()}\n";
    }
});

spawn(function() use ($channel) {
    delay(100); // breve ritardo
    $channel->close(); // sblocca il mittente con un'eccezione
});
```

## Vedi anche

- [Channel::isClosed](/it/docs/reference/channel/is-closed.html) — Verifica se il canale e' chiuso
- [Channel::recv](/it/docs/reference/channel/recv.html) — Ricevi un valore (svuota il buffer)
- [Channel::getIterator](/it/docs/reference/channel/get-iterator.html) — Itera fino alla chiusura
