---
layout: docs
lang: de
path_key: "/docs/reference/channel/is-closed.html"
nav_active: docs
permalink: /de/docs/reference/channel/is-closed.html
page_title: "Channel::isClosed"
description: "Prüfen, ob der Channel geschlossen ist."
---

# Channel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Channel::isClosed(): bool
```

Prüft, ob der Channel durch einen `close()`-Aufruf geschlossen wurde.

Ein geschlossener Channel akzeptiert keine neuen Werte über `send()`, erlaubt aber
das Lesen verbleibender Werte aus dem Puffer über `recv()`.

## Rückgabewerte

`true` — der Channel ist geschlossen.
`false` — der Channel ist offen.

## Beispiele

### Beispiel #1 Channel-Status prüfen

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isClosed() ? "geschlossen" : "offen"; // "offen"

$channel->send('data');
$channel->close();

echo $channel->isClosed() ? "geschlossen" : "offen"; // "geschlossen"

// Der Puffer kann auch nach dem Schließen noch gelesen werden
$value = $channel->recv(); // "data"
```

### Beispiel #2 Bedingtes Senden

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    while (!$channel->isClosed()) {
        $data = produceData();
        $channel->send($data);
        delay(100);
    }
    echo "Channel geschlossen, Senden wird gestoppt\n";
});
```

## Siehe auch

- [Channel::close](/de/docs/reference/channel/close.html) — Den Channel schließen
- [Channel::isEmpty](/de/docs/reference/channel/is-empty.html) — Prüfen, ob der Puffer leer ist
