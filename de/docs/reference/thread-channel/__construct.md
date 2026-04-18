---
layout: docs
lang: de
path_key: "/docs/reference/thread-channel/__construct.html"
nav_active: docs
permalink: /de/docs/reference/thread-channel/__construct.html
page_title: "ThreadChannel::__construct()"
description: "Erstellt einen neuen thread-sicheren Kanal zum Austausch von Daten zwischen OS-Threads."
---

# ThreadChannel::__construct

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::__construct(int $capacity = 0)
```

Erstellt einen neuen thread-sicheren Kanal zum Übertragen von Daten zwischen OS-Threads.

`ThreadChannel` ist das thread-übergreifende Gegenstück zu [`Channel`](/de/docs/components/channels.html).
Während `Channel` für die Kommunikation zwischen Coroutinen innerhalb eines einzelnen Threads konzipiert ist,
ermöglicht `ThreadChannel` den sicheren Datenfluss zwischen **separaten OS-Threads** — zum Beispiel zwischen
dem Haupt-Thread und einem mit `spawn_thread()` gestarteten oder einem `ThreadPool` übergebenen Worker.

Das Verhalten des Kanals hängt vom `$capacity`-Parameter ab:

- **`capacity = 0`** — ungepufferter (synchroner) Kanal. `send()` blockiert den aufrufenden Thread,
  bis ein anderer Thread `recv()` aufruft. Dies garantiert, dass der Empfänger bereit ist, bevor der Sender
  fortfährt.
- **`capacity > 0`** — gepufferter Kanal. `send()` blockiert nicht, solange noch Platz im Puffer vorhanden ist.
  Wenn der Puffer voll ist, blockiert der aufrufende Thread, bis Platz verfügbar wird.

Alle über den Kanal übertragenen Werte werden **tief kopiert** — es gelten dieselben Serialisierungsregeln
wie bei `spawn_thread()`. Objekte, die nicht serialisiert werden können (z. B. Closures, Ressourcen,
`stdClass` mit Referenzen), verursachen eine `ThreadTransferException`.

## Parameter

**capacity**
: Die Kapazität des internen Puffers des Kanals.
  `0` — ungepufferter Kanal (Standard), `send()` blockiert, bis ein Empfänger bereit ist.
  Positive Zahl — Puffergröße; `send()` blockiert nur, wenn der Puffer voll ist.

## Beispiele

### Beispiel #1 Ungepufferter Kanal zwischen Threads

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // capacity = 0

    $thread = spawn_thread(function() use ($channel) {
        $value = $channel->recv(); // blockiert, bis der Haupt-Thread sendet
        return "Worker empfangen: $value";
    });

    $channel->send('hello'); // blockiert, bis der Worker recv() aufruft
    echo await($thread), "\n";
});
```

### Beispiel #2 Gepufferter Kanal zwischen Threads

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10); // Puffer für 10 Elemente

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 10; $i++) {
            $channel->send($i); // blockiert nicht, bis Puffer voll ist
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

## Siehe auch

- [ThreadChannel::send](/de/docs/reference/thread-channel/send.html) — Einen Wert an den Kanal senden
- [ThreadChannel::recv](/de/docs/reference/thread-channel/recv.html) — Einen Wert vom Kanal empfangen
- [ThreadChannel::capacity](/de/docs/reference/thread-channel/capacity.html) — Kanalkapazität abfragen
- [ThreadChannel::close](/de/docs/reference/thread-channel/close.html) — Den Kanal schließen
- [ThreadChannel-Komponentenübersicht](/de/docs/components/thread-channels.html)
