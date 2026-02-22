---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/is-queued.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/is-queued.html
page_title: "Coroutine::isQueued"
description: "Verificar si la coroutine está en la cola del planificador."
---

# Coroutine::isQueued

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isQueued(): bool
```

Verifica si la coroutine está en la cola del planificador para ejecución.

## Valor de retorno

`bool` -- `true` si la coroutine está en la cola.

## Ejemplos

### Ejemplo #1 Estado de la cola

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

var_dump($coroutine->isQueued()); // bool(true) -- esperando para iniciar

suspend(); // dejar que el planificador inicie la coroutine

// La coroutine ha iniciado pero permanece en cola después del suspend() interno
var_dump($coroutine->isStarted()); // bool(true)
```

## Ver también

- [Coroutine::isStarted](/es/docs/reference/coroutine/is-started.html) -- Verificar si ha iniciado
- [Coroutine::isSuspended](/es/docs/reference/coroutine/is-suspended.html) -- Verificar suspensión
