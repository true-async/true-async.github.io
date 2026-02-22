---
layout: docs
lang: es
path_key: "/docs/reference/context/has-local.html"
nav_active: docs
permalink: /es/docs/reference/context/has-local.html
page_title: "Context::hasLocal"
description: "Verificar si una clave existe solo en el contexto local."
---

# Context::hasLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::hasLocal(string|object $key): bool
```

Verifica si existe un valor con la clave especificada **solo** en el contexto actual (local).
A diferencia de `has()`, este método no busca en los contextos padre.

## Parámetros

**key**
: La clave a verificar. Puede ser una cadena o un objeto.

## Valor de retorno

`true` si la clave se encuentra en el contexto local, `false` en caso contrario.

## Ejemplos

### Ejemplo #1 Diferencia entre has y hasLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('inherited_key', 'value');

spawn(function() {
    current_context()->set('local_key', 'value');

    // has() busca subiendo por la jerarquía
    var_dump(current_context()->has('inherited_key'));      // true
    var_dump(current_context()->has('local_key'));          // true

    // hasLocal() verifica solo el nivel actual
    var_dump(current_context()->hasLocal('inherited_key')); // false
    var_dump(current_context()->hasLocal('local_key'));      // true
});
```

### Ejemplo #2 Verificación con clave de objeto

```php
<?php

use function Async\current_context;
use function Async\spawn;

$configKey = new stdClass();
current_context()->set($configKey, ['debug' => true]);

spawn(function() use ($configKey) {
    $localKey = new stdClass();
    current_context()->set($localKey, 'local');

    var_dump(current_context()->hasLocal($configKey)); // false
    var_dump(current_context()->hasLocal($localKey));  // true
});
```

### Ejemplo #3 Inicialización condicional de un valor local

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    // Inicializar valor solo si no está establecido localmente
    if (!current_context()->hasLocal('request_count')) {
        current_context()->set('request_count', 0);
    }

    echo current_context()->getLocal('request_count') . "\n"; // 0
});
```

## Ver también

- [Context::has](/es/docs/reference/context/has.html) --- Verificar con recorrido jerárquico
- [Context::findLocal](/es/docs/reference/context/find-local.html) --- Buscar valor en el contexto local
- [Context::getLocal](/es/docs/reference/context/get-local.html) --- Obtener valor local (lanza excepción)
