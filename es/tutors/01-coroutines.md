---
layout: tutorial
lang: es
path_key: "/tutors/01-coroutines.html"
nav_active: docs
permalink: /es/tutors/01-coroutines.html
page_title: "Corrutinas"
description: "Un primer vistazo a las corrutinas: spawn() y ejecución concurrente."
---

# Crear corrutinas

```php
function counter(string $name): void {
    for ($i = 1; $i <= 5; $i++) {
        echo "$name: $i\n";
        sleep(1);
    }
}

counter('A');
```

La función `counter` imprime un contador en la pantalla con una pausa de un segundo:

```bash
A: 1
A: 2
A: 3
A: 4
A: 5
```

Cada vez que se llama a `sleep`, el hilo de PHP se duerme durante la duración indicada.
Durante ese tiempo, literalmente no hace nada.
El script de PHP se ejecuta durante 5 segundos, exactamente el mismo tiempo que la propia función espera.

¿Qué ocurre si ejecutamos la función `counter` dentro de una corrutina?

```php
use function Async\spawn;

spawn(counter(...), 'B');
counter('A');
```

Ahora la salida se alterna:
```bash
A: 1
B: 1
A: 2
B: 2
A: 3
B: 3
A: 4
B: 4
A: 5
B: 5
```

El tiempo total de ejecución del script sigue siendo de unos 5 segundos, pero ahora el script se comporta como si estuviera ejecutando dos funciones "de forma concurrente".
Entonces, ¿qué está pasando en realidad?

`spawn` crea un segundo hilo lógico de control, "B", dentro del cual se ejecuta la función `counter`.
Cuando el hilo "A" llega a `sleep`, en lugar de bloquear todo PHP, cede el control al otro hilo
lógico, "B". Y así sucesivamente:

```text
A sleep -> B
B sleep -> A
A sleep -> B
...
```

## ¿Cuál es el beneficio?

Imagina que la función `counter` es código secuencial ordinario que realiza operaciones de E/S y
trabajo con temporizadores (`sleep`). Las operaciones de E/S las gestiona el núcleo del sistema operativo, así que el código PHP tiene que
esperarlas. Mientras tanto, PHP podría estar haciendo otra cosa.
Las corrutinas te permiten aprovechar ese tiempo de espera con trabajo útil, sin crear procesos separados, hilos,
sincronización, condiciones de carrera y los muchos otros horrores de la programación en paralelo.

Veamos un ejemplo práctico:

```php
function processUsers(string $path, &$counter): void 
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);

    $loginIndex = array_search('login', $header);
    $emailIndex = array_search('email', $header);

    while (($row = fgetcsv($handle)) !== false) {
        $login = $row[$loginIndex];
        $email = $row[$emailIndex];        
        $counter++;
    }

    fclose($handle);
}
```

La función `processUsers` lee un archivo CSV y procesa cada fila.
El archivo es grande y no hay necesidad de imprimir cada fila en la pantalla, pero estaría bien ver el progreso.
Podríamos redibujar la barra de progreso en cada iteración, pero eso perjudicaría el rendimiento del procesamiento.
Podríamos redibujarla cada 100 iteraciones, pero las filas pueden tardar tiempos diferentes en procesarse.
¿Cómo mostramos el progreso de forma fluida, a intervalos más o menos regulares?

```php
use function Async\spawn;
use function Async\delay;

function printProgress(int $current, int $total, int $width = 30): void
{
    $ratio = $total > 0 ? $current / $total : 1;
    $filled = (int) round($ratio * $width);

    $bar = str_repeat('=', $filled) . str_repeat(' ', $width - $filled);

    echo "\r[$bar] " . round($ratio * 100) . "%";
}

$counter = 0;
$total = 100_000;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

Esto se puede lograr con la corrutina `$progress`, que muestra el progreso actual una vez por segundo.
Se apoya en la variable `$counter`, que se incrementa dentro de la función `processUsers` y se pasa
a la corrutina por referencia.

```bash
[====>                         ] 15%
```

Lo bonito de esta solución es que `printProgress` no sabe nada de `processUsers`, y viceversa.
No dependen la una de la otra y, sin embargo, trabajan juntas.

En otras palabras, las corrutinas no solo crean la ilusión de una ejecución concurrente, también ayudan a
separar responsabilidades.

¿Te fijaste en `$progress->cancel()`? ¿Para qué sirve exactamente?
