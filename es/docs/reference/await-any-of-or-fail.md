---
layout: docs
lang: es
path_key: "/docs/reference/await-any-of-or-fail.html"
nav_active: docs
permalink: /es/docs/reference/await-any-of-or-fail.html
page_title: "await_any_of_or_fail()"
description: "await_any_of_or_fail() — espera a las primeras N tareas completadas exitosamente."
---

# await_any_of_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_of_or_fail()` — Espera a que las **primeras N** tareas se completen exitosamente. Si una de las primeras N falla, lanza una excepción.

## Descripción

```php
await_any_of_or_fail(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Parámetros

**`count`**
El número de resultados exitosos que se esperan. Si es `0`, devuelve un array vacío.

**`triggers`**
Una colección iterable de objetos `Async\Completable`.

**`cancellation`**
Un Awaitable opcional para cancelar la espera.

**`preserveKeyOrder`**
Si es `true`, las claves de los resultados corresponden a las claves del array de entrada. Si es `false`, en orden de finalización.

## Valores de retorno

Un array de `$count` resultados exitosos.

## Errores/Excepciones

Si una tarea falla antes de alcanzar `$count` éxitos, se lanza la excepción.

## Ejemplos

### Ejemplo #1 Obtener 2 de 5 resultados

```php
<?php
use function Async\spawn;
use function Async\await_any_of_or_fail;

$coroutines = [];
for ($i = 0; $i < 5; $i++) {
    $coroutines[] = spawn(file_get_contents(...), "https://api/server-$i");
}

// Esperar cualquier 2 respuestas exitosas
$results = await_any_of_or_fail(2, $coroutines);
echo count($results); // 2
?>
```

## Notas

> **Nota:** El parámetro `triggers` acepta cualquier `iterable`, incluyendo implementaciones de `Iterator`. Consulte el [ejemplo con Iterator](/es/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Ver también

- [await_any_of()](/es/docs/reference/await-any-of.html) — primeras N con tolerancia a errores
- [await_all_or_fail()](/es/docs/reference/await-all-or-fail.html) — todas las tareas
