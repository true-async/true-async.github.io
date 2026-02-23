---
layout: docs
lang: es
path_key: "/docs/components/task-set.html"
nav_active: docs
permalink: /es/docs/components/task-set.html
page_title: "Async\\TaskSet"
description: "Async\\TaskSet — un conjunto dinámico de tareas con limpieza automática de resultados tras su entrega."
---

# La clase Async\TaskSet

(PHP 8.6+, True Async 1.0)

## Introducción

`TaskGroup` es perfecto para escenarios donde el objetivo son los resultados, no las tareas en sí.
Sin embargo, hay muchas situaciones en las que se necesita controlar la cantidad de tareas
mientras los resultados se consumen como un flujo.

Ejemplos típicos:

- **Supervisor**: código que monitorea tareas y reacciona a su finalización.
- **Pool de coroutines**: un número fijo de coroutines procesando datos.

**TaskSet** está diseñado para resolver estos problemas. Elimina automáticamente las tareas completadas
en el momento de la entrega del resultado mediante `joinNext()`, `joinAll()`, `joinAny()` o `foreach`.

## Diferencias con TaskGroup

| Propiedad                 | TaskGroup                            | TaskSet                                    |
|---------------------------|--------------------------------------|--------------------------------------------|
| Almacenamiento de resultados | Todos los resultados hasta solicitud explícita | Eliminados tras la entrega              |
| Llamadas repetidas a métodos | Idempotente — mismo resultado       | Cada llamada — siguiente elemento          |
| `count()`                 | Número total de tareas               | Número de tareas no entregadas             |
| Métodos de espera         | `all()`, `race()`, `any()`           | `joinAll()`, `joinNext()`, `joinAny()`     |
| Iteración                 | Las entradas permanecen              | Las entradas se eliminan tras `foreach`    |
| Caso de uso               | Conjunto fijo de tareas              | Flujo dinámico de tareas                   |

## Idempotencia vs Consumo

**La diferencia conceptual clave** entre `TaskSet` y `TaskGroup`.

**TaskGroup es idempotente.** Las llamadas a `race()`, `any()`, `all()` siempre devuelven
el mismo resultado. La iteración mediante `foreach` siempre recorre todas las tareas.
Los resultados se almacenan en el grupo y están disponibles para acceso repetido:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => "alpha");
$group->spawn(fn() => "beta");
$group->spawn(fn() => "gamma");
$group->seal();

// race() siempre devuelve la misma primera tarea completada
$first  = $group->race()->await(); // "alpha"
$same   = $group->race()->await(); // "alpha" — ¡mismo resultado!

// all() siempre devuelve el array completo
$all1 = $group->all()->await(); // ["alpha", "beta", "gamma"]
$all2 = $group->all()->await(); // ["alpha", "beta", "gamma"] — ¡mismo array!

// foreach siempre recorre todos los elementos
foreach ($group as $key => [$result, $error]) { /* 3 iteraciones */ }
foreach ($group as $key => [$result, $error]) { /* de nuevo 3 iteraciones */ }

echo $group->count(); // 3 — siempre 3
```

**TaskSet es consumidor.** Cada llamada a `joinNext()` / `joinAny()` extrae
el siguiente elemento y lo elimina del conjunto. Un `foreach` repetido no encontrará
las entradas ya entregadas. Este comportamiento es análogo a leer de una cola o canal:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");

// joinNext() devuelve el SIGUIENTE resultado cada vez
$first  = $set->joinNext()->await(); // "alpha"
$second = $set->joinNext()->await(); // "beta" — ¡resultado diferente!
$third  = $set->joinNext()->await(); // "gamma"

echo $set->count(); // 0 — el conjunto está vacío

// joinAll() tras consumo completo — array vacío
$set->seal();
$rest = $set->joinAll()->await(); // [] — nada que devolver
```

La misma lógica se aplica a la iteración:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");
$set->seal();

// El primer foreach consume todos los resultados
foreach ($set as $key => [$result, $error]) {
    echo "$result\n"; // "alpha", "beta", "gamma"
}

echo $set->count(); // 0

// Segundo foreach — vacío, nada que iterar
foreach ($set as $key => [$result, $error]) {
    echo "esto no se ejecutará\n";
}
```

> **Regla:** si necesitas acceder a los resultados repetidamente — usa `TaskGroup`.
> Si los resultados se procesan una sola vez y deben liberar memoria — usa `TaskSet`.

## Semántica de los métodos Join

A diferencia de `TaskGroup`, donde `race()` / `any()` / `all()` dejan las entradas en el grupo,
`TaskSet` usa métodos con semántica **join** — resultado entregado, entrada eliminada:

- **`joinNext()`** — análogo a `race()`: resultado de la primera tarea completada (éxito o error),
  la entrada se elimina del conjunto.
- **`joinAny()`** — análogo a `any()`: resultado de la primera tarea completada *con éxito*,
  la entrada se elimina del conjunto. Los errores se omiten.
- **`joinAll()`** — análogo a `all()`: array de todos los resultados,
  todas las entradas se eliminan del conjunto.

## Limpieza automática

La limpieza automática funciona en todos los puntos de entrega de resultados:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "a");
$set->spawn(fn() => "b");
echo $set->count(); // 2

$set->joinNext()->await();
echo $set->count(); // 1

$set->joinNext()->await();
echo $set->count(); // 0
```

Al iterar mediante `foreach`, cada entrada procesada se elimina inmediatamente:

```php
$set = new Async\TaskSet();

foreach ($urls as $url) {
    $set->spawn(fn() => fetch($url));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    // $set->count() disminuye con cada iteración
    process($result);
}
```

## Límite de concurrencia

Al igual que `TaskGroup`, `TaskSet` admite limitación de concurrencia:

```php
$set = new Async\TaskSet(concurrency: 10);

foreach ($tasks as $task) {
    $set->spawn(fn() => processTask($task));
}
```

Las tareas que exceden el límite se colocan en una cola y se inician cuando un slot queda disponible.

## Sinopsis de la clase

```php
final class Async\TaskSet implements Async\Awaitable, Countable, IteratorAggregate {

    /* Métodos */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Agregar tareas */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Espera de resultados (con limpieza automática) */
    public joinNext(): Async\Future
    public joinAny(): Async\Future
    public joinAll(bool $ignoreErrors = false): Async\Future

    /* Ciclo de vida */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Estado */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Espera de finalización */
    public awaitCompletion(): void

    /* Iteración (con limpieza automática) */
    public getIterator(): Iterator
}
```

## Ejemplos

### joinAll() — carga en paralelo con limpieza automática

```php
$set = new Async\TaskSet();

$set->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$set->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$set->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$set->seal();
$data = $set->joinAll()->await();
// $set->count() === 0, todas las entradas eliminadas

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

### joinNext() — procesamiento de tareas según se completan

```php
$set = new Async\TaskSet(concurrency: 5);

foreach ($urls as $url) {
    $set->spawn(fn() => httpClient()->get($url)->getBody());
}
$set->seal();

while ($set->count() > 0) {
    $result = $set->joinNext()->await();
    echo "Got result, remaining: {$set->count()}\n";
}
```

### joinAny() — búsqueda tolerante a fallos

```php
$set = new Async\TaskSet();

$set->spawn(fn() => searchProvider1($query));
$set->spawn(fn() => searchProvider2($query));
$set->spawn(fn() => searchProvider3($query));

// Primer resultado exitoso, entrada eliminada
$result = $set->joinAny()->await();
echo "Found, active tasks: {$set->count()}\n";
```

### foreach — procesamiento en flujo

```php
$set = new Async\TaskSet(concurrency: 20);

foreach ($imageFiles as $file) {
    $set->spawn(fn() => processImage($file));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        log("Error processing $key: {$error->getMessage()}");
        continue;
    }
    saveToStorage($result);
    // Entrada eliminada, memoria liberada
}
```

### Bucle de trabajo con adición dinámica de tareas

```php
$set = new Async\TaskSet(concurrency: 10);

// Una coroutine agrega tareas
spawn(function() use ($set, $queue) {
    while ($message = $queue->receive()) {
        $set->spawn(fn() => processMessage($message));
    }
    $set->seal();
});

// Otra procesa los resultados
spawn(function() use ($set) {
    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            log("Error: {$error->getMessage()}");
        }
    }
});
```

## Equivalentes en otros lenguajes

| Característica         | PHP `TaskSet`                     | Python `asyncio`              | Kotlin                    | Go                     |
|------------------------|-----------------------------------|-------------------------------|---------------------------|------------------------|
| Conjunto dinámico      | `spawn()` + `joinNext()`          | `asyncio.as_completed()`      | `Channel` + `select`      | `errgroup` + `chan`    |
| Limpieza automática    | Automática                        | Gestión manual                | Gestión manual            | Gestión manual         |
| Límite de concurrencia | `concurrency: N`                  | `Semaphore`                   | `Semaphore`               | Buffered channel       |
| Iteración en flujo     | `foreach`                         | `async for` + `as_completed`  | `for` + `Channel`         | `for range` + `chan`   |

## Contenido

- [TaskSet::__construct](/es/docs/reference/task-set/construct.html) — Crear un conjunto de tareas
- [TaskSet::spawn](/es/docs/reference/task-set/spawn.html) — Agregar una tarea con clave auto-incremental
- [TaskSet::spawnWithKey](/es/docs/reference/task-set/spawn-with-key.html) — Agregar una tarea con clave explícita
- [TaskSet::joinNext](/es/docs/reference/task-set/join-next.html) — Obtener el resultado de la primera tarea completada
- [TaskSet::joinAny](/es/docs/reference/task-set/join-any.html) — Obtener el resultado de la primera tarea exitosa
- [TaskSet::joinAll](/es/docs/reference/task-set/join-all.html) — Esperar todas las tareas y obtener resultados
- [TaskSet::seal](/es/docs/reference/task-set/seal.html) — Sellar el conjunto para nuevas tareas
- [TaskSet::cancel](/es/docs/reference/task-set/cancel.html) — Cancelar todas las tareas
- [TaskSet::dispose](/es/docs/reference/task-set/dispose.html) — Destruir el scope del conjunto
- [TaskSet::finally](/es/docs/reference/task-set/finally.html) — Registrar un handler de finalización
- [TaskSet::isFinished](/es/docs/reference/task-set/is-finished.html) — Comprobar si todas las tareas han finalizado
- [TaskSet::isSealed](/es/docs/reference/task-set/is-sealed.html) — Comprobar si el conjunto está sellado
- [TaskSet::count](/es/docs/reference/task-set/count.html) — Obtener el número de tareas no entregadas
- [TaskSet::awaitCompletion](/es/docs/reference/task-set/await-completion.html) — Esperar a que todas las tareas se completen
- [TaskSet::getIterator](/es/docs/reference/task-set/get-iterator.html) — Iterar sobre resultados con limpieza automática
