---
layout: docs
lang: es
path_key: "/docs/reference/future/get-completed-file-and-line.html"
nav_active: docs
permalink: /es/docs/reference/future/get-completed-file-and-line.html
page_title: "Future::getCompletedFileAndLine"
description: "Ubicación de completitud del Future como array."
---

# Future::getCompletedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedFileAndLine(): array
```

Devuelve información sobre la ubicación donde se completó el `Future` (donde se llamó a `complete()` o `fail()` en el `FutureState` asociado). Contiene el nombre del archivo y el número de línea. Útil para depuración y rastreo de cadenas asíncronas.

## Valor de retorno

`array` — un array con las claves `file` (cadena, ruta del archivo) y `line` (entero, número de línea). Si el Future aún no se ha completado, devuelve un array vacío.

## Ejemplos

### Ejemplo #1 Obtener la ubicación de completitud

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete(42); // línea 8

$location = $future->getCompletedFileAndLine();
echo "Archivo: " . $location['file'] . "\n";
echo "Línea: " . $location['line'] . "\n";
// Archivo: /app/script.php
// Línea: 8
```

### Ejemplo #2 Comparar ubicaciones de creación y completitud

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("result");
});

$future->await();

echo "Creado en: " . $future->getCreatedLocation() . "\n";
$completed = $future->getCompletedFileAndLine();
echo "Completado en: " . $completed['file'] . ":" . $completed['line'] . "\n";
```

## Ver también

- [Future::getCompletedLocation](/es/docs/reference/future/get-completed-location.html) — Ubicación de completitud como cadena
- [Future::getCreatedFileAndLine](/es/docs/reference/future/get-created-file-and-line.html) — Ubicación de creación del Future
- [Future::getAwaitingInfo](/es/docs/reference/future/get-awaiting-info.html) — Información sobre los que esperan
