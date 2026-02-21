---
layout: docs
lang: it
path_key: "/docs/reference/channel/construct.html"
nav_active: docs
permalink: /it/docs/reference/channel/construct.html
page_title: "Channel::__construct"
description: "Crea un nuovo canale per lo scambio di dati tra coroutine."
---

# Channel::__construct

(PHP 8.6+, True Async 1.0)

```php
public Channel::__construct(int $capacity = 0)
```

Crea un nuovo canale per il passaggio di dati tra coroutine.

Un canale e' una primitiva di sincronizzazione che consente alle coroutine di scambiare dati in modo sicuro.
Il comportamento del canale dipende dal parametro `$capacity`:

- **`capacity = 0`** — canale rendezvous (non bufferizzato). L'operazione `send()` sospende il mittente
  fino a quando un'altra coroutine chiama `recv()`. Questo garantisce il trasferimento sincrono dei dati.
- **`capacity > 0`** — canale bufferizzato. L'operazione `send()` non blocca finche' c'e' spazio nel buffer.
  Quando il buffer e' pieno, il mittente viene sospeso fino a quando non si libera spazio.

## Parametri

**capacity**
: La capacita' del buffer interno del canale.
  `0` — canale rendezvous (predefinito), send blocca fino a receive.
  Numero positivo — dimensione del buffer.

## Esempi

### Esempio #1 Canale rendezvous (non bufferizzato)

```php
<?php

use Async\Channel;

$channel = new Channel(); // capacity = 0

spawn(function() use ($channel) {
    $channel->send('hello'); // si sospende fino a quando qualcuno chiama recv()
    echo "Inviato\n";
});

spawn(function() use ($channel) {
    $value = $channel->recv(); // riceve 'hello', sblocca il mittente
    echo "Ricevuto: $value\n";
});
```

### Esempio #2 Canale bufferizzato

```php
<?php

use Async\Channel;

$channel = new Channel(3); // buffer per 3 elementi

spawn(function() use ($channel) {
    $channel->send(1); // non blocca — buffer vuoto
    $channel->send(2); // non blocca — spazio disponibile
    $channel->send(3); // non blocca — ultimo slot
    $channel->send(4); // si sospende — buffer pieno
});
```

## Vedi anche

- [Channel::send](/it/docs/reference/channel/send.html) — Invia un valore al canale
- [Channel::recv](/it/docs/reference/channel/recv.html) — Ricevi un valore dal canale
- [Channel::capacity](/it/docs/reference/channel/capacity.html) — Ottieni la capacita' del canale
- [Channel::close](/it/docs/reference/channel/close.html) — Chiudi il canale
