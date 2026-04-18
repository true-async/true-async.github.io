---
layout: docs
lang: it
path_key: "/docs/reference/thread-channel/is-empty.html"
nav_active: docs
permalink: /it/docs/reference/thread-channel/is-empty.html
page_title: "ThreadChannel::isEmpty()"
description: "Verifica se il buffer del canale thread non contiene attualmente valori."
---

# ThreadChannel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isEmpty(): bool
```

Restituisce `true` se il buffer del canale non contiene valori.

Per un canale non bufferizzato (`capacity = 0`), restituisce sempre `true` perché i dati
vengono trasferiti direttamente tra i thread senza bufferizzazione.

`isEmpty()` è thread-safe. Il risultato riflette lo stato al momento della chiamata;
un altro thread potrebbe inserire un valore nel canale immediatamente dopo.

## Valori restituiti

`true` — il buffer è vuoto (nessun valore disponibile).
`false` — il buffer contiene almeno un valore.

## Esempi

### Esempio #1 Verifica dei dati nel buffer prima di ricevere

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"

$channel->send(42);

echo $channel->isEmpty() ? "empty" : "has data"; // "has data"

$channel->recv();

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"
```

### Esempio #2 Consumatore che svuota un canale chiuso

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(50);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 20; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // Attendere finché c'è qualcosa da leggere o il canale si chiude
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            if ($channel->isEmpty()) {
                // Buffer momentaneamente vuoto — cedi e riprova
                continue;
            }
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

- [ThreadChannel::isFull](/it/docs/reference/thread-channel/is-full.html) — Verificare se il buffer è pieno
- [ThreadChannel::count](/it/docs/reference/thread-channel/count.html) — Numero di valori nel buffer
- [ThreadChannel::recv](/it/docs/reference/thread-channel/recv.html) — Ricevere un valore
- [Panoramica del componente ThreadChannel](/it/docs/components/thread-channels.html)
