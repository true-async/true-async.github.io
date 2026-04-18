---
layout: docs
lang: it
path_key: "/docs/reference/thread-channel/is-full.html"
nav_active: docs
permalink: /it/docs/reference/thread-channel/is-full.html
page_title: "ThreadChannel::isFull()"
description: "Verifica se il buffer del canale thread è riempito alla sua capacità massima."
---

# ThreadChannel::isFull

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isFull(): bool
```

Restituisce `true` se il buffer del canale ha raggiunto la sua capacità massima.

Per un canale non bufferizzato (`capacity = 0`), restituisce sempre `true` perché non
c'è buffer — ogni `send()` deve attendere un `recv()` corrispondente.

`isFull()` è thread-safe. Il risultato riflette lo stato al momento della chiamata;
un altro thread potrebbe liberare uno slot immediatamente dopo.

## Valori restituiti

`true` — il buffer è alla capacità massima (oppure è un canale non bufferizzato).
`false` — il buffer ha almeno uno slot libero.

## Esempi

### Esempio #1 Verifica del riempimento del buffer prima dell'invio

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(3);

echo $channel->isFull() ? "full" : "has space"; // "has space"

$channel->send('x');
$channel->send('y');
$channel->send('z');

echo $channel->isFull() ? "full" : "has space"; // "full"
```

### Esempio #2 Monitoraggio della contropressione in un thread produttore

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        $items = range(1, 30);
        foreach ($items as $item) {
            if ($channel->isFull()) {
                // Il buffer è attualmente pieno — send() si bloccherà;
                // registra la contropressione per l'osservabilità
                error_log("ThreadChannel back-pressure: buffer full");
            }
            $channel->send($item); // si blocca fino a quando lo spazio è disponibile
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                // Simula un consumatore lento
                $val = $channel->recv();
                // elabora $val ...
            }
        } catch (\Async\ChannelClosedException) {
            echo "Completato\n";
        }
    });

    await($producer);
    await($consumer);
});
```

## Vedere anche

- [ThreadChannel::isEmpty](/it/docs/reference/thread-channel/is-empty.html) — Verificare se il buffer è vuoto
- [ThreadChannel::capacity](/it/docs/reference/thread-channel/capacity.html) — Capacità del canale
- [ThreadChannel::count](/it/docs/reference/thread-channel/count.html) — Numero di valori nel buffer
- [ThreadChannel::send](/it/docs/reference/thread-channel/send.html) — Inviare un valore (si blocca quando pieno)
- [Panoramica del componente ThreadChannel](/it/docs/components/thread-channels.html)
