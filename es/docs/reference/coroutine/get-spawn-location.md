---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/get-spawn-location.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/get-spawn-location.html
page_title: "Coroutine::getSpawnLocation"
description: "Obtener la ubicación de creación de la coroutine como cadena."
---

# Coroutine::getSpawnLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnLocation(): string
```

Devuelve la ubicación de creación de la coroutine en el formato `"archivo:línea"`. Si la información no está disponible, devuelve `"unknown"`.

## Valor de retorno

`string` -- una cadena como `"/app/script.php:42"` o `"unknown"`.

## Ejemplos

### Ejemplo #1 Salida de depuración

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test");

echo "Created at: " . $coroutine->getSpawnLocation() . "\n";
// Output: "Created at: /app/script.php:5"
```

### Ejemplo #2 Registro de todas las coroutines

```php
<?php

use function Async\spawn;
use function Async\get_coroutines;

spawn(fn() => Async\delay(1000));
spawn(fn() => Async\delay(2000));

foreach (get_coroutines() as $coro) {
    echo "Coroutine #{$coro->getId()} created at {$coro->getSpawnLocation()}\n";
}
```

## Ver también

- [Coroutine::getSpawnFileAndLine](/es/docs/reference/coroutine/get-spawn-file-and-line.html) -- Archivo y línea como array
- [Coroutine::getSuspendLocation](/es/docs/reference/coroutine/get-suspend-location.html) -- Ubicación de suspensión
- [get_coroutines()](/es/docs/reference/get-coroutines.html) -- Todas las coroutines activas
