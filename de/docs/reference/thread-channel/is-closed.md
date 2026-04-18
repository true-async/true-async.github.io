---
layout: docs
lang: de
path_key: "/docs/reference/thread-channel/is-closed.html"
nav_active: docs
permalink: /de/docs/reference/thread-channel/is-closed.html
page_title: "ThreadChannel::isClosed()"
description: "Prüft, ob der Thread-Kanal geschlossen wurde."
---

# ThreadChannel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isClosed(): bool
```

Gibt `true` zurück, wenn der Kanal über `close()` geschlossen wurde.

Ein geschlossener Kanal akzeptiert keine neuen Werte über `send()`, aber `recv()` gibt weiterhin
alle im Puffer verbliebenen Werte zurück, bis dieser geleert ist.

`isClosed()` ist thread-sicher und kann ohne Synchronisierung von jedem Thread aus aufgerufen werden.

## Rückgabewerte

`true` — der Kanal ist geschlossen.
`false` — der Kanal ist offen.

## Beispiele

### Beispiel #1 Kanalzustand vom Haupt-Thread aus prüfen

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    echo $channel->isClosed() ? "geschlossen" : "offen"; // "offen"

    $channel->send('data');
    $channel->close();

    echo $channel->isClosed() ? "geschlossen" : "offen"; // "geschlossen"

    // Vor dem Schließen gepufferte Werte sind noch lesbar
    echo $channel->recv(), "\n"; // "data"
});
```

### Beispiel #2 Konsumentenschleife mit isClosed() absichern

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
        // Lesen, bis geschlossen UND Puffer leer ist
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

## Siehe auch

- [ThreadChannel::close](/de/docs/reference/thread-channel/close.html) — Den Kanal schließen
- [ThreadChannel::isEmpty](/de/docs/reference/thread-channel/is-empty.html) — Prüfen, ob der Puffer leer ist
- [ThreadChannel-Komponentenübersicht](/de/docs/components/thread-channels.html)
