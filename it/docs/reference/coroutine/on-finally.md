---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/on-finally.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/on-finally.html
page_title: "Coroutine::finally"
description: "Registra un handler da chiamare al completamento della coroutine."
---

# Coroutine::finally

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::finally(\Closure $callback): void
```

Registra una funzione di callback che verrà chiamata al completamento della coroutine, indipendentemente dall'esito (successo, errore o annullamento).

Se la coroutine è già completata al momento della chiamata a `finally()`, il callback verrà eseguito immediatamente.

Possono essere registrati più handler -- vengono eseguiti nell'ordine in cui sono stati aggiunti.

## Parametri

**callback**
: La funzione handler. Riceve l'oggetto coroutine come argomento.

## Esempi

### Esempio #1 Uso base

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "risultato test";
});

$coroutine->finally(function() {
    echo "Coroutine completata\n";
});

await($coroutine);
```

### Esempio #2 Pulizia delle risorse

```php
<?php

use function Async\spawn;
use function Async\await;

$connection = connectToDatabase();

$coroutine = spawn(function() use ($connection) {
    return $connection->query('SELECT * FROM users');
});

$coroutine->finally(function() use ($connection) {
    $connection->close();
    echo "Connessione chiusa\n";
});

$result = await($coroutine);
```

### Esempio #3 Handler multipli

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "done");

$coroutine->finally(fn() => echo "Handler 1\n");
$coroutine->finally(fn() => echo "Handler 2\n");
$coroutine->finally(fn() => echo "Handler 3\n");

await($coroutine);
// Output:
// Handler 1
// Handler 2
// Handler 3
```

### Esempio #4 Registrazione dopo il completamento

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => 42);
await($coroutine);

// Coroutine già completata -- il callback viene eseguito immediatamente
$coroutine->finally(function() {
    echo "Chiamato immediatamente\n";
});
```

## Vedi anche

- [Coroutine::isCompleted](/it/docs/reference/coroutine/is-completed.html) -- Verifica il completamento
- [Coroutine::getResult](/it/docs/reference/coroutine/get-result.html) -- Ottieni il risultato
