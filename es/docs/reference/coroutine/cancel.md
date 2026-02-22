---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/cancel.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/cancel.html
page_title: "Coroutine::cancel"
description: "Cancelar la ejecución de una coroutine."
---

# Coroutine::cancel

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Cancela la ejecución de la coroutine. La coroutine recibirá una excepción `AsyncCancellation` en el siguiente punto de suspensión (`suspend`, `await`, `delay`, etc.).

La cancelación funciona de forma cooperativa -- la coroutine no se interrumpe instantáneamente. Si la coroutine está dentro de `protect()`, la cancelación se aplaza hasta que la sección protegida se complete.

## Parámetros

**cancellation**
: La excepción que sirve como motivo de cancelación. Si es `null`, se crea un `AsyncCancellation` predeterminado.

## Ejemplos

### Ejemplo #1 Cancelación básica

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    try {
        Async\delay(10000);
    } catch (\Async\AsyncCancellation $e) {
        echo "Cancelled: " . $e->getMessage() . "\n";
    }
});

suspend();

$coroutine->cancel();

await($coroutine);
```

### Ejemplo #2 Cancelación con motivo

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\delay(10000);
});

$coroutine->cancel(new \Async\AsyncCancellation("Timeout exceeded"));

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo $e->getMessage() . "\n"; // "Timeout exceeded"
}
```

### Ejemplo #3 Cancelación antes de iniciar

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "should not complete";
});

// Cancelar antes de que el planificador inicie la coroutine
$coroutine->cancel();

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo "Coroutine cancelled before start\n";
}
```

## Ver también

- [Coroutine::isCancelled](/es/docs/reference/coroutine/is-cancelled.html) -- Verificar cancelación
- [Coroutine::isCancellationRequested](/es/docs/reference/coroutine/is-cancellation-requested.html) -- Verificar solicitud de cancelación
- [Cancelación](/es/docs/components/cancellation.html) -- Concepto de cancelación
- [protect()](/es/docs/reference/protect.html) -- Sección protegida
