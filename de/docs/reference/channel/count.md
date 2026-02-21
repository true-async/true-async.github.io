---
layout: docs
lang: de
path_key: "/docs/reference/channel/count.html"
nav_active: docs
permalink: /de/docs/reference/channel/count.html
page_title: "Channel::count"
description: "Die Anzahl der Werte im Channel-Puffer abfragen."
---

# Channel::count

(PHP 8.6+, True Async 1.0)

```php
public Channel::count(): int
```

Gibt die aktuelle Anzahl der Werte im Channel-Puffer zurück.

Channel implementiert das `Countable`-Interface, sodass Sie `count($channel)` verwenden können.

Für einen Rendezvous-Channel (`capacity = 0`) gibt diese Methode immer `0` zurück.

## Rückgabewerte

Die Anzahl der Werte im Puffer (`int`).

## Beispiele

### Beispiel #1 Füllstand des Puffers überwachen

```php
<?php

use Async\Channel;

$channel = new Channel(5);

$channel->send(1);
$channel->send(2);
$channel->send(3);

echo count($channel);        // 3
echo $channel->count();      // 3

$channel->recv();
echo count($channel);        // 2
```

### Beispiel #2 Channel-Auslastung protokollieren

```php
<?php

use Async\Channel;

$tasks = new Channel(100);

spawn(function() use ($tasks) {
    while (!$tasks->isClosed()) {
        $usage = $tasks->count() / $tasks->capacity() * 100;
        echo "Puffer ist zu " . round($usage) . "% gefüllt\n";
        delay(1000);
    }
});
```

## Siehe auch

- [Channel::capacity](/de/docs/reference/channel/capacity.html) --- Channel-Kapazität
- [Channel::isEmpty](/de/docs/reference/channel/is-empty.html) --- Prüfen, ob der Puffer leer ist
- [Channel::isFull](/de/docs/reference/channel/is-full.html) --- Prüfen, ob der Puffer voll ist
