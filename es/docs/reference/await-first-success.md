---
layout: docs
lang: es
path_key: "/docs/reference/await-first-success.html"
nav_active: docs
permalink: /es/docs/reference/await-first-success.html
page_title: "await_first_success()"
description: "await_first_success() — espera a la primera tarea completada exitosamente, ignorando errores de las demás."
---

# await_first_success

(PHP 8.6+, True Async 1.0)

`await_first_success()` — Espera a que se complete la **primera tarea exitosamente**. Los errores de otras tareas se recopilan por separado y no interrumpen la espera.

## Descripción

```php
await_first_success(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): array
```

## Parámetros

**`triggers`**
Una colección iterable de objetos `Async\Completable`.

**`cancellation`**
Un Awaitable opcional para cancelar la espera.

## Valores de retorno

Un array de dos elementos: `[$result, $errors]`

- `$result` — el resultado de la primera tarea completada exitosamente (o `null` si todas las tareas fallaron)
- `$errors` — array de excepciones de las tareas que fallaron antes del primer éxito

## Ejemplos

### Ejemplo #1 Solicitud tolerante a fallos

```php
<?php
use function Async\spawn;
use function Async\await_first_success;

// Intentar múltiples servidores; tomar la primera respuesta exitosa
[$result, $errors] = await_first_success([
    spawn(file_get_contents(...), 'https://primary.example.com/api'),
    spawn(file_get_contents(...), 'https://secondary.example.com/api'),
    spawn(file_get_contents(...), 'https://fallback.example.com/api'),
]);

if ($result !== null) {
    echo "Datos recibidos\n";
} else {
    echo "Todos los servidores no disponibles\n";
    foreach ($errors as $error) {
        echo "  - " . $error->getMessage() . "\n";
    }
}
?>
```

## Notas

> **Nota:** El parámetro `triggers` acepta cualquier `iterable`, incluyendo implementaciones de `Iterator`. Consulte el [ejemplo con Iterator](/es/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Ver también

- [await_any_or_fail()](/es/docs/reference/await-any-or-fail.html) — primera tarea, error aborta
- [await_all()](/es/docs/reference/await-all.html) — todas las tareas con tolerancia a errores
