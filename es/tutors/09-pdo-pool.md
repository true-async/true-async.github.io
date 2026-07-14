---
layout: tutorial
lang: es
path_key: "/tutors/09-pdo-pool.html"
nav_active: docs
permalink: /es/tutors/09-pdo-pool.html
page_title: "PDO Pool"
description: "Por qué las corrutinas no pueden compartir un único PDO, y cómo el pool de conexiones integrado lo resuelve de forma transparente."
---

# PDO Pool

La importación está casi hecha: los workers comprueban direcciones mediante `GeoDirectory`. Todo
lo que queda es guardar las direcciones comprobadas en la base de datos. Suena trivial:

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret');

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue, $pdo) {
        foreach ($queue as $address) {
                checkAddress($address);
                saveAddress($pdo, $address);
        }
    });
}
```

Un objeto `PDO` compartido por diez corrutinas. En el capítulo sobre canales dijimos
que las condiciones de carrera sobre datos no ocurren dentro de un solo hilo, así que esto debería estar bien,
¿verdad?

No. Eso es cierto para la memoria. Pero una conexión a base de datos no es memoria, es
un protocolo por encima de un socket: petición, respuesta, petición, respuesta, estrictamente
en orden. Cada consulta a la base de datos es un punto de espera donde una corrutina se va
a dormir y el control pasa a otra. Y esa otra escribe su propia
consulta en ese mismísimo socket:

```php
// Worker 1
$pdo->beginTransaction();
$pdo->exec("INSERT INTO addresses ...");
// punto de espera: el worker 1 se duerme, el worker 2 se despierta

// Worker 2
$pdo->beginTransaction(); // ¡en la misma conexión!
$pdo->exec("UPDATE ...");
$pdo->commit(); // hace commit tanto de su propia transacción como de la de otro
```

Las respuestas se mezclan, las transacciones hacen commit del trabajo ajeno. Las
carreras están de vuelta, solo que ahora viven en la conexión en lugar de en la memoria.

Bien, ¿entonces darle a cada corrutina su propia conexión?

```php
$workers->spawn(function () use ($queue) {
    $pdo = new PDO(/* ... */); // su propia conexión
    // ...
});
```

Está bien para diez workers. Pero imagina no un trabajo de importación, sino un servidor, donde
se crea una corrutina para cada petición. Mil corrutinas significan
mil conexiones TCP. MySQL permite 151 por defecto, PostgreSQL 100. Y
abrir una conexión para unos pocos milisegundos de trabajo es sencillamente caro: el
handshake con la base de datos puede tardar más que la propia consulta.

¿Te suena? El capítulo sobre canales tenía la misma bifurcación en el camino: cien
mil conexiones a `GeoDirectory`, o una cola para diez.

## Un pool: una cola al revés

La solución se llama pool de conexiones: abre N conexiones por adelantado
y entrégalas a las corrutinas mientras dure su trabajo. Da la casualidad de que
ya sabemos construir uno. Un pool es un canal que retiene conexiones:

```php
$pool = new Channel(5);

for ($i = 0; $i < 5; $i++) {
    $pool->send(new PDO(/* ... */));
}

// Dentro de una corrutina:
$pdo = $pool->recv();   // toma una conexión
saveAddress($pdo, $address);
$pool->send($pdo);      // devuélvela
```

Las conexiones libres esperan en el búfer. Si están todas ocupadas, `recv` duerme
la corrutina hasta que alguien devuelve una conexión. La misma
sincronización del capítulo anterior, solo que la cola retiene recursos
en lugar de tareas.

El esquema funciona, pero tiene un punto débil: tienes que acordarte de devolver la
conexión, pase lo que pase, incluida una excepción o una cancelación.
Y luego están las transacciones, las conexiones rotas, las reconexiones. Para PDO,
todo eso ya se ha resuelto, justo en el núcleo.

## PDO Pool

El pool está integrado en el propio `PDO` y se activa mediante atributos
del constructor:

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 2,
    PDO::ATTR_POOL_MAX     => 10,
]);
```

Desde fuera, nada cambió: aquel primer ejemplo, donde un único
`$pdo` sale a diez workers, ahora es correcto. El objeto `$pdo` ya no
es una conexión, es una fachada para el pool. Cuando una corrutina ejecuta su
primera consulta, el pool le entrega una conexión dedicada, y todas las
consultas de esa corrutina pasan por ella. Una vez que la corrutina termina, la
conexión vuelve al pool, lista para la siguiente corrutina.

Sin `recv` ni `send` manuales: adquirir y devolver ocurren por sí solos, en
los momentos adecuados, pase lo que pase. El código parece
PHP síncrono corriente con un PDO corriente, y esa era toda la idea.

## Transacciones

Una transacción es estado que pertenece a una conexión, así que el pool la trata
de forma especial: mientras una transacción está abierta, la conexión queda fijada a su
corrutina y no vuelve al pool:

```php
$workers->spawn(function () use ($pdo, $queue) {
    // ...
    $pdo->beginTransaction();
    $pdo->exec("INSERT INTO addresses (user_id, region) VALUES (...)");
    $pdo->exec("UPDATE users SET address_checked = 1 WHERE id = ...");
    $pdo->commit();
    // solo ahora la conexión puede volver al pool
});
```

¿Qué pasa si una corrutina termina sin llamar a `commit`? Recuerda el capítulo sobre
Scope: un worker podría cancelarse justo en mitad de una transacción, y
eso es un escenario normal, no una catástrofe. Antes de devolver la conexión,
el pool ejecuta automáticamente un `ROLLBACK`. Una transacción sin terminar no
se filtrará a la siguiente corrutina ni quedará colgando en la base de datos.

## Cuando cae una conexión

Una importación puede durar una hora. En una hora, la base de datos podría reiniciarse,
la red podría parpadear, o un DBA podría matar una sesión. En el PHP clásico el
script simplemente se caería, pero una aplicación de larga duración necesita poder
seguir adelante.

El pool comprueba las conexiones cuando se devuelven: una rota se
destruye en lugar de entregarse a la siguiente corrutina. Y si una consulta
falla por una conexión caída, basta con reintentarla en el mismo
`$pdo`, el pool le entregará a la corrutina una conexión nueva:

```php
try {
    saveAddress($pdo, $address);
} catch (PDOException $e) {
    saveAddress($pdo, $address); // el pool ya ha cambiado a una conexión nueva
}
```

No hace falta escribir lógica de reconexión, no hace falta recrear el objeto `PDO`. Solo
reintenta la consulta, el pool se encarga de todo lo demás.

Al final, el código funciona como si cada corrutina tuviera su propia conexión
a la base de datos. En realidad solo hay diez conexiones, y el pool
constantemente las pasa de mano en mano, vigila las transacciones, y
descarta las muertas. Pero nada de ese trabajo de cocina se ve desde
fuera, y ese es el beneficio principal: simplemente escribimos código corriente con PDO.

Por cierto, nuestros workers todavía trabajan medio a ciegas: comprueban direcciones
y las guardan, pero nadie cuenta cuántas direcciones resultaron ser malas,
o cuáles. ¿Cómo obtenemos resultados de vuelta desde las corrutinas y los recogemos
cómodamente? Eso es lo que abordaremos en el próximo capítulo.
