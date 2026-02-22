---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/is-suspended.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/is-suspended.html
page_title: "Coroutine::isSuspended"
description: "Verificar si la coroutine está suspendida."
---

# Coroutine::isSuspended

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isSuspended(): bool
```

Verifica si la coroutine está suspendida. Una coroutine se suspende cuando se llama a `suspend()`, durante operaciones de E/S, o mientras espera con `await()`.

## Valor de retorno

`bool` -- `true` si la coroutine está suspendida.

## Ejemplos

### Ejemplo #1 Verificar suspensión

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

suspend(); // dejar que la coroutine inicie y se suspenda

var_dump($coroutine->isSuspended()); // bool(true)
var_dump($coroutine->isStarted());   // bool(true)
var_dump($coroutine->isCompleted()); // bool(false)
```

## Ver también

- [Coroutine::isRunning](/es/docs/reference/coroutine/is-running.html) -- Verificar ejecución
- [Coroutine::getTrace](/es/docs/reference/coroutine/get-trace.html) -- Pila de llamadas de una coroutine suspendida
- [suspend()](/es/docs/reference/suspend.html) -- Suspender la coroutine actual
