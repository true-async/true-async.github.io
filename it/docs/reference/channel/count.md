---
layout: docs
lang: it
path_key: "/docs/reference/channel/count.html"
nav_active: docs
permalink: /it/docs/reference/channel/count.html
page_title: "Channel::count"
description: "Ottiene il numero di valori nel buffer del canale."
---

# Channel::count

(PHP 8.6+, True Async 1.0)

```php
public Channel::count(): int
```

Restituisce il numero corrente di valori nel buffer del canale.

Channel implementa l'interfaccia `Countable`, quindi e' possibile usare `count($channel)`.

Per un canale rendezvous (`capacity = 0`), restituisce sempre `0`.

## Valori di ritorno

Il numero di valori nel buffer (`int`).

## Esempi

### Esempio #1 Monitoraggio del livello di riempimento del buffer

```php
<?php

use Async\Channel;

$channel = new Channel(5);

$channel->send(1);
$channel->send(2);
$channel->send(3);

echo count($channel);        // 3
echo $channel->count();      // 3

$channel->recv();
echo count($channel);        // 2
```

### Esempio #2 Logging del carico del canale

```php
<?php

use Async\Channel;

$tasks = new Channel(100);

spawn(function() use ($tasks) {
    while (!$tasks->isClosed()) {
        $usage = $tasks->count() / $tasks->capacity() * 100;
        echo "Buffer pieno al " . round($usage) . "%\n";
        delay(1000);
    }
});
```

## Vedi anche

- [Channel::capacity](/it/docs/reference/channel/capacity.html) --- Capacita' del canale
- [Channel::isEmpty](/it/docs/reference/channel/is-empty.html) --- Verifica se il buffer e' vuoto
- [Channel::isFull](/it/docs/reference/channel/is-full.html) --- Verifica se il buffer e' pieno
