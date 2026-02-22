---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/as-hi-priority.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/as-hi-priority.html
page_title: "Coroutine::asHiPriority"
description: "Marcar la coroutine como de alta prioridad para el planificador."
---

# Coroutine::asHiPriority

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::asHiPriority(): Coroutine
```

Marca la coroutine como de alta prioridad. El planificador dará preferencia a estas coroutines al seleccionar la siguiente tarea para ejecución.

El método devuelve el mismo objeto coroutine, permitiendo una interfaz fluida.

## Valor de retorno

`Coroutine` -- el mismo objeto coroutine (interfaz fluida).

## Ejemplos

### Ejemplo #1 Establecer prioridad

```php
<?php

use function Async\spawn;

$coroutine = spawn(function() {
    return "important task";
})->asHiPriority();
```

### Ejemplo #2 Interfaz fluida

```php
<?php

use function Async\spawn;
use function Async\await;

$result = await(
    spawn(fn() => criticalOperation())->asHiPriority()
);
```

## Ver también

- [spawn()](/es/docs/reference/spawn.html) -- Crear una coroutine
