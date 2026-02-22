---
layout: docs
lang: es
path_key: "/docs/reference/future/construct.html"
nav_active: docs
permalink: /es/docs/reference/future/construct.html
page_title: "Future::__construct"
description: "Crea un Future vinculado a un FutureState."
---

# Future::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct(FutureState $state)
```

Crea un nuevo `Future` vinculado a un objeto `FutureState`. `FutureState` gestiona el estado del Future y permite completarlo externamente con un resultado o error.

## Parámetros

`state` — el objeto `FutureState` que gestiona el estado de este Future.

## Ejemplos

### Ejemplo #1 Crear un Future mediante FutureState

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Completar el Future desde otra corrutina
\Async\async(function() use ($state) {
    $result = performComputation();
    $state->complete($result);
});

// Esperar el resultado
$value = $future->await();
echo "Recibido: $value\n";
```

### Ejemplo #2 Crear un Future con resultado diferido

```php
<?php

use Async\Future;
use Async\FutureState;

function createDeferredFuture(): array {
    $state = new FutureState();
    $future = new Future($state);
    return [$future, $state];
}

[$future, $state] = createDeferredFuture();

// Una corrutina espera el resultado
\Async\async(function() use ($future) {
    $result = $future->await();
    echo "Resultado: $result\n";
});

// Otra corrutina proporciona el resultado
\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("Hecho!");
});
```

## Ver también

- [Future::completed](/es/docs/reference/future/completed.html) — Crear un Future ya completado
- [Future::failed](/es/docs/reference/future/failed.html) — Crear un Future con un error
