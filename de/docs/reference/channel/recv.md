---
layout: docs
lang: de
path_key: "/docs/reference/channel/recv.html"
nav_active: docs
permalink: /de/docs/reference/channel/recv.html
page_title: "Channel::recv"
description: "Einen Wert vom Channel empfangen (blockierende Operation)."
---

# Channel::recv

(PHP 8.6+, True Async 1.0)

```php
public Channel::recv(int $timeoutMs = 0): mixed
```

Empfängt den nächsten Wert vom Channel. Dies ist eine blockierende Operation — die aktuelle
Coroutine wird suspendiert, wenn keine Werte im Channel verfügbar sind.

Wenn der Channel geschlossen und der Puffer leer ist, wird eine `ChannelException` ausgelöst.
Wenn der Channel geschlossen ist, aber noch Werte im Puffer sind, werden diese zurückgegeben.

## Parameter

**timeoutMs**
: Maximale Wartezeit in Millisekunden.
  `0` — unbegrenzt warten (Standard).
  Bei Überschreitung des Timeouts wird eine `TimeoutException` ausgelöst.

## Rückgabewerte

Der nächste Wert aus dem Channel (`mixed`).

## Fehler

- Löst `Async\ChannelException` aus, wenn der Channel geschlossen und der Puffer leer ist.
- Löst `Async\TimeoutException` aus, wenn das Timeout abgelaufen ist.

## Beispiele

### Beispiel #1 Werte von einem Channel empfangen

```php
<?php

use Async\Channel;

$channel = new Channel(5);

spawn(function() use ($channel) {
    for ($i = 1; $i <= 5; $i++) {
        $channel->send($i);
    }
    $channel->close();
});

spawn(function() use ($channel) {
    try {
        while (true) {
            $value = $channel->recv();
            echo "Empfangen: $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "Channel geschlossen und leer\n";
    }
});
```

### Beispiel #2 Empfangen mit Timeout

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $value = $channel->recv(timeoutMs: 2000);
        echo "Empfangen: $value\n";
    } catch (\Async\TimeoutException) {
        echo "Keine Daten innerhalb von 2 Sekunden empfangen\n";
    }
});
```

## Siehe auch

- [Channel::recvAsync](/de/docs/reference/channel/recv-async.html) — Nicht-blockierendes Empfangen
- [Channel::send](/de/docs/reference/channel/send.html) — Einen Wert an den Channel senden
- [Channel::isEmpty](/de/docs/reference/channel/is-empty.html) — Prüfen, ob der Puffer leer ist
- [Channel::getIterator](/de/docs/reference/channel/get-iterator.html) — Den Channel mit foreach iterieren
