---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/is-started.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/is-started.html
page_title: "Coroutine::isStarted"
description: "Verificar si la coroutine ha sido iniciada por el planificador."
---

# Coroutine::isStarted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isStarted(): bool
```

Verifica si la coroutine ha sido iniciada por el planificador. Una coroutine se considera iniciada después de que el planificador comience su ejecución.

## Valor de retorno

`bool` -- `true` si la coroutine ha sido iniciada.

## Ejemplos

### Ejemplo #1 Verificar antes y después de iniciar

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isStarted()); // bool(false) -- aún en cola

suspend(); // dejar que el planificador inicie la coroutine

var_dump($coroutine->isStarted()); // bool(true)

await($coroutine);

var_dump($coroutine->isStarted()); // bool(true) -- sigue siendo true después de completar
```

## Ver también

- [Coroutine::isQueued](/es/docs/reference/coroutine/is-queued.html) -- Verificar estado de cola
- [Coroutine::isRunning](/es/docs/reference/coroutine/is-running.html) -- Verificar si está en ejecución
- [Coroutine::isCompleted](/es/docs/reference/coroutine/is-completed.html) -- Verificar finalización
