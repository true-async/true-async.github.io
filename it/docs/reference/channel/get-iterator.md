---
layout: docs
lang: it
path_key: "/docs/reference/channel/get-iterator.html"
nav_active: docs
permalink: /it/docs/reference/channel/get-iterator.html
page_title: "Channel::getIterator"
description: "Ottiene un iteratore per attraversare i valori del canale con foreach."
---

# Channel::getIterator

(PHP 8.6+, True Async 1.0)

```php
public Channel::getIterator(): \Iterator
```

Restituisce un iteratore per attraversare i valori del canale. Channel implementa
l'interfaccia `IteratorAggregate`, quindi e' possibile usare `foreach` direttamente.

L'iteratore sospende la coroutine corrente in attesa del prossimo valore.
L'iterazione termina quando il canale e' chiuso **e** il buffer e' vuoto.

> **Importante:** Se il canale non viene mai chiuso, `foreach` attendera' nuovi valori indefinitamente.

## Valori di ritorno

Un oggetto `\Iterator` per attraversare i valori del canale.

## Esempi

### Esempio #1 Lettura di un canale con foreach

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $channel->send('one');
    $channel->send('two');
    $channel->send('three');
    $channel->close(); // senza questo, foreach non terminera' mai
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Ricevuto: $value\n";
    }
    echo "Tutti i valori elaborati\n";
});
```

### Esempio #2 Pattern produttore-consumatore

```php
<?php

use Async\Channel;

$jobs = new Channel(20);

// Produttore
spawn(function() use ($jobs) {
    $urls = ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'];

    foreach ($urls as $url) {
        $jobs->send($url);
    }
    $jobs->close();
});

// Consumatore
spawn(function() use ($jobs) {
    foreach ($jobs as $url) {
        $response = httpGet($url);
        echo "Scaricato: $url ({$response->status})\n";
    }
});
```

## Vedi anche

- [Channel::recv](/it/docs/reference/channel/recv.html) --- Ricevi un singolo valore
- [Channel::close](/it/docs/reference/channel/close.html) --- Chiudi il canale (termina l'iterazione)
- [Channel::isEmpty](/it/docs/reference/channel/is-empty.html) --- Verifica se il buffer e' vuoto
