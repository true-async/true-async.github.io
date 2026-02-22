---
layout: docs
lang: es
path_key: "/docs/reference/context/find.html"
nav_active: docs
permalink: /es/docs/reference/context/find.html
page_title: "Context::find"
description: "Buscar un valor por clave en el contexto actual o en el contexto padre."
---

# Context::find

(PHP 8.6+, True Async 1.0)

```php
public Context::find(string|object $key): mixed
```

Busca un valor por clave en el contexto actual. Si la clave no se encuentra, la búsqueda continúa
subiendo por la jerarquía de contextos padre. Devuelve `null` si el valor no se encuentra en ningún nivel.

Este es un método de búsqueda seguro: nunca lanza una excepción cuando falta una clave.

## Parámetros

**key**
: La clave a buscar. Puede ser una cadena o un objeto.
  Cuando se usa un objeto como clave, la búsqueda se realiza por referencia de objeto.

## Valor de retorno

El valor asociado con la clave, o `null` si la clave no se encuentra en el contexto
actual ni en ningún contexto padre.

## Ejemplos

### Ejemplo #1 Búsqueda de un valor por clave de cadena

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // La corrutina hija encuentra el valor del contexto padre
    $id = current_context()->find('request_id');
    echo $id . "\n"; // "abc-123"

    // Buscar una clave inexistente devuelve null
    $missing = current_context()->find('nonexistent');
    var_dump($missing); // NULL
});
```

### Ejemplo #2 Búsqueda de un valor por clave de objeto

```php
<?php

use function Async\current_context;
use function Async\spawn;

$loggerKey = new stdClass();

current_context()->set($loggerKey, new MyLogger());

spawn(function() use ($loggerKey) {
    // Búsqueda por referencia de clave de objeto
    $logger = current_context()->find($loggerKey);
    $logger->info('Mensaje desde la corrutina hija');
});
```

### Ejemplo #3 Búsqueda jerárquica

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Nivel raíz
current_context()->set('app_name', 'MyApp');

spawn(function() {
    // Nivel 1: agregar valor propio
    current_context()->set('user_id', 42);

    spawn(function() {
        // Nivel 2: buscar valores de todos los niveles
        echo current_context()->find('user_id') . "\n";   // 42
        echo current_context()->find('app_name') . "\n";  // "MyApp"
    });
});
```

## Ver también

- [Context::get](/es/docs/reference/context/get.html) --- Obtener valor (lanza excepción si falta)
- [Context::has](/es/docs/reference/context/has.html) --- Verificar si existe la clave
- [Context::findLocal](/es/docs/reference/context/find-local.html) --- Buscar solo en el contexto local
- [Context::set](/es/docs/reference/context/set.html) --- Establecer valor en el contexto
