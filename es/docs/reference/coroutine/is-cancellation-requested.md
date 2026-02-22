---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/is-cancellation-requested.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/is-cancellation-requested.html
page_title: "Coroutine::isCancellationRequested"
description: "Verificar si se ha solicitado la cancelación de la coroutine."
---

# Coroutine::isCancellationRequested

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancellationRequested(): bool
```

Verifica si se ha solicitado la cancelación de la coroutine. A diferencia de `isCancelled()`, devuelve `true` inmediatamente después de llamar a `cancel()`, incluso si la coroutine aún se está ejecutando dentro de `protect()`.

## Valor de retorno

`bool` -- `true` si se ha solicitado la cancelación.

## Ejemplos

### Ejemplo #1 Diferencia con isCancelled()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        suspend();
    });
});

suspend();

// Antes de la cancelación
var_dump($coroutine->isCancellationRequested()); // bool(false)

$coroutine->cancel();

// Inmediatamente después de cancel()
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false) -- aún en protect()
```

## Ver también

- [Coroutine::isCancelled](/es/docs/reference/coroutine/is-cancelled.html) -- Verificar cancelación completada
- [Coroutine::cancel](/es/docs/reference/coroutine/cancel.html) -- Cancelar la coroutine
- [protect()](/es/docs/reference/protect.html) -- Sección protegida
