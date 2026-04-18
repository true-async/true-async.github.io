---
layout: docs
lang: de
path_key: "/docs/reference/thread-channel/is-full.html"
nav_active: docs
permalink: /de/docs/reference/thread-channel/is-full.html
page_title: "ThreadChannel::isFull()"
description: "Prüft, ob der Thread-Kanal-Puffer seine maximale Kapazität erreicht hat."
---

# ThreadChannel::isFull

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isFull(): bool
```

Gibt `true` zurück, wenn der Kanalpuffer seine maximale Kapazität erreicht hat.

Bei einem ungepufferten Kanal (`capacity = 0`) gibt dies immer `true` zurück, da es
keinen Puffer gibt — jedes `send()` muss auf ein passendes `recv()` warten.

`isFull()` ist thread-sicher. Das Ergebnis spiegelt den Zustand zum Zeitpunkt des Aufrufs wider;
ein anderer Thread kann unmittelbar danach einen Slot leeren.

## Rückgabewerte

`true` — der Puffer ist an seiner Kapazitätsgrenze (oder es ist ein ungepufferter Kanal).
`false` — der Puffer hat mindestens einen freien Slot.

## Beispiele

### Beispiel #1 Pufferfüllstand vor dem Senden prüfen

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(3);

echo $channel->isFull() ? "voll" : "hat Platz"; // "hat Platz"

$channel->send('x');
$channel->send('y');
$channel->send('z');

echo $channel->isFull() ? "voll" : "hat Platz"; // "voll"
```

### Beispiel #2 Gegendruck-Überwachung in einem Produzenten-Thread

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
                // Puffer ist aktuell voll — send() wird blockieren;
                // Gegendruck für Beobachtbarkeit protokollieren
                error_log("ThreadChannel Gegendruck: Puffer voll");
            }
            $channel->send($item); // blockiert, bis Platz verfügbar ist
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                // Langsamen Konsumenten simulieren
                $val = $channel->recv();
                // $val verarbeiten ...
            }
        } catch (\Async\ChannelClosedException) {
            echo "Fertig\n";
        }
    });

    await($producer);
    await($consumer);
});
```

## Siehe auch

- [ThreadChannel::isEmpty](/de/docs/reference/thread-channel/is-empty.html) — Prüfen, ob der Puffer leer ist
- [ThreadChannel::capacity](/de/docs/reference/thread-channel/capacity.html) — Kanalkapazität
- [ThreadChannel::count](/de/docs/reference/thread-channel/count.html) — Anzahl der Werte im Puffer
- [ThreadChannel::send](/de/docs/reference/thread-channel/send.html) — Einen Wert senden (blockiert, wenn voll)
- [ThreadChannel-Komponentenübersicht](/de/docs/components/thread-channels.html)
