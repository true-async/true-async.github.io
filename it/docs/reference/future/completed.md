---
layout: docs
lang: it
path_key: "/docs/reference/future/completed.html"
nav_active: docs
permalink: /it/docs/reference/future/completed.html
page_title: "Future::completed"
description: "Crea un Future gia' completato con un risultato."
---

# Future::completed

(PHP 8.6+, True Async 1.0)

```php
public static function completed(mixed $value = null): Future
```

Crea un `Future` gia' completato con il valore specificato. Questo e' un metodo factory che restituisce un `Future` contenente immediatamente un risultato. Utile per restituire un valore gia' noto da funzioni che restituiscono un `Future`.

## Parametri

`value` --- il valore con cui il Future verra' completato. Il valore predefinito e' `null`.

## Valore di ritorno

`Future` --- un Future completato con il valore specificato.

## Esempi

### Esempio #1 Creazione di un Future con un valore pronto

```php
<?php

use Async\Future;

$future = Future::completed(42);

var_dump($future->isCompleted()); // bool(true)
var_dump($future->await());       // int(42)
```

### Esempio #2 Utilizzo in una funzione che restituisce un Future

```php
<?php

use Async\Future;

function fetchData(string $key): Future {
    // Se i dati sono in cache, restituisci immediatamente
    $cached = getFromCache($key);
    if ($cached !== null) {
        return Future::completed($cached);
    }

    // Altrimenti avvia un'operazione asincrona
    return \Async\async(function() use ($key) {
        return loadFromDatabase($key);
    });
}

$result = fetchData('user:1')->await();
echo "Result: $result\n";
```

## Vedi anche

- [Future::failed](/it/docs/reference/future/failed.html) --- Crea un Future con un errore
- [Future::__construct](/it/docs/reference/future/construct.html) --- Crea un Future tramite FutureState
- [Future::await](/it/docs/reference/future/await.html) --- Attende il risultato
