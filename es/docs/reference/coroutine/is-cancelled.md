---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/is-cancelled.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/is-cancelled.html
page_title: "Coroutine::isCancelled"
description: "Verificar si la coroutine ha sido cancelada."
---

# Coroutine::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancelled(): bool
```

Verifica si la coroutine ha sido cancelada **y** completada. Devuelve `true` solo cuando la cancelación ha finalizado completamente.

Si la coroutine está dentro de `protect()`, `isCancelled()` devolverá `false` hasta que la sección protegida se complete, incluso si ya se ha llamado a `cancel()`. Para verificar una solicitud de cancelación, use `isCancellationRequested()`.

## Valor de retorno

`bool` -- `true` si la coroutine ha sido cancelada y completada.

## Ejemplos

### Ejemplo #1 Cancelación básica

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();

$coroutine->cancel();

suspend(); // dejar que la cancelación se complete

var_dump($coroutine->isCancelled()); // bool(true)
var_dump($coroutine->isCompleted()); // bool(true)
```

### Ejemplo #2 Cancelación diferida con protect()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        // Sección crítica -- la cancelación se aplaza
        Async\delay(100);
    });
});

suspend();

$coroutine->cancel();

// Cancelación solicitada pero aún no completada
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false)

suspend(); // dejar que protect() complete

var_dump($coroutine->isCancelled());             // bool(true)
```

## Ver también

- [Coroutine::isCancellationRequested](/es/docs/reference/coroutine/is-cancellation-requested.html) -- Verificar solicitud de cancelación
- [Coroutine::cancel](/es/docs/reference/coroutine/cancel.html) -- Cancelar la coroutine
- [Cancelación](/es/docs/components/cancellation.html) -- Concepto de cancelación
