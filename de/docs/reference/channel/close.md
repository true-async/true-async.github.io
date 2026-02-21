---
layout: docs
lang: de
path_key: "/docs/reference/channel/close.html"
nav_active: docs
permalink: /de/docs/reference/channel/close.html
page_title: "Channel::close"
description: "Den Channel für weiteres Senden von Daten schließen."
---

# Channel::close

(PHP 8.6+, True Async 1.0)

```php
public Channel::close(): void
```

Schließt den Channel. Nach dem Schließen:

- Der Aufruf von `send()` löst eine `ChannelException` aus.
- Der Aufruf von `recv()` gibt weiterhin Werte aus dem Puffer zurück, bis dieser leer ist.
  Danach löst `recv()` eine `ChannelException` aus.
- Alle Coroutinen, die in `send()` oder `recv()` warten, erhalten eine `ChannelException`.
- Die Iteration über `foreach` endet, wenn der Puffer leer ist.

Ein erneuter Aufruf von `close()` auf einem bereits geschlossenen Channel verursacht keine Fehler.

## Beispiele

### Beispiel #1 Einen Channel nach dem Senden von Daten schließen

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    for ($i = 0; $i < 5; $i++) {
        $channel->send($i);
    }
    $channel->close(); // Signal an den Empfänger, dass keine weiteren Daten kommen
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Empfangen: $value\n";
    }
    // foreach endet nach dem Schließen und Leeren des Puffers
    echo "Channel erschöpft\n";
});
```

### Beispiel #2 Behandlung des Schließens durch wartende Coroutinen

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $channel->send('data'); // Wartet auf einen Empfänger
    } catch (\Async\ChannelException $e) {
        echo "Channel geschlossen: {$e->getMessage()}\n";
    }
});

spawn(function() use ($channel) {
    delay(100); // Kurze Verzögerung
    $channel->close(); // Entsperrt den Sender mit einer Ausnahme
});
```

## Siehe auch

- [Channel::isClosed](/de/docs/reference/channel/is-closed.html) — Prüfen, ob der Channel geschlossen ist
- [Channel::recv](/de/docs/reference/channel/recv.html) — Einen Wert empfangen (leert den Puffer)
- [Channel::getIterator](/de/docs/reference/channel/get-iterator.html) — Iterieren bis zum Schließen
