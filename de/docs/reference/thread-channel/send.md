---
layout: docs
lang: de
path_key: "/docs/reference/thread-channel/send.html"
nav_active: docs
permalink: /de/docs/reference/thread-channel/send.html
page_title: "ThreadChannel::send()"
description: "Sendet einen Wert an den Thread-Kanal und blockiert den aufrufenden Thread, wenn der Kanal ihn nicht sofort annehmen kann."
---

# ThreadChannel::send

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::send(mixed $value): void
```

Sendet einen Wert an den Kanal. Dies ist eine **blockierende** Operation — der aufrufende Thread wird blockiert,
wenn der Kanal den Wert nicht sofort annehmen kann.

- Bei einem **ungepufferten Kanal** (`capacity = 0`) blockiert der Thread, bis ein anderer Thread `recv()` aufruft.
- Bei einem **gepufferten Kanal** blockiert der Thread nur, wenn der Puffer voll ist, und wird entsperrt,
  sobald ein Empfänger einen Slot leert.

Im Gegensatz zu `Channel::send()` (das eine Coroutine anhält) blockiert `ThreadChannel::send()` den
gesamten OS-Thread. Gestalten Sie Ihre Architektur entsprechend — halten Sie zum Beispiel den sendenden Thread
frei zum Blockieren, oder verwenden Sie einen gepufferten Kanal, um Contention zu reduzieren.

Der Wert wird **tief kopiert**, bevor er in den Kanal gelegt wird. Closures, Ressourcen und
nicht serialisierbare Objekte verursachen eine `ThreadTransferException`.

## Parameter

**value**
: Der zu sendende Wert. Kann von einem beliebigen serialisierbaren Typ sein (Skalar, Array oder ein serialisierbares Objekt).

## Fehler

- Wirft `Async\ChannelClosedException`, wenn der Kanal bereits geschlossen ist.
- Wirft `Async\ThreadTransferException`, wenn der Wert nicht für die thread-übergreifende Übertragung serialisiert werden kann.

## Beispiele

### Beispiel #1 Ergebnisse von einem Worker-Thread senden

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

### Beispiel #2 Ungepufferter Handshake zwischen Threads

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $requests  = new ThreadChannel(); // ungepuffert
    $responses = new ThreadChannel();

    $server = spawn_thread(function() use ($requests, $responses) {
        $req = $requests->recv();             // blockiert, bis Anfrage eintrifft
        $responses->send(strtoupper($req));   // blockiert, bis Antwort angenommen wird
    });

    $requests->send('hello');                 // blockiert, bis Server recv() aufruft
    $reply = $responses->recv();              // blockiert, bis Server send() aufruft
    await($server);

    echo $reply, "\n"; // "HELLO"
});
```

### Beispiel #3 Einen geschlossenen Kanal behandeln

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
            return "Senden fehlgeschlagen: " . $e->getMessage();
        }
    });

    echo await($thread), "\n";
});
```

## Siehe auch

- [ThreadChannel::recv](/de/docs/reference/thread-channel/recv.html) — Einen Wert vom Kanal empfangen
- [ThreadChannel::isFull](/de/docs/reference/thread-channel/is-full.html) — Prüfen, ob der Puffer voll ist
- [ThreadChannel::close](/de/docs/reference/thread-channel/close.html) — Den Kanal schließen
- [ThreadChannel-Komponentenübersicht](/de/docs/components/thread-channels.html)
