---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/get-id.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/get-id.html
page_title: "Coroutine::getId"
description: "Obtener el identificador único de una coroutine."
---

# Coroutine::getId

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getId(): int
```

Devuelve el identificador entero único de la coroutine. El identificador es único dentro del proceso PHP actual.

## Valor de retorno

`int` -- identificador único de la coroutine.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use function Async\spawn;

$coroutine1 = spawn(function() {
    return "task 1";
});

$coroutine2 = spawn(function() {
    return "task 2";
});

$id1 = $coroutine1->getId();
$id2 = $coroutine2->getId();

var_dump(is_int($id1));     // bool(true)
var_dump($id1 !== $id2);    // bool(true)
```

### Ejemplo #2 Registro con identificador

```php
<?php

use function Async\spawn;

function loggedTask(string $name): \Async\Coroutine {
    return spawn(function() use ($name) {
        $id = \Async\current_coroutine()->getId();
        echo "[coro:$id] Task '$name' started\n";
        \Async\delay(1000);
        echo "[coro:$id] Task '$name' completed\n";
    });
}
```

## Ver también

- [Coroutine::getSpawnLocation](/es/docs/reference/coroutine/get-spawn-location.html) -- Ubicación de creación de la coroutine
- [current_coroutine()](/es/docs/reference/current-coroutine.html) -- Obtener la coroutine actual
