---
layout: tutorial
lang: es
path_key: "/tutors/14-threads.html"
nav_active: docs
permalink: /es/tutors/14-threads.html
page_title: "Hilos"
description: "spawn_thread y ThreadPool: paralelismo real para el cálculo, aislamiento y copia de datos."
---

# Hilos

Todas nuestras herramientas hasta ahora han vivido dentro de un solo hilo del sistema operativo. Las corrutinas creaban
la impresión de que las cosas ocurrían a la vez, pero en cualquier momento dado exactamente una de ellas estaba
realmente ejecutándose. Para el trabajo de importación y las peticiones a `GeoDirectory`, eso era más que
suficiente: las tareas en su mayoría esperaban, y la espera se divide de maravilla.

Ahora aquí hay un tipo de tarea diferente. Una vez al día, `ProfileService` construye un informe anual: un
minuto entero de puro cálculo, sin una sola llamada de red o de base de datos. Ejecutémoslo en una
corrutina, junto a nuestro familiar ticker:

```php
spawn(function () {
    while (true) {
        echo "tick\n";
        delay(1000);
    }
});

spawn(function () {
    $report = buildYearlyReport($rows); // un minuto de puro cálculo
    echo "report ready\n";
});
```

El ticker enmudece durante un minuto entero. Recuerda el capítulo uno: las corrutinas cambian en puntos de
await, en `sleep`, `delay`, E/S. Pero `buildYearlyReport` no tiene un solo punto de await,
solo bucles y aritmética. El planificador nunca recupera el control, y todo el proceso,
ticker, workers, manejo de peticiones, todo, simplemente se queda ahí mirando cómo una corrutina tritura
números.

Las corrutinas te dan concurrencia, no paralelismo. Cuando una tarea está limitada por la CPU en lugar de por la
espera, necesitas un segundo procesador. O más precisamente, un segundo hilo del sistema operativo.

## spawn_thread

```php
use function Async\spawn_thread;
use function Async\await;

$thread = spawn_thread(fn() => buildYearlyReport($rows));

$report = await($thread);
```

`spawn_thread` lanza el closure en un hilo separado del sistema operativo, en un núcleo de CPU distinto.
El informe ahora se calcula de verdad en paralelo: el ticker sigue haciendo tic, los workers siguen
trabajando, y el planificador no tiene ni idea de que hay trabajo pesado ocurriendo justo al lado.

Desde fuera, un hilo se ve casi como una corrutina: puedes pasarlo al familiar
`await`, que suspende solo la corrutina que espera. Una excepción del hilo también llega a `await`,
envuelta en `Async\RemoteException`.

## Nada en común

Casi como una corrutina, pero con una diferencia fundamental. En el capítulo de canales dijimos
que las corrutinas viven en memoria compartida, puedes simplemente entregar un objeto a través de `use`, y las carreras de
datos no ocurren dentro de un solo hilo. Bueno, ese truco no funciona con los hilos. Cada
hilo tiene su propio entorno PHP: sus propias variables, sus propias clases, sus propias propiedades
estáticas. No hay memoria compartida en absoluto.

Por eso todo lo que se pasa a un hilo se copia por completo:

```php
$rows = loadRows();

$thread = spawn_thread(function () use ($rows) {
    // esto es una COPIA de $rows: los cambios aquí no son visibles fuera
    return buildYearlyReport($rows);
});
```

Esta regla trae restricciones también: no puedes pasar una referencia PHP (`&$var`), un recurso
como un archivo abierto, o un objeto con propiedades dinámicas a un hilo. Intentar hacerlo
lanza `ThreadTransferException` de inmediato, al principio, en lugar de causar comportamiento
misterioso más tarde.

Las reglas son estrictas, pero son honestas: sin estado compartido, no hay carreras, cerrojos,
mutexes, ni ninguna de las demás pesadillas del multithreading clásico. Los hilos de TrueAsync se comunican
de la misma forma que las corrutinas: pasando valores, no compartiendo memoria.

Por cierto, un viejo conocido sabe cómo cruzar la frontera del hilo de forma significativa.
`FutureState` del capítulo seis puede pasarse a un hilo mientras su `Future` se queda atrás:

```php
$state  = new FutureState();
$future = new Future($state);

spawn_thread(function () use ($state) {
    $state->complete(buildYearlyReport(loadRows()));
});

$report = await($future);
```

El productor está en un hilo, el consumidor en otro, y el contrato es exactamente el mismo.
Por eso `Future` se dividió en dos objetos separados en primer lugar: la frontera
entre ellos resultó ser lo bastante sólida como para trazar una frontera de hilo justo a lo largo de ella.

## ThreadPool

Un hilo es una entidad cara: hay que crear, inicializar y calentar su propio entorno PHP.
Una tarea por minuto, claro, sin problema, pero arrancar un hilo para cada tarea diminuta es
tan derrochador como abrir una conexión de base de datos en cada petición.

Ya sabes qué hacer con los recursos caros. Correcto, ponlos en un pool:

```php
use Async\ThreadPool;

$pool = new ThreadPool(workers: 8);

$futures = [];
foreach ($uploads as $path) {
    $futures[] = $pool->submit(makeThumbnail(...), $path);
}

foreach ($futures as $future) {
    echo await($future), "\n";
}

$pool->close();
```

Ocho hilos worker se crean una vez y viven tanto como el pool. `submit` pone una tarea en
la cola, un worker libre la recoge y devuelve el resultado. Y mira lo que devuelve `submit`:
un `Future`, una promesa de un resultado que producirá alguien más. En el capítulo seis ese "alguien
más" era una corrutina; ahora es un hilo separado entero, y el contrato no ha cambiado ni
un ápice.

La cola del pool tiene un límite, y una vez que se llena, `submit` suspende la corrutina llamante.
¿La reconoces? Es la contrapresión del capítulo de canales: el productor de tareas se
acompasa automáticamente a la velocidad de los workers.

Mantén el número de workers cerca del número de núcleos de CPU: a diferencia de la espera, el cálculo necesita
núcleos físicos reales, y veinte hilos en ocho núcleos solo se estorbarán unos a otros.
Por defecto, sin el parámetro `workers`, el pool averigua el paralelismo disponible
por su cuenta, teniendo en cuenta incluso las cuotas de los contenedores.

Y para el caso más común, "procesar una lista en paralelo", hay una forma de una línea que ya
conoces de `iterate`:

```php
$thumbs = $pool->map($uploads, makeThumbnail(...));
```

`map` distribuye los elementos entre los workers, espera a todos, y devuelve los resultados
en su orden original.

Así que resulta que la concurrencia tiene dos dimensiones. Las corrutinas comprimen la espera: miles de tareas
comparten un solo hilo y no se estorban entre sí mientras esperan. Los hilos añaden verdadero
paralelismo: el cálculo se reparte entre los núcleos de CPU. Estas herramientas no compiten entre
sí, se complementan: donde el código espera, recurre a una corrutina; donde calcula,
recurre a un hilo; y una vez que tienes muchos de cualquiera de los dos, un pool acude al rescate.

Por último, echa un vistazo a en qué se ha convertido nuestro proceso: cientos de corrutinas, todas mezcladas
entre sí, sirviendo a distintos usuarios, tareas saltando entre workers e hilos. Y en esa multitud,
una pregunta simple resulta ser sorprendentemente difícil: ¿dónde guardas "el actual"? El
usuario actual, el idioma actual, el ID de la petición? Hay una variable global para todos,
y hay miles de corrutinas. De eso trata el capítulo final.
