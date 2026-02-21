---
layout: docs
lang: de
path_key: "/docs/reference/channel/capacity.html"
nav_active: docs
permalink: /de/docs/reference/channel/capacity.html
page_title: "Channel::capacity"
description: "Die Pufferkapazität des Channels abfragen."
---

# Channel::capacity

(PHP 8.6+, True Async 1.0)

```php
public Channel::capacity(): int
```

Gibt die bei der Erstellung über den Konstruktor festgelegte Kapazität des Channels zurück.

- `0` — Rendezvous-Channel (ungepuffert).
- Positive Zahl — maximale Puffergröße.

Der Wert ändert sich während der Lebensdauer des Channels nicht.

## Rückgabewerte

Die Pufferkapazität des Channels (`int`).

## Beispiele

### Beispiel #1 Kapazität abfragen

```php
<?php

use Async\Channel;

$rendezvous = new Channel();
echo $rendezvous->capacity(); // 0

$buffered = new Channel(100);
echo $buffered->capacity(); // 100
```

### Beispiel #2 Adaptive Logik basierend auf dem Channel-Typ

```php
<?php

use Async\Channel;

function processChannel(Channel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Rendezvous-Channel: Jedes Senden wartet auf einen Empfänger\n";
    } else {
        echo "Gepufferter Channel: Kapazität {$ch->capacity()}\n";
        echo "Frei: " . ($ch->capacity() - $ch->count()) . " Plätze\n";
    }
}
```

## Siehe auch

- [Channel::__construct](/de/docs/reference/channel/construct.html) — Einen Channel erstellen
- [Channel::count](/de/docs/reference/channel/count.html) — Anzahl der Werte im Puffer
- [Channel::isFull](/de/docs/reference/channel/is-full.html) — Prüfen, ob der Puffer voll ist
