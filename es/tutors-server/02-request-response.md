---
layout: tutorial
lang: es
path_key: "/tutors-server/02-request-response.html"
nav_active: docs
permalink: /es/tutors-server/02-request-response.html
page_title: "Petición y respuesta"
description: "HttpRequest y HttpResponse: enrutamiento, json() y errores mediante HttpException."
---

# Petición y respuesta

El handler recibe dos objetos. `HttpRequest` es todo lo que envió el
cliente, y es de solo lectura. `HttpResponse` es todo lo que vuelve.
Entre ambos está tu código. Construyamos una `API` mínima de perfiles
sobre este trío, y de paso veamos qué pueden hacer estos objetos.

## Analizar la petición

```php
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $method = $req->getMethod();   // GET, POST, ...
    $path   = $req->getPath();     // /profile/42, sin la cadena de consulta

    if ($method === 'GET' && preg_match('#^/profile/(\d+)$#', $path, $m)) {
        showProfile((int) $m[1], $req, $res);
        return;
    }

    if ($method === 'POST' && preg_match('#^/profile/(\d+)/address$#', $path, $m)) {
        updateAddress((int) $m[1], $req, $res);
        return;
    }

    $res->setStatusCode(404)->setBody("Not found\n");
});
```

Gran parte de la petición ya viene analizada y disponible en una forma
cómoda:

```php
// GET /profile/42?fields=name,address&debug=1
$req->getQuery();                    // ['fields' => 'name,address', 'debug' => '1']
$req->getQueryParam('debug', '0');   // '1', con un valor por defecto

// POST con un formulario: application/x-www-form-urlencoded o multipart
$req->getPost();                     // ['address' => ['city' => 'Berlin', ...]]

// cabeceras, sin distinguir mayúsculas y minúsculas
$req->getHeader('authorization');    // 'Bearer eyJ...' o null

// cuerpo en bruto, por ejemplo JSON
$data = json_decode($req->getBody(), true);
```

`getQuery()` y `getPost()` entienden la conocida notación de arrays de
PHP: `address[city]`, `photos[]`. Migrar desde los viejos
`$_GET`/`$_POST` es casi palabra por palabra.

## Ensamblar la respuesta

Una `API` necesita `JSON`, y la respuesta tiene un ayudante listo para
ello:

```php
function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $profile = loadProfile($userId);

    $res->json($profile);                    // 200, Content-Type: application/json
    $res->json($errors, status: 422);        // el estado como segundo argumento
}
```

Los demás ayudantes siguen el mismo espíritu:

```php
$res->html('<h1>Profile updated</h1>');
$res->redirect('/profile/42', 303);
$res->setHeader('Cache-Control', 'no-store');
```

Cada método devuelve `$this`, así que la respuesta se ensambla como una
cadena. No necesitas cerrarla explícitamente: el handler retornó, la
respuesta salió.

## Errores: HttpException

Ahora `updateAddress`. El perfil puede no existir. La dirección puede
no venir. La validación puede fallar. ¿Escribimos un `setStatusCode`
con un `return` temprano para cada caso? Podríamos. O podríamos hacer
esto:

```php
use TrueAsync\HttpException;

function updateAddress(int $userId, HttpRequest $req, HttpResponse $res): void
{
    if (!profileExists($userId)) {
        throw new HttpException('Profile not found', 404);
    }

    $address = $req->getPost()['address'] ?? null;

    if ($address === null) {
        throw new HttpException('Address is required', 422);
    }

    saveAddress($userId, $address);
    $res->json(['ok' => true]);
}
```

El servidor entiende `HttpException` sin traductor: el código de la
excepción se convierte en el estado, el mensaje se convierte en el
cuerpo de la respuesta. Ningún 500 con un stack trace filtrándose. La
clase no es final, así que construye tu propia jerarquía y olvídate de
los números mágicos:

```php
final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Not found')
    {
        parent::__construct($message, 404);
    }
}
```

Y aquí te pediré un minuto de atención, porque lo que sigue es mi
detalle favorito de este capítulo. Mira la ascendencia de la clase:

`HttpException extends Async\AsyncCancellation`

Esa misma excepción de cancelación. Del capítulo dos de la primera
serie. ¿Una coincidencia? No. Piensa en lo que el servidor debería
hacer cuando un cliente corta la conexión a mitad de una petición:
detener la corrutina del handler. ¿Y cómo detenemos corrutinas?
Cancelación cooperativa. Un error HTTP y una cancelación de corrutina
resultan ser el mismo mecanismo, solo que visto desde lados distintos.

De este parentesco se deriva la vieja regla, conocida del capítulo
sobre cancelación: si atrapas `HttpException` por accidente, junto con
`Throwable`, vuelve a lanzarla. El servidor sabe qué hacer con ella. Tú
no tienes por qué.

Así que la `API` responde según las reglas y falla según las reglas.
Pero nuestros handlers siguen siendo sospechosamente simples: una
comprobación, una consulta, una respuesta. ¿Qué pasa cuando por dentro
necesitan acceder a la base de datos, al `GeoDirectory` y a la caché, y
preferiblemente de forma concurrente? Eso es el capítulo tres. Ahí la
primera serie por fin funciona a pleno rendimiento.
