---
layout: docs
lang: de
path_key: "/docs/reference/thread-channel/count.html"
nav_active: docs
permalink: /de/docs/reference/thread-channel/count.html
page_title: "ThreadChannel::count()"
description: "Gibt die Anzahl der aktuell im Thread-Kanal gepufferten Werte zurück."
---

# ThreadChannel::count

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::count(): int
```

Gibt die aktuelle Anzahl der im Puffer des Kanals gehaltenen Werte zurück.

`ThreadChannel` implementiert das `Countable`-Interface, sodass Sie auch `count($channel)` verwenden können.

Bei einem ungepufferten Kanal (`capacity = 0`) gibt dies immer `0` zurück — Werte werden
direkt zwischen Threads übertragen, ohne Pufferung.

Die Anzahl wird atomar gelesen und ist zum Zeitpunkt des Aufrufs genau, auch wenn andere Threads
gleichzeitig senden oder empfangen.

## Rückgabewerte

Die Anzahl der aktuell im Puffer vorhandenen Werte (`int`).

## Beispiele

### Beispiel #1 Pufferfüllstand überwachen

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(10);

$channel->send('a');
$channel->send('b');
$channel->send('c');

echo $channel->count();   // 3
echo count($channel);     // 3 — Countable-Interface

$channel->recv();
echo $channel->count();   // 2
```

### Beispiel #2 Kanalauslastung aus einem Monitor-Thread protokollieren

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $tasks = new ThreadChannel(100);

    // Monitor-Thread: protokolliert periodisch die Pufferauslastung
    $monitor = spawn_thread(function() use ($tasks) {
        while (!$tasks->isClosed()) {
            $pct = $tasks->capacity() > 0
                ? round($tasks->count() / $tasks->capacity() * 100)
                : 0;
            echo "Puffer: {$tasks->count()}/{$tasks->capacity()} ({$pct}%)\n";
            // In einem echten Thread würden Sie hier sleep() oder ein Semaphore verwenden
        }
    });

    // ... Produzenten- und Konsumenten-Threads ...

    $tasks->close();
    await($monitor);
});
```

## Siehe auch

- [ThreadChannel::capacity](/de/docs/reference/thread-channel/capacity.html) — Kanalkapazität
- [ThreadChannel::isEmpty](/de/docs/reference/thread-channel/is-empty.html) — Prüfen, ob der Puffer leer ist
- [ThreadChannel::isFull](/de/docs/reference/thread-channel/is-full.html) — Prüfen, ob der Puffer voll ist
- [ThreadChannel-Komponentenübersicht](/de/docs/components/thread-channels.html)
