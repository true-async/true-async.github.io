---
layout: docs
lang: it
path_key: "/docs/reference/thread-channel/count.html"
nav_active: docs
permalink: /it/docs/reference/thread-channel/count.html
page_title: "ThreadChannel::count()"
description: "Ottieni il numero di valori attualmente presenti nel buffer del canale thread."
---

# ThreadChannel::count

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::count(): int
```

Restituisce il numero corrente di valori presenti nel buffer del canale.

`ThreadChannel` implementa l'interfaccia `Countable`, quindi è possibile usare anche `count($channel)`.

Per un canale non bufferizzato (`capacity = 0`), restituisce sempre `0` — i valori vengono trasferiti
direttamente tra i thread senza bufferizzazione.

Il conteggio viene letto atomicamente ed è accurato al momento della chiamata, anche quando altri thread
stanno inviando o ricevendo in modo concorrente.

## Valori restituiti

Il numero di valori attualmente nel buffer (`int`).

## Esempi

### Esempio #1 Monitorare il livello di riempimento del buffer

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(10);

$channel->send('a');
$channel->send('b');
$channel->send('c');

echo $channel->count();   // 3
echo count($channel);     // 3 — interfaccia Countable

$channel->recv();
echo $channel->count();   // 2
```

### Esempio #2 Registrare il carico del canale da un thread monitor

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $tasks = new ThreadChannel(100);

    // Thread monitor: registra periodicamente l'utilizzo del buffer
    $monitor = spawn_thread(function() use ($tasks) {
        while (!$tasks->isClosed()) {
            $pct = $tasks->capacity() > 0
                ? round($tasks->count() / $tasks->capacity() * 100)
                : 0;
            echo "Buffer: {$tasks->count()}/{$tasks->capacity()} ({$pct}%)\n";
            // In un thread reale si userebbe sleep() o un semaforo qui
        }
    });

    // ... thread produttore e consumatore ...

    $tasks->close();
    await($monitor);
});
```

## Vedere anche

- [ThreadChannel::capacity](/it/docs/reference/thread-channel/capacity.html) — Capacità del canale
- [ThreadChannel::isEmpty](/it/docs/reference/thread-channel/is-empty.html) — Verificare se il buffer è vuoto
- [ThreadChannel::isFull](/it/docs/reference/thread-channel/is-full.html) — Verificare se il buffer è pieno
- [Panoramica del componente ThreadChannel](/it/docs/components/thread-channels.html)
