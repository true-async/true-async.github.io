---
layout: docs
lang: it
path_key: "/docs/reference/thread-channel/send.html"
nav_active: docs
permalink: /it/docs/reference/thread-channel/send.html
page_title: "ThreadChannel::send()"
description: "Invia un valore al canale thread, bloccando il thread chiamante se il canale non può accettarlo immediatamente."
---

# ThreadChannel::send

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::send(mixed $value): void
```

Invia un valore al canale. Si tratta di un'operazione **bloccante** — il thread chiamante viene bloccato
se il canale non può accettare il valore immediatamente.

- Per un **canale non bufferizzato** (`capacity = 0`), il thread si blocca fino a quando un altro thread chiama `recv()`.
- Per un **canale bufferizzato**, il thread si blocca solo quando il buffer è pieno e si sblocca non appena
  un ricevitore libera uno slot.

A differenza di `Channel::send()` (che sospende una coroutine), `ThreadChannel::send()` blocca
l'intero thread OS. Progetta la tua architettura di conseguenza — ad esempio, lascia libero il thread
mittente di bloccarsi, oppure usa un canale bufferizzato per ridurre la contesa.

Il valore viene **copiato in profondità** prima di essere inserito nel canale. Closure, risorse e
oggetti non serializzabili causeranno una `ThreadTransferException`.

## Parametri

**value**
: Il valore da inviare. Può essere di qualsiasi tipo serializzabile (scalare, array o oggetto serializzabile).

## Errori

- Lancia `Async\ChannelClosedException` se il canale è già chiuso.
- Lancia `Async\ThreadTransferException` se il valore non può essere serializzato per il trasferimento cross-thread.

## Esempi

### Esempio #1 Invio di risultati da un thread worker

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
            $result = $i * $i;
            $channel->send($result);
        }
        $channel->close();
    });

    await($worker);

    while (!$channel->isClosed() || !$channel->isEmpty()) {
        try {
            echo $channel->recv(), "\n";
        } catch (\Async\ChannelClosedException) {
            break;
        }
    }
});
```

### Esempio #2 Handshake non bufferizzato tra thread

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $requests  = new ThreadChannel(); // non bufferizzato
    $responses = new ThreadChannel();

    $server = spawn_thread(function() use ($requests, $responses) {
        $req = $requests->recv();             // si blocca fino all'arrivo della richiesta
        $responses->send(strtoupper($req));   // si blocca fino a quando la risposta è accettata
    });

    $requests->send('hello');                 // si blocca fino a quando il server chiama recv()
    $reply = $responses->recv();              // si blocca fino a quando il server chiama send()
    await($server);

    echo $reply, "\n"; // "HELLO"
});
```

### Esempio #3 Gestione di un canale chiuso

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(1);
    $channel->close();

    $thread = spawn_thread(function() use ($channel) {
        try {
            $channel->send('too late');
        } catch (\Async\ChannelClosedException $e) {
            return "Invio fallito: " . $e->getMessage();
        }
    });

    echo await($thread), "\n";
});
```

## Vedere anche

- [ThreadChannel::recv](/it/docs/reference/thread-channel/recv.html) — Ricevere un valore dal canale
- [ThreadChannel::isFull](/it/docs/reference/thread-channel/is-full.html) — Verificare se il buffer è pieno
- [ThreadChannel::close](/it/docs/reference/thread-channel/close.html) — Chiudere il canale
- [Panoramica del componente ThreadChannel](/it/docs/components/thread-channels.html)
