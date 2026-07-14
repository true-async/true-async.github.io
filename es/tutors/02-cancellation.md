---
layout: tutorial
lang: es
path_key: "/tutors/02-cancellation.html"
nav_active: docs
permalink: /es/tutors/02-cancellation.html
page_title: "Cancelación"
description: "Cómo funciona cancel() y la cancelación cooperativa de corrutinas."
---

# Cancelación

En el ejemplo anterior había una llamada interesante a la función `cancel`,
```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

¿Qué ocurre si la eliminamos? Pruébalo tú mismo.
La corrutina `$progress` gira en un bucle infinito con un retardo de 1 segundo.
Cuando `processUsers` termina, el control sigue adelante. La corrutina `$progress` continúa ejecutándose.
Para siempre. Nunca se detendrá. El proceso de PHP nunca se detendrá (a menos que se termine desde fuera).

`$progress->cancel()` detiene la corrutina `$progress`. Pero ¿cómo?

```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        
        try {
            delay(1000);
        } catch (Throwable $e) {
            echo get_class($e). PHP_EOL;
            throw $e;
        }
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

Cambiemos el código alrededor de `delay(1000)` y veamos qué pasa:
```bash
Async\AsyncCancellation
```

Cuando la corrutina `$progress` estaba dormida dentro de `delay(1000)` y entonces se llamó a `cancel()`,
`delay` lanzó una excepción `Async\AsyncCancellation`. Lo mismo ocurre con un `sleep(1)` normal:
bajo TrueAsync `sleep()` también se vuelve asíncrono y es igualmente un punto de cancelación — lanza
`Async\AsyncCancellation` igual que `delay`.

Se podría decir que usar `delay` en tu código establece de hecho un contrato que permite a otro código
interrumpir la ejecución de la corrutina. Esto es muy conveniente, ya que una vez más separa responsabilidades
entre distintos módulos:
1. La corrutina no sabe cuándo se interrumpirá su ejecución.
2. El código que cancela la corrutina no sabe exactamente cómo se interrumpirá la corrutina.

Una corrutina no se detiene por arte de magia, se detiene mediante una excepción.
Una corrutina no se puede cancelar en mitad de una operación arbitraria, solo en un punto en el que ella
misma decide ceder el control. A este tipo de cancelación se le llama "cooperativa".
