---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/is-running.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/is-running.html
page_title: "Coroutine::isRunning"
description: "Verificar si la coroutine se está ejecutando actualmente."
---

# Coroutine::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isRunning(): bool
```

Verifica si la coroutine se está ejecutando actualmente. Una coroutine se considera en ejecución si ha sido iniciada y aún no ha completado.

## Valor de retorno

`bool` -- `true` si la coroutine está en ejecución y no ha completado.

## Ejemplos

### Ejemplo #1 Verificar estado de ejecución

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    // Dentro de la coroutine isRunning() == true
    var_dump(\Async\current_coroutine()->isRunning()); // bool(true)
    return "done";
});

// Fuera -- la coroutine está suspendida o aún no ha iniciado
var_dump($coroutine->isRunning()); // bool(false)
```

## Ver también

- [Coroutine::isStarted](/es/docs/reference/coroutine/is-started.html) -- Verificar si ha iniciado
- [Coroutine::isSuspended](/es/docs/reference/coroutine/is-suspended.html) -- Verificar suspensión
- [Coroutine::isCompleted](/es/docs/reference/coroutine/is-completed.html) -- Verificar finalización
