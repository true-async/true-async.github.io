---
layout: docs
lang: de
path_key: "/docs/reference/channel/send.html"
nav_active: docs
permalink: /de/docs/reference/channel/send.html
page_title: "Channel::send"
description: "Einen Wert an den Channel senden (blockierende Operation)."
---

# Channel::send

(PHP 8.6+, True Async 1.0)

```php
public Channel::send(mixed $value, int $timeoutMs = 0): void
```

Sendet einen Wert an den Channel. Dies ist eine blockierende Operation — die aktuelle Coroutine wird suspendiert,
wenn der Channel den Wert nicht sofort annehmen kann.

Bei einem **Rendezvous-Channel** (`capacity = 0`) wartet der Sender, bis eine andere Coroutine `recv()` aufruft.
Bei einem **gepufferten Channel** wartet der Sender nur, wenn der Puffer voll ist.

## Parameter

**value**
: Der zu sendende Wert. Kann von beliebigem Typ sein.

**timeoutMs**
: Maximale Wartezeit in Millisekunden.
  `0` — unbegrenzt warten (Standard).
  Bei Überschreitung des Timeouts wird eine `TimeoutException` ausgelöst.

## Fehler

- Löst `Async\ChannelException` aus, wenn der Channel geschlossen ist.
- Löst `Async\TimeoutException` aus, wenn das Timeout abgelaufen ist.

## Beispiele

### Beispiel #1 Werte an einen Channel senden

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('first');  // Im Puffer abgelegt
    $channel->send('second'); // Wartet, bis Platz frei wird
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "first"
    echo $channel->recv() . "\n"; // "second"
});
```

### Beispiel #2 Senden mit Timeout

```php
<?php

use Async\Channel;

$channel = new Channel(0); // Rendezvous

spawn(function() use ($channel) {
    try {
        $channel->send('data', timeoutMs: 1000);
    } catch (\Async\TimeoutException $e) {
        echo "Timeout: Niemand hat den Wert innerhalb von 1 Sekunde angenommen\n";
    }
});
```

## Siehe auch

- [Channel::sendAsync](/de/docs/reference/channel/send-async.html) — Nicht-blockierendes Senden
- [Channel::recv](/de/docs/reference/channel/recv.html) — Einen Wert vom Channel empfangen
- [Channel::isFull](/de/docs/reference/channel/is-full.html) — Prüfen, ob der Puffer voll ist
- [Channel::close](/de/docs/reference/channel/close.html) — Den Channel schließen
