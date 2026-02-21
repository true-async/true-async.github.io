---
layout: docs
lang: de
path_key: "/docs/reference/channel/is-empty.html"
nav_active: docs
permalink: /de/docs/reference/channel/is-empty.html
page_title: "Channel::isEmpty"
description: "Prüfen, ob der Channel-Puffer leer ist."
---

# Channel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public Channel::isEmpty(): bool
```

Prüft, ob der Channel-Puffer leer ist (keine Werte zum Empfangen verfügbar).

Für einen Rendezvous-Channel (`capacity = 0`) gibt diese Methode immer `true` zurück,
da Daten direkt ohne Pufferung übertragen werden.

## Rückgabewerte

`true` — der Puffer ist leer.
`false` — der Puffer enthält Werte.

## Beispiele

### Beispiel #1 Auf verfügbare Daten prüfen

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isEmpty() ? "leer" : "hat Daten"; // "leer"

$channel->send(42);

echo $channel->isEmpty() ? "leer" : "hat Daten"; // "hat Daten"
```

### Beispiel #2 Stapelweise Datenverarbeitung

```php
<?php

use Async\Channel;

$channel = new Channel(100);

spawn(function() use ($channel) {
    while (!$channel->isClosed() || !$channel->isEmpty()) {
        if ($channel->isEmpty()) {
            delay(50); // Auf eingehende Daten warten
            continue;
        }

        $batch = [];
        while (!$channel->isEmpty() && count($batch) < 10) {
            $batch[] = $channel->recv();
        }

        processBatch($batch);
    }
});
```

## Siehe auch

- [Channel::isFull](/de/docs/reference/channel/is-full.html) --- Prüfen, ob der Puffer voll ist
- [Channel::count](/de/docs/reference/channel/count.html) --- Anzahl der Werte im Puffer
- [Channel::recv](/de/docs/reference/channel/recv.html) --- Einen Wert empfangen
