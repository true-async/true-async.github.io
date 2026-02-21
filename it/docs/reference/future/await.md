---
layout: docs
lang: it
path_key: "/docs/reference/future/await.html"
nav_active: docs
permalink: /it/docs/reference/future/await.html
page_title: "Future::await"
description: "Attende il risultato del Future."
---

# Future::await

(PHP 8.6+, True Async 1.0)

```php
public function await(?Completable $cancellation = null): mixed
```

Attende il completamento del `Future` e restituisce il suo risultato. Blocca la coroutine corrente fino al completamento del Future. Se il Future si e' completato con un errore, il metodo lancia quell'eccezione. E' possibile passare un `Completable` per annullare l'attesa tramite timeout o condizione esterna.

## Parametri

`cancellation` --- un oggetto di annullamento dell'attesa. Se fornito e attivato prima del completamento del Future, viene lanciata una `CancelledException`. Il valore predefinito e' `null`.

## Valore di ritorno

`mixed` --- il risultato del Future.

## Errori

Lancia un'eccezione se il Future si e' completato con un errore o e' stato annullato.

## Esempi

### Esempio #1 Attesa base del risultato

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    \Async\delay(100);
    return 42;
});

$result = $future->await();
echo "Result: $result\n"; // Result: 42
```

### Esempio #2 Gestione degli errori durante l'attesa

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    throw new \RuntimeException("Something went wrong");
});

try {
    $result = $future->await();
} catch (\RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    // Error: Something went wrong
}
```

## Vedi anche

- [Future::isCompleted](/it/docs/reference/future/is-completed.html) --- Verifica se il Future e' completato
- [Future::cancel](/it/docs/reference/future/cancel.html) --- Annulla il Future
- [Future::map](/it/docs/reference/future/map.html) --- Trasforma il risultato
