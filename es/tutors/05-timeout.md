---
layout: tutorial
lang: es
path_key: "/tutors/05-timeout.html"
nav_active: docs
permalink: /es/tutors/05-timeout.html
page_title: "Timeouts"
description: "Limitar cuánto tiempo espera await(), usando timeout()."
---

# Limitar cuánto tiempo espera await

A menudo necesitas una garantía de que una operación no tardará más de un tiempo determinado.
Por ejemplo, si `UserDirectory` no responde durante demasiado tiempo, puede hacer que la `API` parezca averiada.
Aquí hay dos posibles soluciones:
1. Establecer un timeout a nivel de la operación `file_get_contents` y cambiar el código de la función.
2. Añadir un límite directamente a `await`.

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
} catch (RemoteApiException $e) {
    
}
```

El beneficio de limitar `await` es que no hay necesidad de cambiar el código de `validateToken`. Al
mismo tiempo, fíjate en el `catch (OperationCanceledException $e)`, y no en el `catch (TimeoutException $e)` que
podrías esperar.

## OperationCanceledException

Si ejecutamos el siguiente código

```php
use function Async\timeout;
use Async\OperationCanceledException;
use Async\TimeoutException;

try {
    timeout(2000);
} catch (TimeoutException $e) {
    
}

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
    echo $e->getPrevious()->getMessage(); // mensaje de TimeoutException
}
```

vemos que `timeout` lanza una `TimeoutException`, pero el segundo bloque recibe una
`OperationCanceledException`. Esto es intencionado, para simplificar la lógica de manejo del `try-catch` de
`await` y para distinguir con claridad una espera cancelada de una excepción surgida dentro de la corrutina.
Normalmente, las corrutinas no deberían lanzar ellas mismas una `OperationCanceledException`.

Lo que se usa para limitar una espera de `await` no tiene por qué ser `timeout()`; también puede ser cualquier otra
corrutina, o un `Future`, un contrato lógico que representa la finalización de alguna operación arbitraria.
