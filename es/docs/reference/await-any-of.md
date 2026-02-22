---
layout: docs
lang: es
path_key: "/docs/reference/await-any-of.html"
nav_active: docs
permalink: /es/docs/reference/await-any-of.html
page_title: "await_any_of()"
description: "await_any_of() — espera a las primeras N tareas con tolerancia a fallos parciales."
---

# await_any_of

(PHP 8.6+, True Async 1.0)

`await_any_of()` — Espera a que se completen las **primeras N** tareas, recopilando resultados y errores por separado. No lanza una excepción cuando tareas individuales fallan.

## Descripción

```php
await_any_of(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Parámetros

**`count`**
El número de resultados exitosos que se esperan.

**`triggers`**
Una colección iterable de objetos `Async\Completable`.

**`cancellation`**
Un Awaitable opcional para cancelar la espera.

**`preserveKeyOrder`**
Si es `true`, las claves de los resultados corresponden a las claves del array de entrada.

**`fillNull`**
Si es `true`, se coloca `null` en el array de resultados para las tareas que fallaron.

## Valores de retorno

Un array de dos elementos: `[$results, $errors]`

- `$results` — array de resultados exitosos (hasta `$count` elementos)
- `$errors` — array de excepciones de las tareas que fallaron

## Ejemplos

### Ejemplo #1 Quórum con tolerancia a errores

```php
<?php
use function Async\spawn;
use function Async\await_any_of;

$nodes = ['node1', 'node2', 'node3', 'node4', 'node5'];

$coroutines = [];
foreach ($nodes as $node) {
    $coroutines[$node] = spawn(file_get_contents(...), "https://$node/vote");
}

// Esperar quórum: 3 de 5 respuestas
[$results, $errors] = await_any_of(3, $coroutines);

if (count($results) >= 3) {
    echo "Quórum alcanzado\n";
} else {
    echo "Quórum no alcanzado, errores: " . count($errors) . "\n";
}
?>
```

## Notas

> **Nota:** El parámetro `triggers` acepta cualquier `iterable`, incluyendo implementaciones de `Iterator`. Consulte el [ejemplo con Iterator](/es/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Ver también

- [await_any_of_or_fail()](/es/docs/reference/await-any-of-or-fail.html) — primeras N, error aborta
- [await_all()](/es/docs/reference/await-all.html) — todas las tareas con tolerancia a errores
