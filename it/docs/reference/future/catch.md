---
layout: docs
lang: it
path_key: "/docs/reference/future/catch.html"
nav_active: docs
permalink: /it/docs/reference/future/catch.html
page_title: "Future::catch"
description: "Gestisce un errore del Future."
---

# Future::catch

(PHP 8.6+, True Async 1.0)

```php
public function catch(callable $catch): Future
```

Registra un gestore di errori per il `Future`. Il callback viene invocato se il Future si e' completato con un'eccezione. Se il callback restituisce un valore, questo diventa il risultato del nuovo Future. Se il callback lancia un'eccezione, il nuovo Future si completa con quell'errore.

## Parametri

`catch` --- la funzione di gestione degli errori. Riceve un `Throwable`, puo' restituire un valore per il recupero. Firma: `function(\Throwable $e): mixed`.

## Valore di ritorno

`Future` --- un nuovo Future con il risultato della gestione dell'errore, oppure con il valore originale se non c'e' stato alcun errore.

## Esempi

### Esempio #1 Gestione degli errori con recupero

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Service unavailable"))
    ->catch(function(\Throwable $e) {
        echo "Error: " . $e->getMessage() . "\n";
        return "default value"; // Recupero
    });

$result = $future->await();
echo $result; // default value
```

### Esempio #2 Cattura degli errori nelle operazioni asincrone

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    $response = httpGet('https://api.example.com/users');
    if ($response->status !== 200) {
        throw new \RuntimeException("HTTP error: {$response->status}");
    }
    return json_decode($response->body, true);
})
->catch(function(\Throwable $e) {
    // Registra l'errore e restituisce un array vuoto
    error_log("API error: " . $e->getMessage());
    return [];
})
->map(function(array $users) {
    return count($users);
});

$count = $future->await();
echo "Users found: $count\n";
```

## Vedi anche

- [Future::map](/it/docs/reference/future/map.html) --- Trasforma il risultato del Future
- [Future::finally](/it/docs/reference/future/finally.html) --- Callback al completamento del Future
- [Future::ignore](/it/docs/reference/future/ignore.html) --- Ignora gli errori non gestiti
