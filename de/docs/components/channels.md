---
layout: docs
lang: de
path_key: "/docs/components/channels.html"
nav_active: docs
permalink: /de/docs/components/channels.html
page_title: "Channels"
description: "Channels in TrueAsync -- sicherer Datentransfer zwischen Koroutinen, Aufgabenwarteschlangen und Backpressure."
---

# Channels

Channels sind für die Kommunikation in einer Multithread-Umgebung nützlicher
als in einer Single-Thread-Umgebung. Sie dienen dem sicheren Datentransfer von einer Koroutine zur anderen.
Wenn Sie gemeinsame Daten ändern müssen,
ist es in einer Single-Thread-Umgebung einfacher, ein Objekt an verschiedene Koroutinen zu übergeben, als einen Channel zu erstellen.

Channels sind jedoch in folgenden Szenarien nützlich:
* Organisation einer Aufgabenwarteschlange mit Limits
* Organisation von Objekt-Pools (es wird empfohlen, das dedizierte `Async\Pool`-Primitiv zu verwenden)
* Synchronisation

Zum Beispiel gibt es viele URLs zu crawlen, aber maximal N gleichzeitige Verbindungen:

```php
use Async\Channel;
use Async\Scope;

const MAX_CONNECTIONS = 10;
const MAX_QUEUE = 100;

$tasks = new Scope();
$channel = new Channel(MAX_QUEUE);

for($i = 0; $i < MAX_CONNECTIONS; $i++) {
    $tasks->spawn(function() use ($channel) {
        while (!$channel->isClosed()) {
            $url = $channel->recv();
            $content = file_get_contents($url);
            echo "Fetched page {$url}, length: " . strlen($content) . "\n";
        }
    });
}

// Channel mit Werten füllen
for($i = 0; $i < MAX_CONNECTIONS * 2; $i++) {
    $channel->send("https://example.com/{$i}");
}
```

Die Konstante `MAX_QUEUE` in diesem Beispiel fungiert als Begrenzer für den Produzenten und erzeugt Backpressure --
eine Situation, in der der Produzent keine Daten senden kann, bis der Konsument Platz im Channel freigibt.

## Ungepufferter Channel (Rendezvous)

Ein Channel mit Puffergröße `0` arbeitet im Rendezvous-Modus: `send()` blockiert, bis eine andere Koroutine `recv()` aufruft, und umgekehrt. Dies gewährleistet strikte Synchronisation:

```php
use Async\Channel;

$ch = new Channel(0); // Rendezvous-Channel

spawn(function() use ($ch) {
    echo "Sender: before send\n";
    $ch->send("hello");
    echo "Sender: send completed\n"; // Erst nach recv()
});

spawn(function() use ($ch) {
    echo "Receiver: before recv\n";
    $value = $ch->recv();
    echo "Receiver: got $value\n";
});
```

## Timeouts bei Operationen

Die Methoden `recv()` und `send()` akzeptieren einen optionalen Timeout-Parameter in Millisekunden. Wenn die Zeit abläuft, wird eine `TimeoutException` geworfen:

```php
use Async\Channel;
use Async\TimeoutException;

$ch = new Channel(0);

spawn(function() use ($ch) {
    try {
        $ch->recv(50); // Maximal 50 ms warten
    } catch (TimeoutException $e) {
        echo "Nobody sent data within 50 ms\n";
    }
});

spawn(function() use ($ch) {
    try {
        $ch->send("data", 50); // Maximal 50 ms auf Empfänger warten
    } catch (TimeoutException $e) {
        echo "Nobody received the data within 50 ms\n";
    }
});
```

## Konkurrierende Empfänger

Wenn mehrere Koroutinen auf `recv()` auf demselben Channel warten, erhält jeder Wert nur **eine** von ihnen. Werte werden nicht dupliziert:

```php
use Async\Channel;

$ch = new Channel(0);

// Sender
spawn(function() use ($ch) {
    for ($i = 1; $i <= 3; $i++) {
        $ch->send($i);
    }
    $ch->close();
});

// Empfänger A
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "A received: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Empfänger B
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "B received: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Jeder Wert (1, 2, 3) wird nur von A oder B empfangen, aber nicht von beiden
```

Dieses Muster ist nützlich für die Implementierung von Worker-Pools, bei denen mehrere Koroutinen um Aufgaben aus einer gemeinsamen Warteschlange konkurrieren.
