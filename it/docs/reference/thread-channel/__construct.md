---
layout: docs
lang: it
path_key: "/docs/reference/thread-channel/__construct.html"
nav_active: docs
permalink: /it/docs/reference/thread-channel/__construct.html
page_title: "ThreadChannel::__construct()"
description: "Crea un nuovo canale thread-safe per scambiare dati tra thread OS."
---

# ThreadChannel::__construct

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::__construct(int $capacity = 0)
```

Crea un nuovo canale thread-safe per il passaggio di dati tra thread OS.

`ThreadChannel` è la controparte cross-thread di [`Channel`](/it/docs/components/channels.html).
Mentre `Channel` è progettato per la comunicazione tra coroutine all'interno di un singolo thread,
`ThreadChannel` consente ai dati di fluire in modo sicuro tra **thread OS separati** — ad esempio, tra
il thread principale e un worker avviato con `spawn_thread()` o inviato a un `ThreadPool`.

Il comportamento del canale dipende dal parametro `$capacity`:

- **`capacity = 0`** — canale non bufferizzato (sincrono). `send()` blocca il thread chiamante
  fino a quando un altro thread chiama `recv()`. Questo garantisce che il ricevitore sia pronto prima
  che il mittente continui.
- **`capacity > 0`** — canale bufferizzato. `send()` non blocca finché c'è spazio nel buffer.
  Quando il buffer è pieno, il thread chiamante si blocca fino a quando non si libera spazio.

Tutti i valori trasferiti attraverso il canale vengono **copiati in profondità** — si applicano
le stesse regole di serializzazione di `spawn_thread()`. Gli oggetti che non possono essere
serializzati (es. closure, risorse, `stdClass` con riferimenti) causeranno una `ThreadTransferException`.

## Parametri

**capacity**
: La capacità del buffer interno del canale.
  `0` — canale non bufferizzato (default), `send()` si blocca fino a quando un ricevitore è pronto.
  Numero positivo — dimensione del buffer; `send()` si blocca solo quando il buffer è pieno.

## Esempi

### Esempio #1 Canale non bufferizzato tra thread

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // capacity = 0

    $thread = spawn_thread(function() use ($channel) {
        $value = $channel->recv(); // si blocca fino a quando il thread principale invia
        return "Worker ricevuto: $value";
    });

    $channel->send('hello'); // si blocca fino a quando il worker chiama recv()
    echo await($thread), "\n";
});
```

### Esempio #2 Canale bufferizzato tra thread

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10); // buffer per 10 elementi

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 10; $i++) {
            $channel->send($i); // non si blocca fino al riempimento del buffer
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        $results = [];
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                $results[] = $channel->recv();
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
        return $results;
    });

    await($producer);
    $results = await($consumer);
    echo implode(', ', $results), "\n";
});
```

## Vedere anche

- [ThreadChannel::send](/it/docs/reference/thread-channel/send.html) — Inviare un valore al canale
- [ThreadChannel::recv](/it/docs/reference/thread-channel/recv.html) — Ricevere un valore dal canale
- [ThreadChannel::capacity](/it/docs/reference/thread-channel/capacity.html) — Ottenere la capacità del canale
- [ThreadChannel::close](/it/docs/reference/thread-channel/close.html) — Chiudere il canale
- [Panoramica del componente ThreadChannel](/it/docs/components/thread-channels.html)
