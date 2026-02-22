---
layout: docs
lang: es
path_key: "/docs/reference/context/unset.html"
nav_active: docs
permalink: /es/docs/reference/context/unset.html
page_title: "Context::unset"
description: "Eliminar un valor por clave del contexto."
---

# Context::unset

(PHP 8.6+, True Async 1.0)

```php
public Context::unset(string|object $key): Context
```

Elimina un valor por clave del contexto actual. La eliminación solo afecta al contexto
local --- los valores en los contextos padre no se modifican.

El método devuelve el objeto `Context`, permitiendo el encadenamiento de métodos.

## Parámetros

**key**
: La clave a eliminar. Puede ser una cadena o un objeto.

## Valor de retorno

El objeto `Context` para encadenamiento de métodos.

## Ejemplos

### Ejemplo #1 Eliminar un valor del contexto

```php
<?php

use function Async\current_context;

current_context()
    ->set('temp_data', 'value')
    ->set('keep_data', 'preserve');

echo current_context()->find('temp_data') . "\n"; // "value"

// Eliminar datos temporales
current_context()->unset('temp_data');

var_dump(current_context()->find('temp_data')); // NULL
echo current_context()->find('keep_data') . "\n"; // "preserve"
```

### Ejemplo #2 Eliminación con clave de objeto

```php
<?php

use function Async\current_context;

$tokenKey = new stdClass();

current_context()->set($tokenKey, 'secret-token-123');
echo current_context()->find($tokenKey) . "\n"; // "secret-token-123"

// Eliminar datos sensibles después del uso
current_context()->unset($tokenKey);
var_dump(current_context()->find($tokenKey)); // NULL
```

### Ejemplo #3 La eliminación no afecta al contexto padre

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('shared', 'parent_value');

spawn(function() {
    // El contexto hijo ve el valor del padre
    echo current_context()->find('shared') . "\n"; // "parent_value"

    // Establecer un valor local con la misma clave
    current_context()->set('shared', 'child_value', replace: true);
    echo current_context()->findLocal('shared') . "\n"; // "child_value"

    // Eliminar el valor local
    current_context()->unset('shared');

    // Después de eliminar el valor local — el valor del padre es visible nuevamente a través de find()
    echo current_context()->find('shared') . "\n"; // "parent_value"
    var_dump(current_context()->findLocal('shared')); // NULL
});
```

### Ejemplo #4 Encadenamiento de métodos con unset

```php
<?php

use function Async\current_context;

current_context()
    ->set('a', 1)
    ->set('b', 2)
    ->set('c', 3);

// Limpiar múltiples claves con encadenamiento
current_context()
    ->unset('a')
    ->unset('b');

var_dump(current_context()->find('a')); // NULL
var_dump(current_context()->find('b')); // NULL
echo current_context()->find('c') . "\n"; // 3
```

## Ver también

- [Context::set](/es/docs/reference/context/set.html) --- Establecer valor en el contexto
- [Context::find](/es/docs/reference/context/find.html) --- Buscar valor por clave
- [Context::findLocal](/es/docs/reference/context/find-local.html) --- Buscar valor en el contexto local
