---
layout: docs
lang: es
path_key: "/docs/reference/await-all.html"
nav_active: docs
permalink: /es/docs/reference/await-all.html
page_title: "await_all()"
description: "await_all() — espera a todas las tareas con tolerancia a fallos parciales."
---

# await_all

(PHP 8.6+, True Async 1.0)

`await_all()` — Espera a que **todas** las tareas se completen, recopilando resultados y errores por separado. No lanza una excepción cuando tareas individuales fallan.

## Descripción

```php
await_all(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Parámetros

**`triggers`**
Una colección iterable de objetos `Async\Completable`.

**`cancellation`**
Un Awaitable opcional para cancelar toda la espera.

**`preserveKeyOrder`**
Si es `true` (por defecto), los resultados están en el orden de claves del array de entrada. Si es `false`, en orden de finalización.

**`fillNull`**
Si es `true`, se coloca `null` en el array de resultados para las tareas que fallaron. Si es `false` (por defecto), las claves con errores se omiten.

## Valores de retorno

Un array de dos elementos: `[$results, $errors]`

- `$results` — array de resultados exitosos
- `$errors` — array de excepciones (las claves corresponden a las claves de las tareas de entrada)

## Ejemplos

### Ejemplo #1 Tolerancia a fallos parciales

```php
<?php
use function Async\spawn;
use function Async\await_all;

$coroutines = [
    'fast'   => spawn(file_get_contents(...), 'https://api/fast'),
    'slow'   => spawn(file_get_contents(...), 'https://api/slow'),
    'broken' => spawn(function() { throw new \Exception('Error'); }),
];

[$results, $errors] = await_all($coroutines);

// $results contiene 'fast' y 'slow'
// $errors contiene 'broken' => Exception
foreach ($errors as $key => $error) {
    echo "La tarea '$key' falló: {$error->getMessage()}\n";
}
?>
```

### Ejemplo #2 Con fillNull

```php
<?php
[$results, $errors] = await_all($coroutines, fillNull: true);

// $results['broken'] === null (en lugar de una clave ausente)
?>
```

## Notas

> **Nota:** El parámetro `triggers` acepta cualquier `iterable`, incluyendo implementaciones de `Iterator`. Las corrutinas pueden crearse dinámicamente durante la iteración. Consulte el [ejemplo con Iterator](/es/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Ver también

- [await_all_or_fail()](/es/docs/reference/await-all-or-fail.html) — todas las tareas, error aborta
- [await_any_or_fail()](/es/docs/reference/await-any-or-fail.html) — primer resultado
