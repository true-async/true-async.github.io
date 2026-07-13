---
layout: tutorial
lang: es
path_key: "/tutors-server/03-concurrency-inside.html"
nav_active: docs
permalink: /es/tutors-server/03-concurrency-inside.html
page_title: "Concurrencia dentro de una petición"
description: "TaskGroup en un handler, el PDO Pool bajo carga y request_context()."
---

# Concurrencia dentro de una petición

En el capítulo anterior `showProfile` cargaba el perfil en una sola
línea, y sinceramente fingí que no había nada detrás. Es hora de
confesar. Detrás hay tres fuentes: datos del usuario desde la base de
datos, pedidos desde la base de datos, reseñas desde una API externa.
Tres viajes independientes en busca de datos.

¿Un problema conocido? Por supuesto. Este es el capítulo diez de la
primera serie palabra por palabra, y la solución se traslada sin un
solo cambio:

```php
use Async\TaskGroup;

function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $group = new TaskGroup();

    $group->spawnWithKey('user',    fn() => fetchUser($userId));
    $group->spawnWithKey('orders',  fn() => fetchOrders($userId));
    $group->spawnWithKey('reviews', fn() => fetchReviews($userId));

    $res->json($group->all()->await(timeout(2000)));
}
```

Las tres peticiones salen de forma concurrente. La página se ensambla
en el tiempo de la fuente más lenta, no en la suma de las tres. Hay un
timeout, hay fail-together, hay `CompositeException`.

Aquí es importante sentir una cosa: el servidor no introdujo reglas de
concurrencia propias. Ninguna en absoluto. El handler es una corrutina
ordinaria, y dentro de ella funciona todo lo que ya conoces. El
servidor solo abrió una puerta por la que las peticiones HTTP entran al
mundo que ya conoces.

## El pool bajo carga real

¿Recuerdas el capítulo nueve de la primera serie? Diez workers de
importación, un objeto `PDO`, transacciones enredadas, caos. Entonces
era un ejemplo didáctico con diez corrutinas. Bueno, olvídate de diez.

En un servidor, hay tantos usuarios concurrentes de la base de datos
como peticiones haya en vuelo en ese momento. Veinte. Quinientas. Tantas
como traiga el tráfico, y ese número no lo controlas tú. Lo único que
te salva, ya lo conoces:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 4,
    PDO::ATTR_POOL_MAX     => 16,
]);
```

La mecánica es la misma que antes: cada corrutina posee una conexión
en exclusiva en su momento, las transacciones quedan fijadas, y una
conexión caída se reemplaza silenciosamente por una nueva. Pero
`POOL_MAX` tiene ahora un nuevo trabajo. Ahora es un fusible entre la
tormenta y la base de datos: mil peticiones concurrentes harán cola por
dieciséis conexiones. Reconócelo, eso es mejor que mil conexiones
llegando a PostgreSQL de golpe.

## ¿De quién es esta petición?

El capítulo quince de la primera serie terminó con la pregunta de dónde
guardar lo "actual": el usuario, la localización, el identificador de
la petición. Entonces construimos la respuesta sobre contextos. El
servidor lleva esta historia hasta el final, y lo hace de forma
preciosa.

Cada handler se ejecuta en su propio scope. Y el scope de la petición
tiene un contexto compartido por todo el árbol de corrutinas de esa
petición:

```php
use function Async\request_context;
use function Async\spawn;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    request_context()
        ->set('request_id', $req->getHeader('x-request-id') ?? bin2hex(random_bytes(8)))
        ->set('user_id', authenticate($req));

    // ... incluso diez niveles de llamadas más abajo ...
});

function logInfo(string $message): void
{
    $requestId = request_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

`logInfo` puede llamarse desde el handler. Desde una corrutina que este
lanzó. Desde una corrutina dentro de un `TaskGroup` dentro de un
servicio dentro de un repositorio. No importa: `request_context()` es
una y la misma en todas partes, mientras estemos dentro de esta
petición. ¿Y la petición vecina, que se está procesando entrelazada con
la nuestra ahora mismo? Tiene el suyo propio. Trescientas peticiones
concurrentes, trescientos `request_id` independientes, cero variables
globales.

La diferencia con `current_context()` se puede formular ahora en una
sola línea: aquel es sobre una única corrutina, este es sobre toda la
petición.

## El scope limpia después de la petición

Y la última consecuencia, la más invisible y la más valiosa. Como el
handler vive en un scope, todo el capítulo ocho de la primera serie se
aplica a la petición automáticamente, sin una sola acción por tu parte.

¿Lanzaste una corrutina y olvidaste hacerle await? La petición termina,
el scope se limpia. ¿El cliente cortó la conexión a la mitad? El
servidor cancela el scope de la petición, la cancelación alcanza de
forma cooperativa a cada corrutina hija, y cada `finally` libera lo
suyo. ¿Recuerdas cuánta disciplina exigía la concurrencia estructurada?
Aquí dejó de ser disciplina. Ahora es una propiedad de la plataforma:
la vida de cualquier corrutina de una petición está acotada por la
propia petición. Punto.

Eso es todo por la parte invisible del servidor. A continuación vienen
los bytes, y muchos: el cliente sube un archivo de un gigabyte, y
nosotros devolvemos un informe de dos gigabytes. ¿Dónde metemos todo eso
para no despertar al OOM killer? El siguiente capítulo trata justo de
eso.
