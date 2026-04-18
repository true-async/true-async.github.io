---
layout: docs
lang: it
path_key: "/docs/reference/thread-channel/close.html"
nav_active: docs
permalink: /it/docs/reference/thread-channel/close.html
page_title: "ThreadChannel::close()"
description: "Chiude il canale thread, segnalando che non verranno inviati altri valori."
---

# ThreadChannel::close

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::close(): void
```

Chiude il canale. Dopo la chiusura:

- La chiamata a `send()` lancia una `ChannelClosedException`.
- La chiamata a `recv()` continua a restituire i valori già presenti nel buffer fino al suo svuotamento.
  Una volta che il buffer è vuoto, `recv()` lancia una `ChannelClosedException`.
- I thread attualmente bloccati in `send()` o `recv()` vengono sbloccati e ricevono una
  `ChannelClosedException`.

Chiamare `close()` su un canale già chiuso è un no-op — non lancia eccezioni.

`close()` è il modo standard per segnalare "fine dello stream" al lato consumatore. Il produttore
chiude il canale dopo aver inviato tutti gli elementi; il consumatore legge fino a quando non
intercetta `ChannelClosedException`.

`close()` è thread-safe e può essere chiamata da qualsiasi thread.

## Esempi

### Esempio #1 Il produttore chiude dopo aver inviato tutti gli elementi

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        foreach (['alpha', 'beta', 'gamma'] as $item) {
            $channel->send($item);
        }
        $channel->close(); // segnala: nessun altro dato
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                echo $channel->recv(), "\n";
            }
        } catch (\Async\ChannelClosedException) {
            echo "Stream terminato\n";
        }
    });

    await($producer);
    await($consumer);
});
```

### Esempio #2 La chiusura sblocca un ricevitore in attesa

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // non bufferizzato

    // Questo thread si bloccherà in recv() attendendo un valore
    $waiter = spawn_thread(function() use ($channel) {
        try {
            $channel->recv(); // si blocca
        } catch (\Async\ChannelClosedException) {
            return "Sbloccato da close()";
        }
    });

    // Chiudi il canale da un altro thread — sblocca il waiter
    spawn_thread(function() use ($channel) {
        $channel->close();
    });

    echo await($waiter), "\n";
});
```

### Esempio #3 Chiamare close() due volte è sicuro

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);
$channel->close();
$channel->close(); // no-op, non viene lanciata alcuna eccezione

echo $channel->isClosed() ? "closed" : "open"; // "closed"
```

## Vedere anche

- [ThreadChannel::isClosed](/it/docs/reference/thread-channel/is-closed.html) — Verificare se il canale è chiuso
- [ThreadChannel::recv](/it/docs/reference/thread-channel/recv.html) — Ricevere i valori rimanenti dopo la chiusura
- [Panoramica del componente ThreadChannel](/it/docs/components/thread-channels.html)
