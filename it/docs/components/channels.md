---
layout: docs
lang: it
path_key: "/docs/components/channels.html"
nav_active: docs
permalink: /it/docs/components/channels.html
page_title: "Canali"
description: "Canali in TrueAsync -- trasferimento sicuro di dati tra coroutine, code di task e contropressione."
---

# Canali

I canali sono più utili per la comunicazione in un ambiente multithread
rispetto a uno single-thread. Servono per il trasferimento sicuro di dati da una coroutine a un'altra.
Se devi modificare dati condivisi,
in un ambiente single-thread è più semplice passare un oggetto a diverse coroutine piuttosto che creare un canale.

Tuttavia, i canali sono utili nei seguenti scenari:
* organizzare una coda di task con limiti
* organizzare pool di oggetti (si raccomanda di usare la primitiva dedicata `Async\Pool`)
* sincronizzazione

Per esempio, ci sono molti URL da scansionare, ma non più di N connessioni simultanee:

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
            echo "Pagina scaricata {$url}, lunghezza: " . strlen($content) . "\n";
        }
    });
}

// Riempi il canale con valori
for($i = 0; $i < MAX_CONNECTIONS * 2; $i++) {
    $channel->send("https://example.com/{$i}");
}
```

La costante `MAX_QUEUE` in questo esempio funge da limitatore per il produttore, creando contropressione --
una situazione in cui il produttore non può inviare dati finché il consumatore non libera spazio nel canale.

## Canale Non Bufferizzato (Rendezvous)

Un canale con dimensione del buffer `0` funziona in modalità rendezvous: `send()` blocca finché un'altra coroutine non chiama `recv()`, e viceversa. Questo garantisce una sincronizzazione rigorosa:

```php
use Async\Channel;

$ch = new Channel(0); // Canale rendezvous

spawn(function() use ($ch) {
    echo "Mittente: prima di send\n";
    $ch->send("ciao");
    echo "Mittente: send completato\n"; // Solo dopo recv()
});

spawn(function() use ($ch) {
    echo "Ricevitore: prima di recv\n";
    $value = $ch->recv();
    echo "Ricevitore: ricevuto $value\n";
});
```

## Timeout sulle Operazioni

I metodi `recv()` e `send()` accettano un parametro opzionale di timeout in millisecondi. Quando il tempo scade, viene lanciata una `TimeoutException`:

```php
use Async\Channel;
use Async\TimeoutException;

$ch = new Channel(0);

spawn(function() use ($ch) {
    try {
        $ch->recv(50); // Attendi non più di 50 ms
    } catch (TimeoutException $e) {
        echo "Nessuno ha inviato dati entro 50 ms\n";
    }
});

spawn(function() use ($ch) {
    try {
        $ch->send("data", 50); // Attendi un ricevitore non più di 50 ms
    } catch (TimeoutException $e) {
        echo "Nessuno ha ricevuto i dati entro 50 ms\n";
    }
});
```

## Ricevitori in Competizione

Se più coroutine sono in attesa su `recv()` sullo stesso canale, ogni valore viene ricevuto da **una sola** di esse. I valori non vengono duplicati:

```php
use Async\Channel;

$ch = new Channel(0);

// Mittente
spawn(function() use ($ch) {
    for ($i = 1; $i <= 3; $i++) {
        $ch->send($i);
    }
    $ch->close();
});

// Ricevitore A
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "A ha ricevuto: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Ricevitore B
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "B ha ricevuto: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Ogni valore (1, 2, 3) verrà ricevuto solo da A o B, ma non da entrambi
```

Questo pattern è utile per implementare pool di worker, dove più coroutine competono per i task da una coda condivisa.
