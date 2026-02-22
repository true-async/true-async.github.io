---
layout: docs
lang: es
path_key: "/docs/reference/future/get-created-file-and-line.html"
nav_active: docs
permalink: /es/docs/reference/future/get-created-file-and-line.html
page_title: "Future::getCreatedFileAndLine"
description: "Ubicación de creación del Future como array."
---

# Future::getCreatedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedFileAndLine(): array
```

Devuelve información sobre la ubicación de creación del `Future` como un array. Contiene el nombre del archivo y el número de línea donde se creó este Future. Útil para depuración y rastreo.

## Valor de retorno

`array` — un array con las claves `file` (cadena, ruta del archivo) y `line` (entero, número de línea).

## Ejemplos

### Ejemplo #1 Obtener la ubicación de creación

```php
<?php

use Async\Future;

$future = Future::completed(42); // línea 5

$location = $future->getCreatedFileAndLine();
echo "Archivo: " . $location['file'] . "\n";
echo "Línea: " . $location['line'] . "\n";
// Archivo: /app/script.php
// Línea: 5
```

### Ejemplo #2 Registro de información del Future

```php
<?php

use Async\Future;
use Async\FutureState;

function createTrackedFuture(): Future {
    $state = new FutureState();
    $future = new Future($state);

    $info = $future->getCreatedFileAndLine();
    error_log(sprintf(
        "Future creado en %s:%d",
        $info['file'],
        $info['line']
    ));

    return $future;
}
```

## Ver también

- [Future::getCreatedLocation](/es/docs/reference/future/get-created-location.html) — Ubicación de creación como cadena
- [Future::getCompletedFileAndLine](/es/docs/reference/future/get-completed-file-and-line.html) — Ubicación de completitud del Future
- [Future::getAwaitingInfo](/es/docs/reference/future/get-awaiting-info.html) — Información sobre los que esperan
