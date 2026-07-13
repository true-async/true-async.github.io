---
layout: tutorial
lang: es
path_key: "/tutors/10-task-group.html"
nav_active: docs
permalink: /es/tutors/10-task-group.html
page_title: "TaskGroup"
description: "TaskGroup: un grupo de tareas con resultados, y las estrategias de espera all, race, any."
---

# TaskGroup

Supongamos que la página de perfil de un usuario se ensambla a partir de tres fuentes: los datos del usuario desde la
base de datos, los pedidos desde la base de datos, y las reseñas desde una API externa. Las
fuentes no dependen entre sí, así que deberían solicitarse de forma concurrente.
Ya sabemos cómo hacer esto:

```php
$user    = spawn(fetchUser(...), $userId);
$orders  = spawn(fetchOrders(...), $userId);
$reviews = spawn(fetchReviews(...), $userId);

$profile = new UserProfile(await($user), await($orders), await($reviews));
```

Tolerable para tres tareas. Pero mira con atención: esto es de nuevo la contabilidad
manual del capítulo sobre `Scope`, salvo que ahora también necesitamos los resultados.
Cada corrutina hay que recordarla y esperarla, y si `fetchUser` lanza una
excepción, `fetchOrders` y `fetchReviews` seguirán ejecutándose para nada:
habría que cancelarlas "a mano" en un `catch`.

Y hay tareas donde el enfoque manual se vuelve genuinamente doloroso. Por
ejemplo, tomar el resultado de la corrutina que termina primero y cancelar
el resto. Intenta escribir eso con `await` en un bucle y acabarás con un
enredo de comprobaciones y cancelaciones.

`Scope` tampoco ayuda mucho aquí: gestiona el tiempo de vida de las corrutinas, pero
no sabe nada de sus resultados. Necesitamos una primitiva de más alto nivel.

## Un grupo de tareas

`TaskGroup` agrupa tareas en un único todo: las ejecuta en su propio `Scope`,
almacena sus resultados, y te deja esperar el grupo como una sola unidad:

```php
use Async\TaskGroup;

$group = new TaskGroup();

$group->spawnWithKey('user',    fn() => fetchUser($userId));
$group->spawnWithKey('orders',  fn() => fetchOrders($userId));
$group->spawnWithKey('reviews', fn() => fetchReviews($userId));

$data = $group->all()->await();

$profile = new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

El método `all()` devuelve un familiar `Future`, que se resuelve en un array de
resultados una vez que cada tarea ha terminado. Las claves las asignamos nosotros mismos mediante
`spawnWithKey`, así que el array contiene entradas con nombre en lugar de índices planos.

Y como es un `Future`, un timeout viene gratis, mediante el mismo token de
siempre:

```php
$data = $group->all()->await(timeout(5000));
```

Si aunque sea una tarea lanza una excepción, el grupo se comporta como el Scope del
capítulo ocho: las tareas restantes se cancelan, y `await` lanza una
`CompositeException` que contiene todos los errores. El grupo o lo recoge
todo, o no recoge nada: no hay estado intermedio.

## El primero en terminar: race

`all()` es solo una de las estrategias de espera. Piensa de nuevo en `GeoDirectory`:
tiene tres réplicas, y una de ellas a veces va lenta. El truco clásico:
envía la petición a todas las réplicas y quédate con la primera respuesta:

```php
$group = new TaskGroup();

foreach (['geo-1', 'geo-2', 'geo-3'] as $host) {
    $group->spawn(fn() => checkAddressAt($host, $address));
}

$verdict = $group->race()->await();
```

`race()` se resuelve con el resultado de la tarea que termine primero, sea eso
un éxito o un fallo. Exactamente el escenario "toma el primero y no esperes al
resto" que tan doloroso resulta escribir a mano.

## El primero en tener éxito: any

`race()` tiene una arista dura: si la primera tarea en terminar resulta ser una
fallida, obtienes su excepción. A veces necesitas algo más suave: probar varios
proveedores y quedarte con la primera respuesta exitosa, haciendo la vista gorda a los
fallos:

```php
$group = new TaskGroup();

$group->spawn(fn() => geocodeViaGoogle($address));
$group->spawn(fn() => geocodeViaOsm($address));
$group->spawn(fn() => geocodeViaYandex($address));

$coords = $group->any()->await();
$group->suppressErrors();
```

`any()` ignora los fallos y devuelve al primer ganador. Solo obtienes una
excepción si todas las tareas fallan, y será una `CompositeException` con la
lista completa de causas. Fíjate en la llamada `suppressErrors()`: nadie gestionó
los errores de los proveedores perdedores, y el grupo quiere una confirmación explícita
de que esto fue intencionado. Un principio familiar del capítulo sobre
excepciones: un error no puede simplemente desaparecer en silencio.

## Límite de concurrencia

Y ahora algo inesperado. Recuerda el pool de workers del capítulo
sobre canales: un canal, diez corrutinas, un bucle de `recv`. `TaskGroup` puede hacer lo
mismo en unas pocas líneas:

```php
$group = new TaskGroup(concurrency: 10);

while (($row = fgetcsv($handle)) !== false) {
    $group->spawn(fn() => checkAddress($row[$addressIndex]));
}

$group->close();

foreach ($group as $key => [$result, $error]) {
    // los resultados llegan a medida que están listos
}
```

El parámetro `concurrency: 10` limita cuántas tareas se ejecutan a la vez: el resto
esperan en la fila y ni siquiera arrancan una corrutina hasta que se libera un hueco.
`close()` juega el mismo papel que juega para un canal: anuncia que no vienen
tareas nuevas. Y `foreach` reparte los resultados a medida que están listos,
sin esperar a que todo el grupo termine.

¿Significa eso que el canal no hacía falta después de todo? No. Un canal es una
primitiva de sincronización con la que puedes construir cualquier cosa. `TaskGroup` es un
ensamblaje ya hecho para el caso más común: "ejecuta un conjunto de tareas y obtén los
resultados". Cuando una tarea encaja en ese patrón, echa mano de `TaskGroup`; cuando necesitas
una topología no estándar, los canales y Scope siguen ahí en tus manos.

En resumen: `TaskGroup` es un Scope más resultados. Un grupo de tareas se convierte en
un único valor al que puedes pedirle todo a la vez, el primero en terminar, o
el primero en tener éxito.

Un último detalle: `TaskGroup` conserva cuidadosamente todos los resultados. Llama a
`race()` dos veces, y obtendrás la misma respuesta ambas veces. Itera el grupo
con `foreach` otra vez, y reparte todo desde el principio una vez más.
Para una página de perfil, eso es cómodo. Ahora imagina un pipeline que ejecuta cien
mil tareas a través de un grupo. Todo lo que el grupo recuerda vive
en memoria. ¿Ves el problema? De eso hablaremos en el próximo capítulo.
