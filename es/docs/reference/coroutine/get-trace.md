---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/get-trace.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/get-trace.html
page_title: "Coroutine::getTrace"
description: "Obtener la pila de llamadas de una coroutine suspendida."
---

# Coroutine::getTrace

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getTrace(
    int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT,
    int $limit = 0
): ?array
```

Devuelve la pila de llamadas (backtrace) de una coroutine suspendida. Si la coroutine no está suspendida (no iniciada, ejecutándose actualmente, o completada), devuelve `null`.

## Parámetros

**options**
: Una máscara de bits de opciones, similar a `debug_backtrace()`:
  - `DEBUG_BACKTRACE_PROVIDE_OBJECT` -- incluir `$this` en la traza
  - `DEBUG_BACKTRACE_IGNORE_ARGS` -- no incluir argumentos de función

**limit**
: Número máximo de marcos de pila. `0` -- sin límite.

## Valor de retorno

`?array` -- un array de marcos de pila o `null` si la coroutine no está suspendida.

## Ejemplos

### Ejemplo #1 Obtener la pila de una coroutine suspendida

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

suspend(); // dejar que la coroutine inicie y se suspenda

$trace = $coroutine->getTrace();

if ($trace !== null) {
    foreach ($trace as $frame) {
        echo ($frame['file'] ?? '?') . ':' . ($frame['line'] ?? '?');
        echo ' ' . ($frame['function'] ?? '') . "\n";
    }
}
```

### Ejemplo #2 Traza de una coroutine completada -- null

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "test");

// Antes de iniciar -- null
var_dump($coroutine->getTrace()); // NULL

await($coroutine);

// Después de completar -- null
var_dump($coroutine->getTrace()); // NULL
```

## Ver también

- [Coroutine::isSuspended](/es/docs/reference/coroutine/is-suspended.html) -- Verificar suspensión
- [Coroutine::getSuspendLocation](/es/docs/reference/coroutine/get-suspend-location.html) -- Ubicación de suspensión
- [Coroutine::getSpawnLocation](/es/docs/reference/coroutine/get-spawn-location.html) -- Ubicación de creación
