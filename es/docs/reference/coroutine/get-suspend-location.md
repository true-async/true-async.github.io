---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/get-suspend-location.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/get-suspend-location.html
page_title: "Coroutine::getSuspendLocation"
description: "Obtener la ubicación de suspensión de la coroutine como cadena."
---

# Coroutine::getSuspendLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendLocation(): string
```

Devuelve la ubicación de suspensión de la coroutine en el formato `"archivo:línea"`. Si la información no está disponible, devuelve `"unknown"`.

## Valor de retorno

`string` -- una cadena como `"/app/script.php:42"` o `"unknown"`.

## Ejemplos

### Ejemplo #1 Diagnosticar una coroutine bloqueada

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    file_get_contents('https://slow-api.example.com'); // stuck here
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        echo "Coroutine #{$coro->getId()} waiting at: {$coro->getSuspendLocation()}\n";
    }
}
```

## Ver también

- [Coroutine::getSuspendFileAndLine](/es/docs/reference/coroutine/get-suspend-file-and-line.html) -- Archivo y línea como array
- [Coroutine::getSpawnLocation](/es/docs/reference/coroutine/get-spawn-location.html) -- Ubicación de creación
- [Coroutine::getTrace](/es/docs/reference/coroutine/get-trace.html) -- Pila de llamadas completa
