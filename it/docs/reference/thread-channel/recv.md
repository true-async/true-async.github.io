---
layout: docs
lang: it
path_key: "/docs/reference/thread-channel/recv.html"
nav_active: docs
permalink: /it/docs/reference/thread-channel/recv.html
page_title: "ThreadChannel::recv()"
description: "Riceve il prossimo valore dal canale thread, bloccando il thread chiamante se nessun valore è disponibile."
---

# ThreadChannel::recv

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::recv(): mixed
```

Riceve il prossimo valore dal canale. Si tratta di un'operazione **bloccante** — il thread chiamante
viene bloccato se nel canale non sono attualmente disponibili valori.

- Per un **canale bufferizzato**, `recv()` restituisce immediatamente se il buffer contiene almeno un valore.
  Se il buffer è vuoto, il thread si blocca fino a quando un mittente inserisce un valore.
- Per un **canale non bufferizzato** (`capacity = 0`), `recv()` si blocca fino a quando un altro thread chiama `send()`.

Se il canale è chiuso e il buffer contiene ancora valori, quei valori vengono restituiti normalmente.
Una volta che il buffer è svuotato e il canale è chiuso, `recv()` lancia `ChannelClosedException`.

Il valore ricevuto è una **copia profonda** dell'originale — le modifiche al valore restituito non
influenzano la copia del mittente.

## Valori restituiti

Il prossimo valore del canale (`mixed`).

## Errori

- Lancia `Async\ChannelClosedException` se il canale è chiuso e il buffer è vuoto.

## Esempi

### Esempio #1 Ricezione di valori prodotti da un thread worker

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    $worker = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 5; $i++) {
            $channel->send($i * 10);
        }
        $channel->close();
    });

    // Ricevi tutti i valori — si blocca quando il buffer è vuoto
    try {
        while (true) {
            echo $channel->recv(), "\n";
        }
    } catch (\Async\ChannelClosedException) {
        echo "Tutti i valori ricevuti\n";
    }

    await($worker);
});
```

### Esempio #2 Thread consumatore che svuota un canale condiviso

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    // Produttore: riempie il canale da un thread
    $producer = spawn_thread(function() use ($channel) {
        foreach (range('a', 'e') as $letter) {
            $channel->send($letter);
        }
        $channel->close();
    });

    // Consumatore: svuota il canale da un altro thread
    $consumer = spawn_thread(function() use ($channel) {
        $collected = [];
        try {
            while (true) {
                $collected[] = $channel->recv();
            }
        } catch (\Async\ChannelClosedException) {
            // buffer svuotato e canale chiuso
        }
        return $collected;
    });

    await($producer);
    $result = await($consumer);
    echo implode(', ', $result), "\n"; // "a, b, c, d, e"
});
```

### Esempio #3 Ricezione da un canale non bufferizzato

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // non bufferizzato

    $sender = spawn_thread(function() use ($channel) {
        // Si blocca qui fino a quando il thread principale chiama recv()
        $channel->send(['task' => 'compress', 'file' => '/tmp/data.bin']);
    });

    // La coroutine principale (thread) chiama recv() — sblocca il mittente
    $task = $channel->recv();
    echo "Task ricevuto: {$task['task']} su {$task['file']}\n";

    await($sender);
});
```

## Vedere anche

- [ThreadChannel::send](/it/docs/reference/thread-channel/send.html) — Inviare un valore al canale
- [ThreadChannel::isEmpty](/it/docs/reference/thread-channel/is-empty.html) — Verificare se il buffer è vuoto
- [ThreadChannel::close](/it/docs/reference/thread-channel/close.html) — Chiudere il canale
- [Panoramica del componente ThreadChannel](/it/docs/components/thread-channels.html)
