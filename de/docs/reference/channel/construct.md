---
layout: docs
lang: de
path_key: "/docs/reference/channel/construct.html"
nav_active: docs
permalink: /de/docs/reference/channel/construct.html
page_title: "Channel::__construct"
description: "Einen neuen Channel zum Datenaustausch zwischen Coroutinen erstellen."
---

# Channel::__construct

(PHP 8.6+, True Async 1.0)

```php
public Channel::__construct(int $capacity = 0)
```

Erstellt einen neuen Channel zur Datenübergabe zwischen Coroutinen.

Ein Channel ist ein Synchronisationsprimitiv, das Coroutinen den sicheren Datenaustausch ermöglicht.
Das Verhalten des Channels hängt vom Parameter `$capacity` ab:

- **`capacity = 0`** — Rendezvous-Channel (ungepuffert). Die `send()`-Operation suspendiert den Sender,
  bis eine andere Coroutine `recv()` aufruft. Dies gewährleistet synchrone Datenübertragung.
- **`capacity > 0`** — Gepufferter Channel. Die `send()`-Operation blockiert nicht, solange im Puffer Platz ist.
  Wenn der Puffer voll ist, wird der Sender suspendiert, bis Platz frei wird.

## Parameter

**capacity**
: Die Kapazität des internen Puffers des Channels.
  `0` — Rendezvous-Channel (Standard), Senden blockiert bis zum Empfang.
  Positive Zahl — Puffergröße.

## Beispiele

### Beispiel #1 Rendezvous-Channel (ungepuffert)

```php
<?php

use Async\Channel;

$channel = new Channel(); // capacity = 0

spawn(function() use ($channel) {
    $channel->send('hello'); // Suspendiert, bis jemand recv() aufruft
    echo "Gesendet\n";
});

spawn(function() use ($channel) {
    $value = $channel->recv(); // Empfängt 'hello', entsperrt den Sender
    echo "Empfangen: $value\n";
});
```

### Beispiel #2 Gepufferter Channel

```php
<?php

use Async\Channel;

$channel = new Channel(3); // Puffer für 3 Elemente

spawn(function() use ($channel) {
    $channel->send(1); // Blockiert nicht — Puffer ist leer
    $channel->send(2); // Blockiert nicht — Platz verfügbar
    $channel->send(3); // Blockiert nicht — letzter Platz
    $channel->send(4); // Suspendiert — Puffer ist voll
});
```

## Siehe auch

- [Channel::send](/de/docs/reference/channel/send.html) — Einen Wert an den Channel senden
- [Channel::recv](/de/docs/reference/channel/recv.html) — Einen Wert vom Channel empfangen
- [Channel::capacity](/de/docs/reference/channel/capacity.html) — Die Kapazität des Channels abfragen
- [Channel::close](/de/docs/reference/channel/close.html) — Den Channel schließen
