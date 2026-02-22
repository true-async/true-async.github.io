---
layout: docs
lang: es
path_key: "/docs/reference/future/completed.html"
nav_active: docs
permalink: /es/docs/reference/future/completed.html
page_title: "Future::completed"
description: "Crea un Future ya completado con un resultado."
---

# Future::completed

(PHP 8.6+, True Async 1.0)

```php
public static function completed(mixed $value = null): Future
```

Crea un `Future` ya completado con el valor especificado. Este es un método de fábrica que devuelve un `Future` que contiene inmediatamente un resultado. Útil para devolver un valor ya conocido desde funciones que retornan un `Future`.

## Parámetros

`value` — el valor con el que se completará el Future. Por defecto es `null`.

## Valor de retorno

`Future` — un Future completado con el valor especificado.

## Ejemplos

### Ejemplo #1 Crear un Future con un valor listo

```php
<?php

use Async\Future;

$future = Future::completed(42);

var_dump($future->isCompleted()); // bool(true)
var_dump($future->await());       // int(42)
```

### Ejemplo #2 Uso en una función que devuelve un Future

```php
<?php

use Async\Future;

function fetchData(string $key): Future {
    // Si los datos están en caché, devolver inmediatamente
    $cached = getFromCache($key);
    if ($cached !== null) {
        return Future::completed($cached);
    }

    // De lo contrario, iniciar una operación asíncrona
    return \Async\async(function() use ($key) {
        return loadFromDatabase($key);
    });
}

$result = fetchData('user:1')->await();
echo "Resultado: $result\n";
```

## Ver también

- [Future::failed](/es/docs/reference/future/failed.html) — Crear un Future con un error
- [Future::__construct](/es/docs/reference/future/construct.html) — Crear un Future mediante FutureState
- [Future::await](/es/docs/reference/future/await.html) — Esperar el resultado
