---
layout: docs
lang: de
path_key: "/docs/reference/channel/get-iterator.html"
nav_active: docs
permalink: /de/docs/reference/channel/get-iterator.html
page_title: "Channel::getIterator"
description: "Einen Iterator zum Durchlaufen der Channel-Werte mit foreach erhalten."
---

# Channel::getIterator

(PHP 8.6+, True Async 1.0)

```php
public Channel::getIterator(): \Iterator
```

Gibt einen Iterator zum Durchlaufen der Channel-Werte zurück. Channel implementiert
das `IteratorAggregate`-Interface, sodass Sie `foreach` direkt verwenden können.

Der Iterator suspendiert die aktuelle Coroutine, während er auf den nächsten Wert wartet.
Die Iteration endet, wenn der Channel geschlossen **und** der Puffer leer ist.

> **Wichtig:** Wenn der Channel nie geschlossen wird, wartet `foreach` unbegrenzt auf neue Werte.

## Rückgabewerte

Ein `\Iterator`-Objekt zum Durchlaufen der Channel-Werte.

## Beispiele

### Beispiel #1 Einen Channel mit foreach lesen

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $channel->send('eins');
    $channel->send('zwei');
    $channel->send('drei');
    $channel->close(); // Ohne dies wird foreach nie enden
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Empfangen: $value\n";
    }
    echo "Alle Werte verarbeitet\n";
});
```

### Beispiel #2 Producer-Consumer-Muster

```php
<?php

use Async\Channel;

$jobs = new Channel(20);

// Produzent
spawn(function() use ($jobs) {
    $urls = ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'];

    foreach ($urls as $url) {
        $jobs->send($url);
    }
    $jobs->close();
});

// Konsument
spawn(function() use ($jobs) {
    foreach ($jobs as $url) {
        $response = httpGet($url);
        echo "Heruntergeladen: $url ({$response->status})\n";
    }
});
```

## Siehe auch

- [Channel::recv](/de/docs/reference/channel/recv.html) --- Einen einzelnen Wert empfangen
- [Channel::close](/de/docs/reference/channel/close.html) --- Den Channel schließen (beendet die Iteration)
- [Channel::isEmpty](/de/docs/reference/channel/is-empty.html) --- Prüfen, ob der Puffer leer ist
