---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/is-completed.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/is-completed.html
page_title: "Coroutine::isCompleted"
description: "Verificar si la coroutine ha completado."
---

# Coroutine::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCompleted(): bool
```

Verifica si la coroutine ha terminado su ejecución. Una coroutine se considera completada tras una finalización exitosa, una finalización con error, o una cancelación.

## Valor de retorno

`bool` -- `true` si la coroutine ha terminado su ejecución.

## Ejemplos

### Ejemplo #1 Verificar finalización

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isCompleted()); // bool(false)

await($coroutine);

var_dump($coroutine->isCompleted()); // bool(true)
```

### Ejemplo #2 Verificación de disponibilidad sin bloqueo

```php
<?php

use function Async\spawn;
use function Async\suspend;

$tasks = [
    spawn(fn() => file_get_contents('https://api1.example.com')),
    spawn(fn() => file_get_contents('https://api2.example.com')),
];

// Esperar hasta que todas hayan completado
while (true) {
    $allDone = true;
    foreach ($tasks as $task) {
        if (!$task->isCompleted()) {
            $allDone = false;
            break;
        }
    }
    if ($allDone) break;
    suspend();
}
```

## Ver también

- [Coroutine::getResult](/es/docs/reference/coroutine/get-result.html) -- Obtener el resultado
- [Coroutine::getException](/es/docs/reference/coroutine/get-exception.html) -- Obtener la excepción
- [Coroutine::isCancelled](/es/docs/reference/coroutine/is-cancelled.html) -- Verificar cancelación
