---
layout: docs
lang: it
path_key: "/docs/reference/future/failed.html"
nav_active: docs
permalink: /it/docs/reference/future/failed.html
page_title: "Future::failed"
description: "Crea un Future completato con un errore."
---

# Future::failed

(PHP 8.6+, True Async 1.0)

```php
public static function failed(\Throwable $throwable): Future
```

Crea un `Future` immediatamente completato con l'errore specificato. Chiamare `await()` su un tale Future lancera' l'eccezione fornita.

## Parametri

`throwable` --- l'eccezione con cui il Future verra' completato.

## Valore di ritorno

`Future` --- un Future completato con un errore.

## Esempi

### Esempio #1 Creazione di un Future con un errore

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Loading error"));

var_dump($future->isCompleted()); // bool(true)

try {
    $future->await();
} catch (\RuntimeException $e) {
    echo "Caught: " . $e->getMessage() . "\n";
    // Caught: Loading error
}
```

### Esempio #2 Utilizzo per restituzione anticipata di errori

```php
<?php

use Async\Future;

function connectToService(string $host): Future {
    if (empty($host)) {
        return Future::failed(
            new \InvalidArgumentException("Host cannot be empty")
        );
    }

    return \Async\async(function() use ($host) {
        return performConnection($host);
    });
}

$future = connectToService('');
$future->catch(function(\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
});
```

## Vedi anche

- [Future::completed](/it/docs/reference/future/completed.html) --- Crea un Future con un risultato
- [Future::catch](/it/docs/reference/future/catch.html) --- Gestisce un errore del Future
- [Future::await](/it/docs/reference/future/await.html) --- Attende il risultato
