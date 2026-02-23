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
public Channel::recv(?Completable $cancellationToken = null): mixed
```

Empfängt den nächsten Wert vom Channel. Dies ist eine blockierende Operation — die aktuelle
Coroutine wird suspendiert, wenn keine Werte im Channel verfügbar sind.

Wenn der Channel geschlossen und der Puffer leer ist, wird eine `ChannelException` ausgelöst.
Wenn der Channel geschlossen ist, aber noch Werte im Puffer sind, werden diese zurückgegeben.

## Parameter

**cancellationToken**
: Abbruch-Token (`Completable`), das den Abbruch des Wartens nach beliebigen Bedingungen ermöglicht.
  `null` — unbegrenzt warten (Standard).
  Wenn das Token abgeschlossen wird, wird die Operation abgebrochen und eine `CancelledException` ausgelöst.
  Für zeitbasierte Begrenzungen kann `Async\timeout()` verwendet werden.

## Rückgabewerte

Der nächste Wert aus dem Channel (`mixed`).

## Fehler

- Löst `Async\ChannelException` aus, wenn der Channel geschlossen und der Puffer leer ist.
- Löst `Async\CancelledException` aus, wenn das Abbruch-Token abgeschlossen wurde.

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
        $value = $channel->recv(Async\timeout(2000));
        echo "Empfangen: $value\n";
    } catch (\Async\CancelledException) {
        echo "Keine Daten innerhalb von 2 Sekunden empfangen\n";
    }
});
```

### Beispiel #3 Empfangen mit benutzerdefiniertem Abbruch-Token

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel();
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $value = $channel->recv($cancel);
        echo "Empfangen: $value\n";
    } catch (\Async\CancelledException) {
        echo "Empfang abgebrochen\n";
    }
});

// Aus einer anderen Coroutine abbrechen
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## Siehe auch

- [Channel::recvAsync](/de/docs/reference/channel/recv-async.html) — Nicht-blockierendes Empfangen
- [Channel::send](/de/docs/reference/channel/send.html) — Einen Wert an den Channel senden
- [Channel::isEmpty](/de/docs/reference/channel/is-empty.html) — Prüfen, ob der Puffer leer ist
- [Channel::getIterator](/de/docs/reference/channel/get-iterator.html) — Den Channel mit foreach iterieren
