---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/get-result.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/get-result.html
page_title: "Coroutine::getResult"
description: "Ottieni il risultato dell'esecuzione della coroutine."
---

# Coroutine::getResult

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getResult(): mixed
```

Restituisce il risultato dell'esecuzione della coroutine. Se la coroutine non è ancora completata, restituisce `null`.

**Importante:** questo metodo non attende il completamento della coroutine. Utilizzare `await()` per l'attesa.

## Valore di ritorno

`mixed` -- il risultato della coroutine o `null` se la coroutine non è ancora completata.

## Esempi

### Esempio #1 Uso base

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "risultato test";
});

// Prima del completamento
var_dump($coroutine->getResult()); // NULL

// Attendi il completamento
await($coroutine);

var_dump($coroutine->getResult()); // string(14) "risultato test"
```

### Esempio #2 Verifica con isCompleted()

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(fn() => 42);

suspend(); // lascia che la coroutine si completi

if ($coroutine->isCompleted()) {
    echo "Risultato: " . $coroutine->getResult() . "\n";
}
```

## Vedi anche

- [Coroutine::getException](/it/docs/reference/coroutine/get-exception.html) -- Ottieni l'eccezione
- [Coroutine::isCompleted](/it/docs/reference/coroutine/is-completed.html) -- Verifica il completamento
- [await()](/it/docs/reference/await.html) -- Attendi il risultato
