---
layout: docs
lang: de
path_key: "/docs/reference/channel/is-full.html"
nav_active: docs
permalink: /de/docs/reference/channel/is-full.html
page_title: "Channel::isFull"
description: "Prüfen, ob der Channel-Puffer voll ist."
---

# Channel::isFull

(PHP 8.6+, True Async 1.0)

```php
public Channel::isFull(): bool
```

Prüft, ob der Channel-Puffer bis zur maximalen Kapazität gefüllt ist.

Für einen Rendezvous-Channel (`capacity = 0`) gibt diese Methode immer `true` zurück,
da kein Puffer vorhanden ist.

## Rückgabewerte

`true` — der Puffer ist voll (oder es handelt sich um einen Rendezvous-Channel).
`false` — der Puffer hat freien Platz.

## Beispiele

### Beispiel #1 Pufferfüllstand prüfen

```php
<?php

use Async\Channel;

$channel = new Channel(2);

echo $channel->isFull() ? "voll" : "hat Platz"; // "hat Platz"

$channel->send('a');
$channel->send('b');

echo $channel->isFull() ? "voll" : "hat Platz"; // "voll"
```

### Beispiel #2 Adaptive Senderate

```php
<?php

use Async\Channel;

$channel = new Channel(50);

spawn(function() use ($channel) {
    foreach (readLargeFile('data.csv') as $line) {
        if ($channel->isFull()) {
            echo "Puffer voll, Verarbeitung wird verlangsamt\n";
        }
        $channel->send($line); // Suspendiert, wenn voll
    }
    $channel->close();
});
```

## Siehe auch

- [Channel::isEmpty](/de/docs/reference/channel/is-empty.html) --- Prüfen, ob der Puffer leer ist
- [Channel::capacity](/de/docs/reference/channel/capacity.html) --- Channel-Kapazität
- [Channel::count](/de/docs/reference/channel/count.html) --- Anzahl der Werte im Puffer
- [Channel::sendAsync](/de/docs/reference/channel/send-async.html) --- Nicht-blockierendes Senden
