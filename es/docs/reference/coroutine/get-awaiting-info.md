---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/get-awaiting-info.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/get-awaiting-info.html
page_title: "Coroutine::getAwaitingInfo"
description: "Obtener información sobre lo que la coroutine está esperando."
---

# Coroutine::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getAwaitingInfo(): array
```

Devuelve información de depuración sobre lo que la coroutine está esperando actualmente. Útil para diagnosticar coroutines bloqueadas.

## Valor de retorno

`array` -- un array con información de espera. Un array vacío si la información no está disponible.

## Ejemplos

### Ejemplo #1 Diagnosticar estado de espera

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    Async\delay(5000);
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        $info = $coro->getAwaitingInfo();
        echo "Coroutine #{$coro->getId()} is awaiting:\n";
        print_r($info);
    }
}
```

## Ver también

- [Coroutine::isSuspended](/es/docs/reference/coroutine/is-suspended.html) -- Verificar suspensión
- [Coroutine::getTrace](/es/docs/reference/coroutine/get-trace.html) -- Pila de llamadas
- [Coroutine::getSuspendLocation](/es/docs/reference/coroutine/get-suspend-location.html) -- Ubicación de suspensión
