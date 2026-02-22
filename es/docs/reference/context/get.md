---
layout: docs
lang: es
path_key: "/docs/reference/context/get.html"
nav_active: docs
permalink: /es/docs/reference/context/get.html
page_title: "Context::get"
description: "Obtener un valor del contexto. Lanza una excepción si la clave no se encuentra."
---

# Context::get

(PHP 8.6+, True Async 1.0)

```php
public Context::get(string|object $key): mixed
```

Obtiene un valor por clave del contexto actual. Si la clave no se encuentra en el nivel actual,
la búsqueda continúa subiendo por la jerarquía de contextos padre.

A diferencia de `find()`, este método lanza una excepción si la clave no se encuentra en ningún nivel.
Use `get()` cuando la presencia de un valor es un requisito obligatorio.

## Parámetros

**key**
: La clave a buscar. Puede ser una cadena o un objeto.
  Cuando se usa un objeto como clave, la búsqueda se realiza por referencia de objeto.

## Valor de retorno

El valor asociado con la clave.

## Errores

- Lanza `Async\ContextException` si la clave no se encuentra en el contexto actual
  ni en ningún contexto padre.

## Ejemplos

### Ejemplo #1 Obtener un valor requerido

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('db_connection', $pdo);

spawn(function() {
    // Obtener un valor que debe existir
    $db = current_context()->get('db_connection');
    $db->query('SELECT 1');
});
```

### Ejemplo #2 Manejo de una clave faltante

```php
<?php

use function Async\current_context;

try {
    $value = current_context()->get('missing_key');
} catch (\Async\ContextException $e) {
    echo "Clave no encontrada: " . $e->getMessage() . "\n";
}
```

### Ejemplo #3 Uso de una clave de objeto

```php
<?php

use function Async\current_context;
use function Async\spawn;

class DatabaseKey {}

$dbKey = new DatabaseKey();
current_context()->set($dbKey, new PDO('sqlite::memory:'));

spawn(function() use ($dbKey) {
    // La clave de objeto garantiza unicidad sin conflictos de nombres
    $pdo = current_context()->get($dbKey);
    $pdo->exec('CREATE TABLE test (id INTEGER)');
});
```

## Ver también

- [Context::find](/es/docs/reference/context/find.html) --- Búsqueda segura (devuelve null)
- [Context::has](/es/docs/reference/context/has.html) --- Verificar si existe la clave
- [Context::getLocal](/es/docs/reference/context/get-local.html) --- Obtener valor solo del contexto local
- [Context::set](/es/docs/reference/context/set.html) --- Establecer valor en el contexto
