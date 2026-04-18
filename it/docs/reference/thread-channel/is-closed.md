---
layout: docs
lang: it
path_key: "/docs/reference/thread-channel/is-closed.html"
nav_active: docs
permalink: /it/docs/reference/thread-channel/is-closed.html
page_title: "ThreadChannel::isClosed()"
description: "Verifica se il canale thread è stato chiuso."
---

# ThreadChannel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isClosed(): bool
```

Restituisce `true` se il canale è stato chiuso tramite `close()`.

Un canale chiuso non accetta nuovi valori tramite `send()`, ma `recv()` continua
a restituire i valori rimanenti nel buffer fino al suo svuotamento.

`isClosed()` è thread-safe e può essere chiamata da qualsiasi thread senza sincronizzazione.

## Valori restituiti

`true` — il canale è chiuso.
`false` — il canale è aperto.

## Esempi

### Esempio #1 Verifica dello stato del canale dal thread principale

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    echo $channel->isClosed() ? "closed" : "open"; // "open"

    $channel->send('data');
    $channel->close();

    echo $channel->isClosed() ? "closed" : "open"; // "closed"

    // I valori nel buffer prima della chiusura sono ancora leggibili
    echo $channel->recv(), "\n"; // "data"
});
```

### Esempio #2 Loop consumatore protetto da isClosed()

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 10; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // Continua a leggere fino a quando il canale è chiuso E il buffer è vuoto
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                echo $channel->recv(), "\n";
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
    });

    await($producer);
    await($consumer);
});
```

## Vedere anche

- [ThreadChannel::close](/it/docs/reference/thread-channel/close.html) — Chiudere il canale
- [ThreadChannel::isEmpty](/it/docs/reference/thread-channel/is-empty.html) — Verificare se il buffer è vuoto
- [Panoramica del componente ThreadChannel](/it/docs/components/thread-channels.html)
