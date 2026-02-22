---
layout: docs
lang: es
path_key: "/docs/reference/context/find-local.html"
nav_active: docs
permalink: /es/docs/reference/context/find-local.html
page_title: "Context::findLocal"
description: "Buscar un valor solo en el contexto local (sin buscar en contextos padre)."
---

# Context::findLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::findLocal(string|object $key): mixed
```

Busca un valor por clave **solo** en el contexto actual (local). A diferencia de `find()`,
este método no busca subiendo por la jerarquía de contextos padre.

Devuelve `null` si la clave no se encuentra en el nivel actual.

## Parámetros

**key**
: La clave a buscar. Puede ser una cadena o un objeto.

## Valor de retorno

El valor asociado con la clave en el contexto local, o `null` si la clave no se encuentra.

## Ejemplos

### Ejemplo #1 Diferencia entre find y findLocal

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('config', 'global_value');

spawn(function() {
    current_context()->set('local_data', 'local_value');

    // find() busca subiendo por la jerarquía
    echo current_context()->find('config') . "\n";       // "global_value"

    // findLocal() busca solo en el nivel actual
    echo current_context()->findLocal('local_data') . "\n"; // "local_value"
    var_dump(current_context()->findLocal('config'));        // NULL
});
```

### Ejemplo #2 Uso con clave de objeto

```php
<?php

use function Async\current_context;
use function Async\spawn;

$parentKey = new stdClass();
$localKey = new stdClass();

current_context()->set($parentKey, 'parent_value');

spawn(function() use ($parentKey, $localKey) {
    current_context()->set($localKey, 'child_value');

    // La clave de objeto del padre no es visible a través de findLocal
    var_dump(current_context()->findLocal($parentKey)); // NULL
    var_dump(current_context()->findLocal($localKey));  // "child_value"
});
```

### Ejemplo #3 Sobreescritura de un valor del padre

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('timeout', 5000);

spawn(function() {
    // Verificar si el valor está sobreescrito localmente
    if (current_context()->findLocal('timeout') === null) {
        // Usar valor heredado, pero puede sobreescribir
        current_context()->set('timeout', 3000);
    }

    echo current_context()->findLocal('timeout') . "\n"; // 3000
});
```

## Ver también

- [Context::find](/es/docs/reference/context/find.html) --- Búsqueda con recorrido jerárquico
- [Context::getLocal](/es/docs/reference/context/get-local.html) --- Obtener valor local (lanza excepción)
- [Context::hasLocal](/es/docs/reference/context/has-local.html) --- Verificar clave en el contexto local
