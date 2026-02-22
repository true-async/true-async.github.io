---
layout: docs
lang: es
path_key: "/docs/reference/future/get-created-location.html"
nav_active: docs
permalink: /es/docs/reference/future/get-created-location.html
page_title: "Future::getCreatedLocation"
description: "Ubicación de creación del Future como cadena."
---

# Future::getCreatedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedLocation(): string
```

Devuelve información sobre la ubicación de creación del `Future` como una cadena formateada. Conveniente para registro y salida de depuración.

## Valor de retorno

`string` — una cadena en el formato `archivo:línea`, por ejemplo `/app/script.php:42`.

## Ejemplos

### Ejemplo #1 Obtener la ubicación de creación como cadena

```php
<?php

use Async\Future;

$future = Future::completed("hello");

echo $future->getCreatedLocation(); // /app/script.php:5
```

### Ejemplo #2 Uso en mensajes de depuración

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Depurar Futures de larga duración
\Async\async(function() use ($future) {
    \Async\delay(5000);
    if (!$future->isCompleted()) {
        echo "Advertencia: Future creado en "
            . $future->getCreatedLocation()
            . " no se ha completado en más de 5 segundos\n";
    }
});
```

## Ver también

- [Future::getCreatedFileAndLine](/es/docs/reference/future/get-created-file-and-line.html) — Ubicación de creación como array
- [Future::getCompletedLocation](/es/docs/reference/future/get-completed-location.html) — Ubicación de completitud como cadena
- [Future::getAwaitingInfo](/es/docs/reference/future/get-awaiting-info.html) — Información sobre los que esperan
