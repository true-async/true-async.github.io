---
layout: docs
lang: de
path_key: "/docs/reference/thread-channel/is-empty.html"
nav_active: docs
permalink: /de/docs/reference/thread-channel/is-empty.html
page_title: "ThreadChannel::isEmpty()"
description: "Prüft, ob der Thread-Kanal-Puffer aktuell keine Werte enthält."
---

# ThreadChannel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isEmpty(): bool
```

Gibt `true` zurück, wenn der Kanalpuffer keine Werte enthält.

Bei einem ungepufferten Kanal (`capacity = 0`) gibt dies immer `true` zurück, da Daten
direkt zwischen Threads ohne Pufferung übertragen werden.

`isEmpty()` ist thread-sicher. Das Ergebnis spiegelt den Zustand zum Zeitpunkt des Aufrufs wider;
ein anderer Thread kann unmittelbar danach einen Wert in den Kanal legen.

## Rückgabewerte

`true` — der Puffer ist leer (keine Werte verfügbar).
`false` — der Puffer enthält mindestens einen Wert.

## Beispiele

### Beispiel #1 Vor dem Empfangen auf gepufferte Daten prüfen

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);

echo $channel->isEmpty() ? "leer" : "hat Daten"; // "leer"

$channel->send(42);

echo $channel->isEmpty() ? "leer" : "hat Daten"; // "hat Daten"

$channel->recv();

echo $channel->isEmpty() ? "leer" : "hat Daten"; // "leer"
```

### Beispiel #2 Konsument, der einen geschlossenen Kanal leert

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
        // Warten, bis etwas zu lesen ist oder der Kanal geschlossen wird
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            if ($channel->isEmpty()) {
                // Puffer momentan leer — zurückgeben und erneut versuchen
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

## Siehe auch

- [ThreadChannel::isFull](/de/docs/reference/thread-channel/is-full.html) — Prüfen, ob der Puffer voll ist
- [ThreadChannel::count](/de/docs/reference/thread-channel/count.html) — Anzahl der Werte im Puffer
- [ThreadChannel::recv](/de/docs/reference/thread-channel/recv.html) — Einen Wert empfangen
- [ThreadChannel-Komponentenübersicht](/de/docs/components/thread-channels.html)
