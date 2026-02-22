---
layout: docs
lang: es
path_key: "/docs/reference/await-all-or-fail.html"
nav_active: docs
permalink: /es/docs/reference/await-all-or-fail.html
page_title: "await_all_or_fail()"
description: "await_all_or_fail() — espera a que todas las tareas se completen; lanza una excepción ante el primer error."
---

# await_all_or_fail

(PHP 8.6+, True Async 1.0)

`await_all_or_fail()` — Espera a que **todas** las tareas se completen exitosamente. Ante el primer error, lanza una excepción y cancela las tareas restantes.

## Descripción

```php
await_all_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Parámetros

**`triggers`**
Una colección iterable de objetos `Async\Completable` (corrutinas, Futures, etc.).

**`cancellation`**
Un Awaitable opcional para cancelar toda la espera (p. ej., `timeout()`).

**`preserveKeyOrder`**
Si es `true` (por defecto), los resultados se devuelven en el orden de claves del array de entrada. Si es `false`, en orden de finalización.

## Valores de retorno

Un array de resultados de todas las tareas. Las claves corresponden a las claves del array de entrada.

## Errores/Excepciones

Lanza la excepción de la primera tarea que falló.

## Ejemplos

### Ejemplo #1 Carga de datos en paralelo

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

$results = await_all_or_fail([
    'users'    => spawn(file_get_contents(...), 'https://api/users'),
    'orders'   => spawn(file_get_contents(...), 'https://api/orders'),
    'products' => spawn(file_get_contents(...), 'https://api/products'),
]);

// $results['users'], $results['orders'], $results['products']
?>
```

### Ejemplo #2 Con timeout

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail($coroutines, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "No todas las tareas se completaron en 5 segundos\n";
}
?>
```

### Ejemplo #3 Con Iterator en lugar de array

Todas las funciones de la familia `await_*` aceptan no solo arrays sino cualquier `iterable`, incluyendo implementaciones de `Iterator`. Esto permite generar corrutinas dinámicamente:

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

class UrlIterator implements \Iterator {
    private array $urls;
    private int $pos = 0;

    public function __construct(array $urls) { $this->urls = $urls; }
    public function current(): mixed {
        return spawn(file_get_contents(...), $this->urls[$this->pos]);
    }
    public function key(): int { return $this->pos; }
    public function next(): void { $this->pos++; }
    public function valid(): bool { return isset($this->urls[$this->pos]); }
    public function rewind(): void { $this->pos = 0; }
}

$iterator = new UrlIterator([
    'https://api.example.com/a',
    'https://api.example.com/b',
    'https://api.example.com/c',
]);

$results = await_all_or_fail($iterator);
?>
```

## Ver también

- [await_all()](/es/docs/reference/await-all.html) — todas las tareas con tolerancia a errores
- [await()](/es/docs/reference/await.html) — espera de una sola tarea
