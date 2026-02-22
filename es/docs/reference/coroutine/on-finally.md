---
layout: docs
lang: es
path_key: "/docs/reference/coroutine/on-finally.html"
nav_active: docs
permalink: /es/docs/reference/coroutine/on-finally.html
page_title: "Coroutine::finally"
description: "Registrar un manejador que se ejecutará cuando la coroutine complete."
---

# Coroutine::finally

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::finally(\Closure $callback): void
```

Registra una función de callback que será llamada cuando la coroutine complete, independientemente del resultado (éxito, error o cancelación).

Si la coroutine ya ha completado en el momento en que se llama a `finally()`, el callback se ejecutará inmediatamente.

Se pueden registrar múltiples manejadores -- se ejecutan en el orden en que fueron añadidos.

## Parámetros

**callback**
: La función manejadora. Recibe el objeto coroutine como argumento.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

$coroutine->finally(function() {
    echo "Coroutine completed\n";
});

await($coroutine);
```

### Ejemplo #2 Limpieza de recursos

```php
<?php

use function Async\spawn;
use function Async\await;

$connection = connectToDatabase();

$coroutine = spawn(function() use ($connection) {
    return $connection->query('SELECT * FROM users');
});

$coroutine->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$result = await($coroutine);
```

### Ejemplo #3 Múltiples manejadores

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "done");

$coroutine->finally(fn() => echo "Handler 1\n");
$coroutine->finally(fn() => echo "Handler 2\n");
$coroutine->finally(fn() => echo "Handler 3\n");

await($coroutine);
// Output:
// Handler 1
// Handler 2
// Handler 3
```

### Ejemplo #4 Registro después de la finalización

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => 42);
await($coroutine);

// La coroutine ya completó -- el callback se ejecuta inmediatamente
$coroutine->finally(function() {
    echo "Called immediately\n";
});
```

## Ver también

- [Coroutine::isCompleted](/es/docs/reference/coroutine/is-completed.html) -- Verificar finalización
- [Coroutine::getResult](/es/docs/reference/coroutine/get-result.html) -- Obtener el resultado
