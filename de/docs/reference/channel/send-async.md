---
layout: docs
lang: de
path_key: "/docs/reference/channel/send-async.html"
nav_active: docs
permalink: /de/docs/reference/channel/send-async.html
page_title: "Channel::sendAsync"
description: "Nicht-blockierendes Senden eines Werts an den Channel."
---

# Channel::sendAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::sendAsync(mixed $value): bool
```

Führt einen nicht-blockierenden Versuch durch, einen Wert an den Channel zu senden.
Im Gegensatz zu `send()` **suspendiert** diese Methode die Coroutine **nie**.

Gibt `true` zurück, wenn der Wert erfolgreich gesendet wurde (im Puffer abgelegt
oder an einen wartenden Empfänger übergeben). Gibt `false` zurück, wenn der Puffer voll
oder der Channel geschlossen ist.

## Parameter

**value**
: Der zu sendende Wert. Kann von beliebigem Typ sein.

## Rückgabewerte

`true` — der Wert wurde erfolgreich gesendet.
`false` — der Channel ist voll oder geschlossen, der Wert wurde nicht gesendet.

## Beispiele

### Beispiel #1 Versuch eines nicht-blockierenden Sendens

```php
<?php

use Async\Channel;

$channel = new Channel(2);

$channel->sendAsync('a'); // true — Puffer ist leer
$channel->sendAsync('b'); // true — Platz verfügbar
$result = $channel->sendAsync('c'); // false — Puffer ist voll

echo $result ? "Gesendet" : "Channel voll"; // "Channel voll"
```

### Beispiel #2 Senden mit Verfügbarkeitsprüfung

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $data = generateBatch();

    foreach ($data as $item) {
        if (!$channel->sendAsync($item)) {
            // Puffer ist voll — auf blockierendes Senden zurückfallen
            $channel->send($item);
        }
    }

    $channel->close();
});
```

## Siehe auch

- [Channel::send](/de/docs/reference/channel/send.html) — Blockierendes Senden
- [Channel::isFull](/de/docs/reference/channel/is-full.html) — Prüfen, ob der Puffer voll ist
- [Channel::isClosed](/de/docs/reference/channel/is-closed.html) — Prüfen, ob der Channel geschlossen ist
