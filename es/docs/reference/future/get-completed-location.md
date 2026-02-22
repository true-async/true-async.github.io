---
layout: docs
lang: es
path_key: "/docs/reference/future/get-completed-location.html"
nav_active: docs
permalink: /es/docs/reference/future/get-completed-location.html
page_title: "Future::getCompletedLocation"
description: "Ubicación de completitud del Future como cadena."
---

# Future::getCompletedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedLocation(): string
```

Devuelve información sobre la ubicación de completitud del `Future` como una cadena formateada. Conveniente para registro y depuración.

## Valor de retorno

`string` — una cadena en el formato `archivo:línea`, por ejemplo `/app/worker.php:15`. Si el Future aún no se ha completado, devuelve una cadena vacía.

## Ejemplos

### Ejemplo #1 Obtener la ubicación de completitud como cadena

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete("result");

echo $future->getCompletedLocation(); // /app/script.php:9
```

### Ejemplo #2 Rastreo completo del ciclo de vida del Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(50);
    $state->complete("done");
});

$result = $future->await();

echo "Ciclo de vida del Future:\n";
echo "  Creado en:     " . $future->getCreatedLocation() . "\n";
echo "  Completado en: " . $future->getCompletedLocation() . "\n";
echo "  Resultado:     " . $result . "\n";
```

## Ver también

- [Future::getCompletedFileAndLine](/es/docs/reference/future/get-completed-file-and-line.html) — Ubicación de completitud como array
- [Future::getCreatedLocation](/es/docs/reference/future/get-created-location.html) — Ubicación de creación como cadena
- [Future::getAwaitingInfo](/es/docs/reference/future/get-awaiting-info.html) — Información sobre los que esperan
