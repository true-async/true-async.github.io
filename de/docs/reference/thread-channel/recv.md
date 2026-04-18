---
layout: docs
lang: de
path_key: "/docs/reference/thread-channel/recv.html"
nav_active: docs
permalink: /de/docs/reference/thread-channel/recv.html
page_title: "ThreadChannel::recv()"
description: "Empfängt den nächsten Wert vom Thread-Kanal und blockiert den aufrufenden Thread, wenn kein Wert verfügbar ist."
---

# ThreadChannel::recv

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::recv(): mixed
```

Empfängt den nächsten Wert vom Kanal. Dies ist eine **blockierende** Operation — der aufrufende Thread
wird blockiert, wenn aktuell keine Werte im Kanal verfügbar sind.

- Bei einem **gepufferten Kanal** gibt `recv()` sofort zurück, wenn der Puffer mindestens einen Wert enthält.
  Wenn der Puffer leer ist, blockiert der Thread, bis ein Sender einen Wert platziert.
- Bei einem **ungepufferten Kanal** (`capacity = 0`) blockiert `recv()`, bis ein anderer Thread `send()` aufruft.

Wenn der Kanal geschlossen ist und der Puffer noch Werte enthält, werden diese Werte normal zurückgegeben.
Sobald der Puffer geleert ist und der Kanal geschlossen ist, wirft `recv()` `ChannelClosedException`.

Der empfangene Wert ist eine **tiefe Kopie** des Originals — Änderungen am zurückgegebenen Wert
wirken sich nicht auf die Kopie des Senders aus.

## Rückgabewerte

Der nächste Wert aus dem Kanal (`mixed`).

## Fehler

- Wirft `Async\ChannelClosedException`, wenn der Kanal geschlossen und der Puffer leer ist.

## Beispiele

### Beispiel #1 Werte empfangen, die von einem Worker-Thread produziert werden

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
            $channel->send($i * 10);
        }
        $channel->close();
    });

    // Alle Werte empfangen — blockiert, wenn Puffer leer ist
    try {
        while (true) {
            echo $channel->recv(), "\n";
        }
    } catch (\Async\ChannelClosedException) {
        echo "Alle Werte empfangen\n";
    }

    await($worker);
});
```

### Beispiel #2 Konsumenten-Thread leert einen gemeinsamen Kanal

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    // Produzent: füllt den Kanal aus einem Thread
    $producer = spawn_thread(function() use ($channel) {
        foreach (range('a', 'e') as $letter) {
            $channel->send($letter);
        }
        $channel->close();
    });

    // Konsument: leert den Kanal aus einem anderen Thread
    $consumer = spawn_thread(function() use ($channel) {
        $collected = [];
        try {
            while (true) {
                $collected[] = $channel->recv();
            }
        } catch (\Async\ChannelClosedException) {
            // Puffer geleert und Kanal geschlossen
        }
        return $collected;
    });

    await($producer);
    $result = await($consumer);
    echo implode(', ', $result), "\n"; // "a, b, c, d, e"
});
```

### Beispiel #3 Empfangen von einem ungepufferten Kanal

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // ungepuffert

    $sender = spawn_thread(function() use ($channel) {
        // Blockiert hier, bis der Haupt-Thread recv() aufruft
        $channel->send(['task' => 'compress', 'file' => '/tmp/data.bin']);
    });

    // Haupt-Coroutine (Thread) ruft recv() auf — entsperrt den Sender
    $task = $channel->recv();
    echo "Aufgabe erhalten: {$task['task']} für {$task['file']}\n";

    await($sender);
});
```

## Siehe auch

- [ThreadChannel::send](/de/docs/reference/thread-channel/send.html) — Einen Wert an den Kanal senden
- [ThreadChannel::isEmpty](/de/docs/reference/thread-channel/is-empty.html) — Prüfen, ob der Puffer leer ist
- [ThreadChannel::close](/de/docs/reference/thread-channel/close.html) — Den Kanal schließen
- [ThreadChannel-Komponentenübersicht](/de/docs/components/thread-channels.html)
