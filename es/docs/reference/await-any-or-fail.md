---
layout: docs
lang: es
path_key: "/docs/reference/await-any-or-fail.html"
nav_active: docs
permalink: /es/docs/reference/await-any-or-fail.html
page_title: "await_any_or_fail()"
description: "await_any_or_fail() — espera a la primera tarea completada."
---

# await_any_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_or_fail()` — Espera a que se complete la **primera** tarea. Si la primera tarea completada lanzó una excepción, esta se propaga.

## Descripción

```php
await_any_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): mixed
```

## Parámetros

**`triggers`**
Una colección iterable de objetos `Async\Completable`.

**`cancellation`**
Un Awaitable opcional para cancelar la espera.

## Valores de retorno

El resultado de la primera tarea completada.

## Errores/Excepciones

Si la primera tarea completada lanzó una excepción, esta será propagada.

## Ejemplos

### Ejemplo #1 Carrera de solicitudes

```php
<?php
use function Async\spawn;
use function Async\await_any_or_fail;

// Gana el que responda primero
$result = await_any_or_fail([
    spawn(file_get_contents(...), 'https://mirror1.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror2.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror3.example.com/data'),
]);

echo "Respuesta recibida del espejo más rápido\n";
?>
```

## Notas

> **Nota:** El parámetro `triggers` acepta cualquier `iterable`, incluyendo implementaciones de `Iterator`. Consulte el [ejemplo con Iterator](/es/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Ver también

- [await_first_success()](/es/docs/reference/await-first-success.html) — primer éxito, ignorando errores
- [await_all_or_fail()](/es/docs/reference/await-all-or-fail.html) — todas las tareas
