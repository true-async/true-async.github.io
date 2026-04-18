---
layout: docs
lang: de
path_key: "/docs/reference/thread-channel/close.html"
nav_active: docs
permalink: /de/docs/reference/thread-channel/close.html
page_title: "ThreadChannel::close()"
description: "Schließt den Thread-Kanal und signalisiert, dass keine weiteren Werte gesendet werden."
---

# ThreadChannel::close

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::close(): void
```

Schließt den Kanal. Nach dem Schließen:

- Der Aufruf von `send()` wirft eine `ChannelClosedException`.
- Der Aufruf von `recv()` gibt weiterhin bereits im Puffer vorhandene Werte zurück, bis dieser geleert ist.
  Sobald der Puffer leer ist, wirft `recv()` eine `ChannelClosedException`.
- Threads, die aktuell in `send()` oder `recv()` blockiert sind, werden entsperrt und erhalten eine
  `ChannelClosedException`.

Der Aufruf von `close()` auf einem bereits geschlossenen Kanal ist ein No-op — es wird keine Ausnahme geworfen.

`close()` ist die Standardmethode, um dem konsumierenden Ende das "Stream-Ende" zu signalisieren. Der Produzent
schließt den Kanal, nachdem alle Elemente gesendet wurden; der Konsument liest, bis er
`ChannelClosedException` auffängt.

`close()` selbst ist thread-sicher und kann von jedem Thread aus aufgerufen werden.

## Beispiele

### Beispiel #1 Produzent schließt nach dem Senden aller Elemente

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        foreach (['alpha', 'beta', 'gamma'] as $item) {
            $channel->send($item);
        }
        $channel->close(); // signalisiert: keine weiteren Daten
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                echo $channel->recv(), "\n";
            }
        } catch (\Async\ChannelClosedException) {
            echo "Stream beendet\n";
        }
    });

    await($producer);
    await($consumer);
});
```

### Beispiel #2 Close entsperrt einen wartenden Empfänger

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // ungepuffert

    // Dieser Thread blockiert in recv() und wartet auf einen Wert
    $waiter = spawn_thread(function() use ($channel) {
        try {
            $channel->recv(); // blockiert
        } catch (\Async\ChannelClosedException) {
            return "Durch close() entsperrt";
        }
    });

    // Den Kanal aus einem anderen Thread schließen — entsperrt den Wartenden
    spawn_thread(function() use ($channel) {
        $channel->close();
    });

    echo await($waiter), "\n";
});
```

### Beispiel #3 close() zweimal aufzurufen ist sicher

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);
$channel->close();
$channel->close(); // No-op, keine Ausnahme wird geworfen

echo $channel->isClosed() ? "geschlossen" : "offen"; // "geschlossen"
```

## Siehe auch

- [ThreadChannel::isClosed](/de/docs/reference/thread-channel/is-closed.html) — Prüfen, ob der Kanal geschlossen ist
- [ThreadChannel::recv](/de/docs/reference/thread-channel/recv.html) — Verbleibende Werte nach dem Schließen empfangen
- [ThreadChannel-Komponentenübersicht](/de/docs/components/thread-channels.html)
