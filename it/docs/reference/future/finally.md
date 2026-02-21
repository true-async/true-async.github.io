---
layout: docs
lang: it
path_key: "/docs/reference/future/finally.html"
nav_active: docs
permalink: /it/docs/reference/future/finally.html
page_title: "Future::finally"
description: "Callback che viene sempre eseguito al completamento del Future."
---

# Future::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(callable $finally): Future
```

Registra un callback che viene eseguito quando il `Future` si completa, indipendentemente dall'esito --- successo, errore o annullamento. Il Future si risolve con lo stesso valore o errore dell'originale. Utile per il rilascio delle risorse.

## Parametri

`finally` --- la funzione da eseguire al completamento. Non accetta argomenti. Firma: `function(): void`.

## Valore di ritorno

`Future` --- un nuovo Future che si completera' con lo stesso valore o errore dell'originale.

## Esempi

### Esempio #1 Rilascio delle risorse

```php
<?php

use Async\Future;

$connection = openDatabaseConnection();

$future = \Async\async(function() use ($connection) {
    return $connection->query("SELECT * FROM users");
})
->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$users = $future->await();
```

### Esempio #2 Concatenazione con map, catch e finally

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return fetchDataFromApi();
})
->map(fn($data) => processData($data))
->catch(function(\Throwable $e) {
    error_log("Error: " . $e->getMessage());
    return [];
})
->finally(function() {
    echo "Operation completed\n";
});

$result = $future->await();
```

## Vedi anche

- [Future::map](/it/docs/reference/future/map.html) --- Trasforma il risultato del Future
- [Future::catch](/it/docs/reference/future/catch.html) --- Gestisce un errore del Future
- [Future::ignore](/it/docs/reference/future/ignore.html) --- Ignora gli errori non gestiti
