---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/get-result.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/get-result.html
page_title: "Coroutine::getResult"
description: "Obtener el resultado de la ejecución de una coroutine."
---

# Coroutine::getResult

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getResult(): mixed
```

Devuelve el resultado de la ejecución de la coroutine. Si la coroutine aún no ha completado, devuelve `null`.

**Importante:** este método no espera a que la coroutine se complete. Use `await()` para esperar.

## Valor de retorno

`mixed` -- el resultado de la coroutine o `null` si la coroutine aún no ha completado.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

// Antes de completar
var_dump($coroutine->getResult()); // NULL

// Esperar a que complete
await($coroutine);

var_dump($coroutine->getResult()); // string(11) "test result"
```

### Ejemplo #2 Verificación con isCompleted()

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(fn() => 42);

suspend(); // dejar que la coroutine complete

if ($coroutine->isCompleted()) {
    echo "Result: " . $coroutine->getResult() . "\n";
}
```

## Ver también

- [Coroutine::getException](/es/docs/reference/coroutine/get-exception.html) -- Obtener la excepción
- [Coroutine::isCompleted](/es/docs/reference/coroutine/is-completed.html) -- Verificar finalización
- [await()](/es/docs/reference/await.html) -- Esperar el resultado
