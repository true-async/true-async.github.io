---
layout: docs
lang: de
path_key: "/docs/reference/thread-channel/capacity.html"
nav_active: docs
permalink: /de/docs/reference/thread-channel/capacity.html
page_title: "ThreadChannel::capacity()"
description: "Gibt die Pufferkapazität des Thread-Kanals zurück."
---

# ThreadChannel::capacity

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::capacity(): int
```

Gibt die zum Zeitpunkt der Erstellung festgelegte Kanalkapazität zurück.

- `0` — ungepufferter (synchroner) Kanal: `send()` blockiert, bis der Empfänger bereit ist.
- Positive Zahl — maximale Anzahl von Werten, die der Puffer gleichzeitig halten kann.

Die Kapazität ist für die gesamte Lebensdauer des Kanals festgelegt und ändert sich nicht.

## Rückgabewerte

Die Pufferkapazität des Kanals (`int`).

## Beispiele

### Beispiel #1 Kapazität prüfen

```php
<?php

use Async\ThreadChannel;

$unbuffered = new ThreadChannel();
echo $unbuffered->capacity(); // 0

$buffered = new ThreadChannel(64);
echo $buffered->capacity(); // 64
```

### Beispiel #2 Adaptive Logik basierend auf dem Kanaltyp

```php
<?php

use Async\ThreadChannel;

function describeChannel(ThreadChannel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Ungepuffert: jedes send() blockiert, bis recv() aufgerufen wird\n";
    } else {
        $free = $ch->capacity() - $ch->count();
        echo "Gepuffert: Kapazität {$ch->capacity()}, {$free} Slot(s) frei\n";
    }
}

$ch = new ThreadChannel(8);
$ch->send('item');
describeChannel($ch); // "Gepuffert: Kapazität 8, 7 Slot(s) frei"
```

## Siehe auch

- [ThreadChannel::__construct](/de/docs/reference/thread-channel/__construct.html) — Einen Kanal erstellen
- [ThreadChannel::count](/de/docs/reference/thread-channel/count.html) — Anzahl der aktuell gepufferten Werte
- [ThreadChannel::isFull](/de/docs/reference/thread-channel/is-full.html) — Prüfen, ob der Puffer voll ist
- [ThreadChannel-Komponentenübersicht](/de/docs/components/thread-channels.html)
