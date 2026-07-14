---
layout: docs
lang: es
path_key: "/docs/reference/future/ignore.html"
nav_active: docs
permalink: /es/docs/reference/future/ignore.html
page_title: "Future::ignore"
description: "No propagar errores no manejados al manejador del bucle de eventos."
---

# Future::ignore

(PHP 8.6+, True Async 1.0)

```php
public function ignore(): Future
```

Marca el `Future` como ignorado. Si el Future se completa con un error y el error no es manejado, no se pasará al manejador de excepciones no capturadas del bucle de eventos. Útil para tareas de tipo "disparar y olvidar" donde el resultado no importa.

## Valor de retorno

`Future` — devuelve el mismo Future para encadenamiento de métodos.

## Ejemplos

### Ejemplo #1 Ignorar errores del Future

```php
<?php

use Async\Future;
use Async\FutureState;

// Lanzar una tarea cuyos errores no nos importan
$state  = new FutureState();
$future = new Future($state);
$future->ignore();

\Async\spawn(function() use ($state) {
    // Esta operación puede fallar
    try {
        sendAnalytics(['event' => 'page_view']);
        $state->complete(null);
    } catch (\Throwable $e) {
        $state->error($e);
    }
});

// El error no se pasará al manejador del bucle de eventos
```

### Ejemplo #2 Uso de ignore con encadenamiento de métodos

```php
<?php

use Async\Future;
use Async\FutureState;

function warmupCache(array $keys): void {
    foreach ($keys as $key) {
        $state = new FutureState();
        (new Future($state))->ignore();  // Los errores de caché no son críticos

        \Async\spawn(function() use ($state, $key) {
            try {
                $data = loadFromDatabase($key);
                saveToCache($key, $data);
                $state->complete(null);
            } catch (\Throwable $e) {
                $state->error($e);
            }
        });
    }
}

warmupCache(['user:1', 'user:2', 'user:3']);
```

## Ver también

- [Future::catch](/es/docs/reference/future/catch.html) — Manejar un error del Future
- [Future::finally](/es/docs/reference/future/finally.html) — Callback al completar el Future
