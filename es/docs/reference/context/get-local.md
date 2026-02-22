---
layout: docs
lang: es
path_key: "/docs/reference/context/get-local.html"
nav_active: docs
permalink: /es/docs/reference/context/get-local.html
page_title: "Context::getLocal"
description: "Obtener un valor solo del contexto local. Lanza una excepción si no se encuentra."
---

# Context::getLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::getLocal(string|object $key): mixed
```

Obtiene un valor por clave **solo** del contexto actual (local).
A diferencia de `get()`, este método no busca en los contextos padre.

Si la clave no se encuentra en el nivel actual, lanza una excepción.

## Parámetros

**key**
: La clave a buscar. Puede ser una cadena o un objeto.

## Valor de retorno

El valor asociado con la clave en el contexto local.

## Errores

- Lanza `Async\ContextException` si la clave no se encuentra en el contexto local.

## Ejemplos

### Ejemplo #1 Obtener un valor local

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    current_context()->set('task_id', 42);

    // El valor está establecido localmente — getLocal funciona
    $taskId = current_context()->getLocal('task_id');
    echo "Tarea: {$taskId}\n"; // "Tarea: 42"
});
```

### Ejemplo #2 Excepción al acceder a una clave heredada

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('parent_value', 'hello');

spawn(function() {
    // find() encontraría el valor en el padre
    echo current_context()->find('parent_value') . "\n"; // "hello"

    // getLocal() lanza una excepción — el valor no está en el contexto local
    try {
        current_context()->getLocal('parent_value');
    } catch (\Async\ContextException $e) {
        echo "No encontrado localmente: " . $e->getMessage() . "\n";
    }
});
```

### Ejemplo #3 Uso con clave de objeto

```php
<?php

use function Async\current_context;
use function Async\spawn;

class SessionKey {}

spawn(function() {
    $key = new SessionKey();
    current_context()->set($key, ['user' => 'admin', 'role' => 'superuser']);

    $session = current_context()->getLocal($key);
    echo "Usuario: " . $session['user'] . "\n"; // "Usuario: admin"
});
```

## Ver también

- [Context::get](/es/docs/reference/context/get.html) --- Obtener valor con búsqueda jerárquica
- [Context::findLocal](/es/docs/reference/context/find-local.html) --- Búsqueda segura en el contexto local
- [Context::hasLocal](/es/docs/reference/context/has-local.html) --- Verificar clave en el contexto local
