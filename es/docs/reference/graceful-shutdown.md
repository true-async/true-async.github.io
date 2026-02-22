---
layout: docs
lang: es
path_key: "/docs/reference/graceful-shutdown.html"
nav_active: docs
permalink: /es/docs/reference/graceful-shutdown.html
page_title: "graceful_shutdown()"
description: "graceful_shutdown() — apagado ordenado del planificador con cancelación de todas las corrutinas."
---

# graceful_shutdown

(PHP 8.6+, True Async 1.0)

`graceful_shutdown()` — Inicia un apagado ordenado del planificador. Todas las corrutinas reciben una solicitud de cancelación.

## Descripción

```php
graceful_shutdown(?Async\AsyncCancellation $cancellationError = null): void
```

Inicia el procedimiento de apagado ordenado: todas las corrutinas activas son canceladas y la aplicación continúa ejecutándose hasta que se completen de forma natural.

## Parámetros

**`cancellationError`**
Un error de cancelación opcional para pasar a las corrutinas. Si no se especifica, se usa un mensaje por defecto.

## Valores de retorno

No devuelve ningún valor.

## Ejemplos

### Ejemplo #1 Manejo de señal de terminación

```php
<?php
use function Async\spawn;
use function Async\graceful_shutdown;
use Async\AsyncCancellation;

// Servidor procesando solicitudes
spawn(function() {
    // Al recibir una señal — apagar ordenadamente
    pcntl_signal(SIGTERM, function() {
        graceful_shutdown(new AsyncCancellation('Apagado del servidor'));
    });

    while (true) {
        // Procesando solicitudes...
    }
});
?>
```

## Notas

> **Nota:** Las corrutinas creadas **después** de llamar a `graceful_shutdown()` serán canceladas inmediatamente.

> **Nota:** `exit` y `die` activan automáticamente un apagado ordenado.

## Ver también

- [Cancelación](/es/docs/components/cancellation.html) — mecanismo de cancelación
- [Scope](/es/docs/components/scope.html) — gestión del ciclo de vida
