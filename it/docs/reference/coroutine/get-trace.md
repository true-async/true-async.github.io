---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/get-trace.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/get-trace.html
page_title: "Coroutine::getTrace"
description: "Ottieni lo stack delle chiamate di una coroutine sospesa."
---

# Coroutine::getTrace

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getTrace(
    int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT,
    int $limit = 0
): ?array
```

Restituisce lo stack delle chiamate (backtrace) di una coroutine sospesa. Se la coroutine non è sospesa (non ancora avviata, attualmente in esecuzione o completata), restituisce `null`.

## Parametri

**options**
: Una maschera di bit di opzioni, simile a `debug_backtrace()`:
  - `DEBUG_BACKTRACE_PROVIDE_OBJECT` -- includi `$this` nel trace
  - `DEBUG_BACKTRACE_IGNORE_ARGS` -- non includere gli argomenti delle funzioni

**limit**
: Numero massimo di frame dello stack. `0` -- nessun limite.

## Valore di ritorno

`?array` -- un array di frame dello stack o `null` se la coroutine non è sospesa.

## Esempi

### Esempio #1 Ottenere lo stack di una coroutine sospesa

```php
<?php

use function Async\spawn;
use function Async\suspend;

function innerFunction() {
    suspend();
}

function outerFunction() {
    innerFunction();
}

$coroutine = spawn(function() {
    outerFunction();
});

suspend(); // lascia che la coroutine si avvii e si sospenda

$trace = $coroutine->getTrace();

if ($trace !== null) {
    foreach ($trace as $frame) {
        echo ($frame['file'] ?? '?') . ':' . ($frame['line'] ?? '?');
        echo ' ' . ($frame['function'] ?? '') . "\n";
    }
}
```

### Esempio #2 Trace per una coroutine completata -- null

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "test");

// Prima dell'avvio -- null
var_dump($coroutine->getTrace()); // NULL

await($coroutine);

// Dopo il completamento -- null
var_dump($coroutine->getTrace()); // NULL
```

## Vedi anche

- [Coroutine::isSuspended](/it/docs/reference/coroutine/is-suspended.html) -- Verifica la sospensione
- [Coroutine::getSuspendLocation](/it/docs/reference/coroutine/get-suspend-location.html) -- Posizione di sospensione
- [Coroutine::getSpawnLocation](/it/docs/reference/coroutine/get-spawn-location.html) -- Posizione di creazione
