---
layout: docs
lang: es
path_key: "/docs/reference/future/get-awaiting-info.html"
nav_active: docs
permalink: /es/docs/reference/future/get-awaiting-info.html
page_title: "Future::getAwaitingInfo"
description: "Información de depuración sobre las corrutinas en espera."
---

# Future::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public function getAwaitingInfo(): array
```

Devuelve información de depuración sobre las corrutinas que actualmente esperan la completitud de este `Future`. Útil para diagnosticar interbloqueos y analizar dependencias entre corrutinas.

## Valor de retorno

`array` — un array con información sobre las corrutinas en espera.

## Ejemplos

### Ejemplo #1 Obtener información sobre los que esperan

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Lanzar varias corrutinas esperando un Future
\Async\async(function() use ($future) {
    $future->await();
});

\Async\async(function() use ($future) {
    $future->await();
});

// Dar tiempo a las corrutinas para comenzar a esperar
\Async\delay(10);

$info = $future->getAwaitingInfo();
var_dump($info);
// Array con información sobre las corrutinas en espera

$state->complete("done");
```

## Ver también

- [Future::getCreatedFileAndLine](/es/docs/reference/future/get-created-file-and-line.html) — Ubicación de creación del Future
- [Future::getCreatedLocation](/es/docs/reference/future/get-created-location.html) — Ubicación de creación como cadena
- [Future::await](/es/docs/reference/future/await.html) — Esperar el resultado
