---
layout: tutorial
lang: es
path_key: "/tutors/12-iterate.html"
nav_active: docs
permalink: /es/tutors/12-iterate.html
page_title: "Iterador Concurrente"
description: "iterate(): recorrido concurrente de colecciones en una sola línea, generadores y salida anticipada."
---

# Iterador Concurrente

Contemos cuántas veces hemos construido el mismo patrón. En el capítulo de canales: un canal,
diez workers, un bucle `recv`. En el capítulo de TaskGroup: `concurrency: 10`, un bucle `spawn`,
`close()`. En el capítulo de TaskSet: lo mismo, pero consumiendo resultados. Cada vez, la tarea
sonaba igual: recorrer una colección, hacer trabajo concurrente sobre cada elemento, y nunca exceder el
límite.

Un patrón tan común merece una función propia:

```php
use function Async\iterate;

iterate($addresses, checkAddress(...), concurrency: 10);
```

Y ese es todo el pool de workers. `iterate` llama a la función por cada elemento de la
colección en su propia corrutina, se asegura de que no corran más de diez de forma concurrente, y devuelve
el control una vez que todo se ha procesado.

## Un generador en lugar de un array

Espera, ¿qué pasa con la lectura del archivo? Recopilar cien mil direcciones en un array solo
para llamar a `iterate` sería un paso atrás: la contrapresión del capítulo de canales fue
lo que nos ahorró memoria. No hay problema: `iterate` acepta no solo un array sino cualquier `Traversable`,
incluidos los generadores:

```php
function addresses(string $path): Generator
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);
    $addressIndex = array_search('address', $header);

    while (($row = fgetcsv($handle)) !== false) {
        yield $row[$addressIndex];
    }

    fclose($handle);
}

iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
```

El generador lee el archivo de forma perezosa, una línea a la vez. `iterate` solo extrae la siguiente dirección
una vez que se libera un hueco, así que el archivo nunca se retiene en memoria de golpe. Es la misma
contrapresión que te da un canal con búfer, salvo que ahora es invisible: todo lo que queda es una
sola línea que expresa la intención.

## Salida anticipada

La función manejadora puede detener todo el recorrido devolviendo `false`:

```php
$broken = 0;

iterate(addresses('users.csv'), function (string $address) use (&$broken) {
    if (!checkAddress($address)) {
        $broken++;
    }

    if ($broken >= 100) {
        return false; // el archivo está corrupto, no tiene sentido continuar
    }
}, concurrency: 10);
```

Cien direcciones inválidas seguidas es una señal fiable de que nos han pasado el archivo equivocado. No
se inician nuevos elementos después del `false`, las corrutinas que ya están corriendo terminan lo que están haciendo,
e `iterate` retorna.

Las excepciones son más estrictas, y ya conoces la regla del capítulo de Scope: un error en cualquier manejador detiene
el recorrido, cancela las corrutinas restantes, y se propaga hacia afuera. Fallar juntos por
defecto:

```php
try {
    iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
} catch (RemoteApiException $e) {
    echo "Importación abortada: {$e->getMessage()}\n";
}
```

No hay magia detrás de esto: dentro de `iterate` vive un scope hijo común del capítulo ocho,
y es él quien mantiene todo en orden.

## Una escalera de abstracciones

A lo largo de seis capítulos ha ido tomando forma toda una escalera, y vale la pena repasarla una vez más,
de abajo hacia arriba:

- **Un canal + Scope** — las primitivas. Cualquier topología: pools, tuberías, encuentros,
  supervisores. Máximo control, máximo código.
- **`TaskGroup` / `TaskSet`** — ensamblajes listos para un conjunto de tareas, cuando necesitas
  resultados: todos, el primero, el primero con éxito, o de uno en uno a medida que quedan listos.
- **`iterate()`** — una sola línea, cuando no necesitas el resultado y solo necesitas recorrer una
  colección de forma concurrente.

Cuanto más arriba en la escalera, menos código y más estrecho el escenario. Empieza por arriba: si
`iterate` es suficiente, no hay razón para construir un grupo; si un grupo no es suficiente, baja a
los canales. Abajo puedes ensamblar cualquier construcción que te guste; arriba, todo está
ya ensamblado para ti.

Fíjate en lo que le pasó a nuestra importación: capítulo tras capítulo siguió encogiéndose, hasta que por fin
cupo en una sola línea. Así es exactamente como debería ser. La concurrencia deja de ser un evento y
se convierte en una herramienta común, igual que `foreach`.

Pero todavía queda una pregunta pendiente del capítulo nueve. Para PDO, el pool de conexiones está integrado en
el núcleo, mientras que `checkAddress` habla con `GeoDirectory` por HTTP. Sus conexiones también vale la pena
reutilizarlas, y no solo las suyas: sockets, clientes, objetos pesados en general. ¿De verdad tenemos que
construir a mano un pool a partir de un canal cada vez? Por suerte, no, y el siguiente capítulo te
mostrará por qué.
