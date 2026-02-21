---
layout: docs
lang: it
path_key: "/docs/reference/future/map.html"
nav_active: docs
permalink: /it/docs/reference/future/map.html
page_title: "Future::map"
description: "Trasforma il risultato del Future."
---

# Future::map

(PHP 8.6+, True Async 1.0)

```php
public function map(callable $map): Future
```

Trasforma il risultato del `Future` utilizzando una funzione callback. Il callback riceve il valore del Future completato e restituisce un nuovo valore. Analogo a `then()` nelle API basate su Promise. Se il Future originale si e' completato con un errore, il callback non viene invocato e l'errore viene propagato al nuovo Future.

## Parametri

`map` --- la funzione di trasformazione. Riceve il risultato del Future, restituisce un nuovo valore. Firma: `function(mixed $value): mixed`.

## Valore di ritorno

`Future` --- un nuovo Future contenente il risultato trasformato.

## Esempi

### Esempio #1 Trasformazione del risultato

```php
<?php

use Async\Future;

$future = Future::completed(5)
    ->map(fn(int $x) => $x * 2)
    ->map(fn(int $x) => "Result: $x");

echo $future->await(); // Result: 10
```

### Esempio #2 Catena di trasformazioni per il caricamento asincrono

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return file_get_contents('https://api.example.com/data');
})
->map(fn(string $json) => json_decode($json, true))
->map(fn(array $data) => $data['users'])
->map(fn(array $users) => count($users));

$count = $future->await();
echo "Number of users: $count\n";
```

## Vedi anche

- [Future::catch](/it/docs/reference/future/catch.html) --- Gestisce un errore del Future
- [Future::finally](/it/docs/reference/future/finally.html) --- Callback al completamento del Future
- [Future::await](/it/docs/reference/future/await.html) --- Attende il risultato
