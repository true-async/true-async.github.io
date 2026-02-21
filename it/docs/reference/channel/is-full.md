---
layout: docs
lang: it
path_key: "/docs/reference/channel/is-full.html"
nav_active: docs
permalink: /it/docs/reference/channel/is-full.html
page_title: "Channel::isFull"
description: "Verifica se il buffer del canale e' pieno."
---

# Channel::isFull

(PHP 8.6+, True Async 1.0)

```php
public Channel::isFull(): bool
```

Verifica se il buffer del canale e' riempito alla capacita' massima.

Per un canale rendezvous (`capacity = 0`), restituisce sempre `true`,
poiche' non c'e' un buffer.

## Valori di ritorno

`true` — il buffer e' pieno (oppure e' un canale rendezvous).
`false` — il buffer ha spazio libero.

## Esempi

### Esempio #1 Verifica del riempimento del buffer

```php
<?php

use Async\Channel;

$channel = new Channel(2);

echo $channel->isFull() ? "pieno" : "ha spazio"; // "ha spazio"

$channel->send('a');
$channel->send('b');

echo $channel->isFull() ? "pieno" : "ha spazio"; // "pieno"
```

### Esempio #2 Velocita' di invio adattiva

```php
<?php

use Async\Channel;

$channel = new Channel(50);

spawn(function() use ($channel) {
    foreach (readLargeFile('data.csv') as $line) {
        if ($channel->isFull()) {
            echo "Buffer pieno, rallentamento dell'elaborazione\n";
        }
        $channel->send($line); // si sospende se pieno
    }
    $channel->close();
});
```

## Vedi anche

- [Channel::isEmpty](/it/docs/reference/channel/is-empty.html) --- Verifica se il buffer e' vuoto
- [Channel::capacity](/it/docs/reference/channel/capacity.html) --- Capacita' del canale
- [Channel::count](/it/docs/reference/channel/count.html) --- Numero di valori nel buffer
- [Channel::sendAsync](/it/docs/reference/channel/send-async.html) --- Invio non bloccante
