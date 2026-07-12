---
layout: tutorial
lang: es
path_key: "/tutors/11-task-set.html"
nav_active: docs
permalink: /es/tutors/11-task-set.html
page_title: "TaskSet"
description: "TaskSet: un flujo autolimpiante de tareas, joinNext/joinAny/joinAll y un bucle supervisor."
---

# TaskSet

El capítulo anterior reveló que `TaskGroup` lo recuerda todo. Eso no es un accidente,
es una propiedad en la que puedes confiar: no importa cuántas veces le pidas resultados al grupo,
obtienes la misma respuesta. Este comportamiento se llama idempotencia, y ya nos lo hemos encontrado antes:
un `await` repetido sobre una corrutina devuelve el mismo resultado cada vez.

Pero la memoria tiene un precio. Ejecuta cien mil tareas a través de un grupo, y las cien mil
resultados se quedan dentro de él, aunque cada uno solo se necesitara una vez, en el momento en que quedó
listo. Para una tubería que corre durante horas, eso no es almacenamiento, es una fuga.

Lo que hace falta es un gemelo de `TaskGroup` con el temperamento opuesto: entregar el resultado y
olvidarlo. Se llama `TaskSet`.

## Consumir en lugar de almacenar

En la superficie todo se ve igual: `spawn`, `close`, un límite de concurrencia. La diferencia
está en lo que le pasa a un resultado después de entregarse:

```php
use Async\TaskSet;

$set = new TaskSet();

$set->spawn(fn() => 'alpha');
$set->spawn(fn() => 'beta');
$set->spawn(fn() => 'gamma');

echo $set->joinNext()->await(); // alpha
echo $set->joinNext()->await(); // beta, ¡ya es uno diferente!
echo $set->joinNext()->await(); // gamma

echo $set->count(); // 0, el conjunto está vacío
```

Cada llamada a `joinNext()` devuelve el siguiente resultado listo y elimina su entrada del conjunto.
Compáralo con el `race()` de `TaskGroup`, que devuelve el mismo primer ganador sin importar cuántas
veces lo llames. `TaskSet` no se comporta como un almacenamiento sino como una cola: lo lees y desaparece.
Sí, esa es la misma semántica que `recv` del capítulo de canales, salvo que ahora la cola contiene
no valores sino tareas que se completan.

Los métodos de espera de los gemelos riman entre sí:

- **`joinNext()`** — como `race()`: el primero en terminar, con su entrada eliminada.
- **`joinAny()`** — como `any()`: el primero con éxito, con su entrada eliminada.
- **`joinAll()`** — como `all()`: todos los resultados a la vez, con el conjunto vaciado.

El prefijo `join` insinúa la diferencia por sí mismo: un resultado no solo se lee, se retira.

## Una tubería sin fuga

Reescribamos la importación de cien mil filas con lo que ahora sabemos:

```php
$set = new TaskSet(concurrency: 10);

spawn(function () use ($set, $handle, $addressIndex) {
    while (($row = fgetcsv($handle)) !== false) {
        $set->spawn(fn() => checkAddress($row[$addressIndex]));
    }
    $set->close();
});

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        error_log("Dirección no verificada: {$error->getMessage()}");
        continue;
    }
    saveAddress($pdo, $result);
}
```

Una corrutina lee el archivo y sigue alimentándolo con tareas, mientras el flujo principal procesa los resultados
a medida que quedan listos. Cada entrada procesada se elimina de inmediato del conjunto, así que la memoria solo
retiene las tareas en vuelo: diez en ejecución más la cola. El archivo puede tener cualquier tamaño; el uso de memoria
no depende de él.

Fíjate en cómo detalles familiares se han unido en una nueva imagen: un límite de concurrencia en lugar
de un pool de workers hecho a mano, `close()` como la señal de que "no vienen más tareas", el
par `[$result, $error]` en lugar de excepciones tragadas en silencio, y el `PDO` del capítulo
nueve, imperturbable ante llamadas concurrentes a `saveAddress`.

## Supervisor

Hay un segundo escenario donde esta semántica de consumo es indispensable: código que vigila
tareas de larga vida y reacciona cuando terminan.

```php
$set = new TaskSet();

$set->spawnWithKey('mailer',  runMailer(...));
$set->spawnWithKey('metrics', runMetrics(...));
$set->spawnWithKey('cleaner', runCleaner(...));

foreach ($set as $key => [$result, $error]) {
    error_log("El servicio $key se detuvo" . ($error ? ": {$error->getMessage()}" : ''));

    // reinicia el servicio que se cayó
    $set->spawnWithKey($key, restartService($key));
}
```

El conjunto nunca se cierra, así que el `foreach` nunca termina, simplemente espera el siguiente evento. Cada
entrada procesada se elimina, el servicio reiniciado se añade de nuevo en su lugar, y el bucle vive
para siempre. El supervisor no necesita un historial de cada finalización desde el principio de los tiempos; necesita
exactamente esto: uno de sus vigilados se detuvo, ve a averiguar por qué y reinícialo. No podrías
escribir este bucle con `TaskGroup`: su `foreach` volvería a empezar desde el primer servicio que
se detuvo, cada vez.

Así que esa es, en esencia, toda la diferencia entre los gemelos: la memoria. Un grupo almacena resultados
y responde cualquier pregunta sobre ellos repetidamente, lo que lo hace bueno para casos donde el conjunto de
tareas es fijo y los resultados importan en su totalidad. Un conjunto entrega cada resultado una vez e
inmediatamente libera la memoria, y por eso puede manejar un flujo interminable de tareas. Hay una
regla simple para elegir: si tu pregunta a las tareas es "¿qué se te ocurrió?", recurre a
`TaskGroup`; si es "¿qué sigue?", recurre a `TaskSet`.

A lo largo de los últimos cuatro capítulos hemos construido lo mismo tres veces: recorrer una colección, haciendo
trabajo concurrente sobre cada elemento bajo un límite. Una vez con un canal y workers, una vez con
`TaskGroup`, una vez con `TaskSet`. ¿No es hora de que este patrón tenga un nombre propio y se encoja
hasta caber en una sola línea?
