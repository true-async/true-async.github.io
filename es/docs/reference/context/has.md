---
layout: docs
lang: es
path_key: "/docs/reference/context/has.html"
nav_active: docs
permalink: /es/docs/reference/context/has.html
page_title: "Context::has"
description: "Verificar si una clave existe en el contexto actual o en el contexto padre."
---

# Context::has

(PHP 8.6+, True Async 1.0)

```php
public Context::has(string|object $key): bool
```

Verifica si existe un valor con la clave especificada en el contexto actual o en uno
de los contextos padre. La búsqueda se realiza subiendo por la jerarquía.

## Parámetros

**key**
: La clave a verificar. Puede ser una cadena o un objeto.

## Valor de retorno

`true` si la clave se encuentra en el contexto actual o en cualquier contexto padre, `false` en caso contrario.

## Ejemplos

### Ejemplo #1 Verificar una clave antes de usarla

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('locale', 'ru_RU');

spawn(function() {
    if (current_context()->has('locale')) {
        $locale = current_context()->find('locale');
        echo "Locale: {$locale}\n"; // "Locale: ru_RU"
    } else {
        echo "Locale no configurado, usando valor por defecto\n";
    }
});
```

### Ejemplo #2 Verificación con clave de objeto

```php
<?php

use function Async\current_context;

$cacheKey = new stdClass();

current_context()->set($cacheKey, new RedisCache());

if (current_context()->has($cacheKey)) {
    echo "Caché disponible\n";
}

$unknownKey = new stdClass();
var_dump(current_context()->has($unknownKey)); // false
```

### Ejemplo #3 Verificación jerárquica

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('global_flag', true);

spawn(function() {
    current_context()->set('local_flag', true);

    spawn(function() {
        var_dump(current_context()->has('global_flag')); // true (desde la raíz)
        var_dump(current_context()->has('local_flag'));   // true (desde el padre)
        var_dump(current_context()->has('unknown'));      // false
    });
});
```

## Ver también

- [Context::find](/es/docs/reference/context/find.html) --- Buscar valor por clave
- [Context::get](/es/docs/reference/context/get.html) --- Obtener valor (lanza excepción)
- [Context::hasLocal](/es/docs/reference/context/has-local.html) --- Verificar solo en el contexto local
