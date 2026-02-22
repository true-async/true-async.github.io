---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/get-exception.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/get-exception.html
page_title: "Coroutine::getException"
description: "Obtener la excepción que ocurrió en una coroutine."
---

# Coroutine::getException

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getException(): mixed
```

Devuelve la excepción que ocurrió en la coroutine. Si la coroutine se completó exitosamente o aún no ha terminado, devuelve `null`. Si la coroutine fue cancelada, devuelve un objeto `AsyncCancellation`.

## Valor de retorno

`mixed` -- la excepción o `null`.

- `null` -- si la coroutine no ha completado o se completó exitosamente
- `Throwable` -- si la coroutine terminó con un error
- `AsyncCancellation` -- si la coroutine fue cancelada

## Errores

Lanza `RuntimeException` si la coroutine se está ejecutando actualmente.

## Ejemplos

### Ejemplo #1 Finalización exitosa

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "success";
});

await($coroutine);
var_dump($coroutine->getException()); // NULL
```

### Ejemplo #2 Finalización con error

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    throw new RuntimeException("test error");
});

try {
    await($coroutine);
} catch (RuntimeException $e) {
    // Capturada durante await
}

$exception = $coroutine->getException();
var_dump($exception instanceof RuntimeException); // bool(true)
var_dump($exception->getMessage());                // string(10) "test error"
```

### Ejemplo #3 Coroutine cancelada

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();
$coroutine->cancel();
suspend();

$exception = $coroutine->getException();
var_dump($exception instanceof \Async\AsyncCancellation); // bool(true)
```

## Ver también

- [Coroutine::getResult](/es/docs/reference/coroutine/get-result.html) -- Obtener el resultado
- [Coroutine::isCancelled](/es/docs/reference/coroutine/is-cancelled.html) -- Verificar cancelación
- [Excepciones](/es/docs/components/exceptions.html) -- Manejo de errores
