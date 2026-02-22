---
layout: docs
lang: es
path_key: "/docs/components/task-group.html"
nav_active: docs
permalink: /es/docs/components/task-group.html
page_title: "Async\\TaskGroup"
description: "Async\\TaskGroup -- un patron de concurrencia estructurada de alto nivel para gestionar grupos de tareas."
---

# La Clase Async\TaskGroup

(PHP 8.6+, True Async 1.0)

## Introduccion

Al trabajar con corrutinas, a menudo necesitas lanzar varias tareas y esperar sus resultados.
Usando `spawn()` y `await()` directamente, el desarrollador asume la responsabilidad de asegurar
que cada corrutina sea esperada o cancelada. Una corrutina olvidada sigue ejecutandose,
un error no manejado se pierde, y cancelar un grupo de tareas requiere codigo manual.

Las funciones `await_all()` y `await_any()` no tienen en cuenta las relaciones logicas entre diferentes tareas.
Por ejemplo, cuando necesitas hacer varias solicitudes, tomar el primer resultado y cancelar el resto,
`await_any()` requiere codigo adicional del programador para cancelar las tareas restantes.
Tal codigo puede ser bastante complejo, por lo que `await_all()` y `await_any()` deben considerarse
antipatrones en esta situacion.

Usar `Scope` para este proposito no es adecuado, ya que las corrutinas de tareas pueden crear otras corrutinas hijas,
lo que requiere que el programador mantenga una lista de corrutinas de tareas y las rastree por separado.

**TaskGroup** resuelve todos estos problemas. Es un patron de concurrencia estructurada de alto nivel
que garantiza: todas las tareas seran correctamente esperadas o canceladas. Agrupa logicamente las tareas
y permite operar sobre ellas como una unidad.

## Estrategias de Espera

`TaskGroup` proporciona varias estrategias para esperar resultados.
Cada una devuelve un `Future`, que permite pasar un tiempo de espera: `->await(Async\timeout(5.0))`.

- **`all()`** -- devuelve un `Future` que se resuelve con un array de todos los resultados de las tareas,
  o se rechaza con `CompositeException` si al menos una tarea lanzo una excepcion.
  Con el parametro `ignoreErrors: true`, devuelve solo los resultados exitosos.
- **`race()`** -- devuelve un `Future` que se resuelve con el resultado de la primera tarea completada,
  sin importar si se completo exitosamente o no. Las demas tareas continuan ejecutandose.
- **`any()`** -- devuelve un `Future` que se resuelve con el resultado de la primera tarea completada *exitosamente*,
  ignorando errores. Si todas las tareas fallaron -- se rechaza con `CompositeException`.
- **`awaitCompletion()`** -- espera la completacion total de todas las tareas, asi como otras corrutinas en el `Scope`.

## Limite de Concurrencia

Cuando se especifica el parametro `concurrency`, `TaskGroup` funciona como un pool de corrutinas:
las tareas que exceden el limite esperan en una cola y no crean una corrutina hasta que aparece un slot libre.
Esto ahorra memoria y controla la carga al procesar una gran cantidad de tareas.

## TaskGroup y Scope

`TaskGroup` usa `Scope` para gestionar el ciclo de vida de las corrutinas de tareas.
Al crear un `TaskGroup`, puedes pasar un `Scope` existente o dejar que `TaskGroup` cree un `Scope` hijo del actual.
Todas las tareas anadidas a `TaskGroup` se ejecutan dentro de este `Scope`.
Esto significa que cuando `TaskGroup` es cancelado o destruido,
todas las corrutinas seran canceladas automaticamente, asegurando la gestion segura de recursos y previniendo fugas.

## Sellado e Iteracion

`TaskGroup` permite anadir tareas dinamicamente, hasta que es
sellado usando el metodo `seal()`.

El metodo `all()` devuelve un `Future` que se activa cuando todas las tareas existentes
en la cola se han completado. Esto permite usar `TaskGroup` en un bucle, donde las tareas se anaden dinamicamente,
y `all()` se llama para obtener los resultados del conjunto actual de tareas.

`TaskGroup` tambien soporta `foreach` para iterar sobre los resultados a medida que estan listos.
En este caso, `seal()` debe llamarse despues de anadir todas las tareas para senalar que
no habra nuevas tareas, y `foreach` puede terminar despues de procesar todos los resultados.

## Resumen de la Clase

```php
final class Async\TaskGroup implements Async\Awaitable, Countable, IteratorAggregate {

    /* Metodos */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Anadir tareas */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Esperar resultados */
    public all(bool $ignoreErrors = false): Async\Future
    public race(): Async\Future
    public any(): Async\Future
    public awaitCompletion(): void

    /* Ciclo de vida */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Estado */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Resultados y errores */
    public getResults(): array
    public getErrors(): array
    public suppressErrors(): void

    /* Iteracion */
    public getIterator(): Iterator
}
```

## Ejemplos

### all() -- Carga Paralela de Datos

El escenario mas comun -- cargar datos de multiples fuentes simultaneamente:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$group->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$group->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$data = $group->all()->await();
// ['user' => ..., 'orders' => [...], 'reviews' => [...]]

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

Las tres solicitudes se ejecutan en paralelo. Si alguna de ellas lanza una excepcion,
`all()` devuelve un `Future` que se rechaza con `CompositeException`.

### race() -- Solicitudes Hedged

El patron "hedged request" -- enviar la misma solicitud a multiples replicas
y tomar la primera respuesta. Esto reduce la latencia con servidores lentos o sobrecargados:

```php
$replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];

$group = new Async\TaskGroup();

foreach ($replicas as $host) {
    $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
}

// La primera respuesta es el resultado, las demas tareas continuan ejecutandose
$product = $group->race()->await();
```

### any() -- Busqueda Tolerante a Errores

Consultar multiples proveedores, tomar la primera respuesta exitosa, ignorando errores:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => searchGoogle($query));
$group->spawn(fn() => searchBing($query));
$group->spawn(fn() => searchDuckDuckGo($query));

// any() ignora los proveedores que fallaron y devuelve el primer resultado exitoso
$results = $group->any()->await();

// Los errores de los proveedores fallidos deben manejarse explicitamente, de lo contrario el destructor lanzara una excepcion
$group->suppressErrors();
```

Si todos los proveedores fallaron, `any()` lanzara `CompositeException` con todos los errores.

### Limite de Concurrencia -- Procesamiento de una Cola

Procesar 10,000 tareas, pero no mas de 50 simultaneamente:

```php
$group = new Async\TaskGroup(concurrency: 50);

foreach ($urls as $url) {
    $group->spawn(fn() => httpClient()->get($url)->getBody());
}

$results = $group->all()->await();
```

`TaskGroup` encola automaticamente las tareas. Una corrutina se crea solo cuando
aparece un slot libre, ahorrando memoria con grandes volumenes de tareas.

### Iterar Sobre Resultados a Medida que se Completan

Procesar resultados sin esperar a que todas las tareas terminen:

```php
$group = new Async\TaskGroup();

foreach ($imageFiles as $file) {
    $group->spawn(fn() => processImage($file));
}

$group->seal();

foreach ($group as $key => $result) {
    // Los resultados llegan a medida que estan listos, no en el orden en que fueron anadidos
    saveToStorage($result);
}
```

### Tiempo de Espera para un Grupo de Tareas

Limitar el tiempo de espera para los resultados:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => slowApi()->fetchReport());
$group->spawn(fn() => anotherApi()->fetchStats());
$group->seal();

try {
    $results = $group->all()->await(Async\timeout(5.0));
} catch (Async\TimeoutException) {
    echo "No se pudieron obtener los datos en 5 segundos";
}
```

## Analogos en Otros Lenguajes

| Capacidad               | PHP `TaskGroup`                     | Python `asyncio.TaskGroup`      | Java `StructuredTaskScope`               | Kotlin `coroutineScope`   |
|--------------------------|-------------------------------------|---------------------------------|------------------------------------------|---------------------------|
| Concurrencia estructurada | `seal()` + `all()->await()`        | Bloque `async with`             | `try-with-resources` + `join()`          | Automaticamente via scope |
| Estrategias de espera    | `all()`, `race()`, `any()` -> Future | Solo all (via `async with`)    | `ShutdownOnSuccess`, `ShutdownOnFailure` | `async`/`await`, `select` |
| Limite de concurrencia   | `concurrency: N`                    | No (necesita `Semaphore`)       | No                                       | No (necesita `Semaphore`) |
| Iteracion de resultados  | `foreach` a medida que completan    | No                              | No                                       | `Channel`                 |
| Manejo de errores        | `CompositeException`, `getErrors()` | `ExceptionGroup`               | `throwIfFailed()`                        | La excepcion cancela el scope |

PHP `TaskGroup` combina capacidades que en otros lenguajes estan distribuidas en multiples primitivas:
limitacion de concurrencia sin semaforo, multiples estrategias de espera en un solo objeto, e iteracion de resultados a medida que se completan.

## Contenido

- [TaskGroup::__construct](/es/docs/reference/task-group/construct.html) -- Crear un grupo de tareas
- [TaskGroup::spawn](/es/docs/reference/task-group/spawn.html) -- Anadir una tarea con clave auto-incremental
- [TaskGroup::spawnWithKey](/es/docs/reference/task-group/spawn-with-key.html) -- Anadir una tarea con clave explicita
- [TaskGroup::all](/es/docs/reference/task-group/all.html) -- Esperar todas las tareas y obtener resultados
- [TaskGroup::race](/es/docs/reference/task-group/race.html) -- Obtener el resultado de la primera tarea completada
- [TaskGroup::any](/es/docs/reference/task-group/any.html) -- Obtener el resultado de la primera tarea exitosa
- [TaskGroup::awaitCompletion](/es/docs/reference/task-group/await-completion.html) -- Esperar a que todas las tareas completen
- [TaskGroup::seal](/es/docs/reference/task-group/seal.html) -- Sellar el grupo para nuevas tareas
- [TaskGroup::cancel](/es/docs/reference/task-group/cancel.html) -- Cancelar todas las tareas
- [TaskGroup::dispose](/es/docs/reference/task-group/dispose.html) -- Destruir el scope del grupo
- [TaskGroup::finally](/es/docs/reference/task-group/finally.html) -- Registrar un manejador de finalizacion
- [TaskGroup::isFinished](/es/docs/reference/task-group/is-finished.html) -- Verificar si todas las tareas han terminado
- [TaskGroup::isSealed](/es/docs/reference/task-group/is-sealed.html) -- Verificar si el grupo esta sellado
- [TaskGroup::count](/es/docs/reference/task-group/count.html) -- Obtener el numero de tareas
- [TaskGroup::getResults](/es/docs/reference/task-group/get-results.html) -- Obtener un array de resultados exitosos
- [TaskGroup::getErrors](/es/docs/reference/task-group/get-errors.html) -- Obtener un array de errores
- [TaskGroup::suppressErrors](/es/docs/reference/task-group/suppress-errors.html) -- Marcar errores como manejados
- [TaskGroup::getIterator](/es/docs/reference/task-group/get-iterator.html) -- Iterar sobre resultados a medida que se completan
