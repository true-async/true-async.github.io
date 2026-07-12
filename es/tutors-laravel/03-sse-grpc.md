---
layout: tutorial
lang: es
path_key: "/tutors-laravel/03-sse-grpc.html"
nav_active: docs
permalink: /es/tutors-laravel/03-sse-grpc.html
page_title: "SSE y gRPC con Laravel"
description: "trueasync_response(), Sse y grpc_handlers: llegar más allá del Illuminate Response con buffer directamente desde un controlador."
---

# SSE y gRPC con Laravel

El `TrueAsyncServer` dentro de `laravel-spawn` está construido de forma
sencilla: acepta una `HttpRequest`, ensambla a partir de ella un
`Illuminate\Http\Request`, la pasa por `Kernel::handle()`, obtiene un
`Illuminate\Http\Response`, la almacena entera en buffer dentro de una
`HttpResponse`, y la envía. Una petición, una respuesta, todo el contenido
de una vez. Exactamente lo que Laravel ha hecho durante toda su historia.

Pero la segunda serie de este sitio tenía una barra de progreso sobre
`SSE` y `gRPC` en el mismo puerto, y ambos no viven según la fórmula de "una
respuesta" sino según la de "un flujo de mensajes". Un `Illuminate\Response`
con buffer no está construido para ellos: no tiene ni `sseEvent()` ni
`writeMessage()`. Así que un controlador necesita una manera de llegar a la
`HttpResponse` real, en bruto, saltándose el buffer.

## Una respuesta en bruto bajo demanda

`laravel-spawn` coloca la `HttpRequest` y la `HttpResponse` de la petición
actual en `request_context()` antes de entregar el control al router de
Laravel, el mismo truco que el propio Laravel usa para poner `auth` y
`session` ahí, allá en el primer capítulo. Puedes recuperarlas con dos
funciones:

```php
trueasync_request();   // TrueAsync\HttpRequest
trueasync_response();  // TrueAsync\HttpResponse
```

Una vez que un controlador ha escrito en la respuesta en bruto y la ha
cerrado él mismo (`$res->end()`), el camino habitual de
`Illuminate\Response` deja de ser necesario: `TrueAsyncServer` comprueba
`isClosed()` antes de aplicar el buffer, y si la respuesta ya se envió
manualmente, no añade nada encima. El controlador sigue estando obligado a
devolver algo, Laravel lo exige, pero a nadie le importa ya el contenido de
ese valor de retorno.

## SSE: una barra de progreso dentro de una ruta de Laravel

Recurrir a `sseStart()`/`sseEvent()`/`sseComment()` a través de
`trueasync_response()` cada vez es incómodo, así que el paquete incluye un
wrapper ligero:

```php
use Spawn\Laravel\Sse\Sse;
use function Async\delay;

Route::get('/import/progress', function () {
    Sse::start(retryMs: 3000);

    $import = currentImport();

    while (!$import->isFinished()) {
        Sse::event(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!Sse::connected()) {
            break; // se cerró la pestaña
        }

        delay(1000);
    }

    Sse::event(event: 'finished', data: 'ok');
    Sse::end();

    return response()->noContent();
});
```

¿Reconoces este código? Es la barra de progreso del capítulo seis de la
serie del servidor, palabra por palabra, con `$res->sseEvent()` cambiado
por `Sse::event()`. Dentro de la ruta sigues teniendo `Auth::user()`,
`session()`, `Eloquent`, todo disponible, este es un handler de Laravel
ordinario, solo que responde con un flujo en lugar de una sola vez.
Middleware, autorización mediante `Route::middleware('auth:sanctum')`,
`current_context()` para el estado por petición del primer capítulo, todo
funciona como siempre, porque `Kernel::handle()` alrededor de este código
no ha cambiado ni una línea.

Un detalle de configuración que no tiene nada que ver con Laravel, sino con
el propio servidor: un flujo de larga duración no debería cortarse por el
timeout de escritura que las respuestas ordinarias sí necesitan, así que
los servicios con flujos lo desactivan globalmente,
`ASYNC_WRITE_TIMEOUT=0` en `.env`, la misma palanca usada en el capítulo de
producción de la serie del servidor.

## gRPC: un contrato en lugar de una ruta

Con `gRPC`, el compromiso es más duro. El protocolo habla en mensajes
codificados en protobuf, que no tienen un mapeo con sentido ni hacia
`Illuminate\Http\Request` ni, mucho menos, hacia `Response`. Fabricar una
petición HTTP falsa solo para empujarla por el enrutamiento y el middleware
de Laravel sería inútil: un cliente gRPC no envía ni cookies, ni un token
CSRF, ni un cuerpo de formulario. Así que `gRPC` en `laravel-spawn` se
salta el `Kernel` por completo, tomando un camino separado configurado a
través del archivo de configuración:

```php
// config/async.php
'grpc_handlers' => [
    '/profile.ProfileService/GetProfile' => [
        \App\Grpc\ProfileServiceHandler::class, 'getProfile',
    ],
],
```

El handler mismo se resuelve a través del contenedor (así que la
inyección de dependencias ordinaria por constructor sigue funcionando), y
la firma del método es el mismo par de objetos en bruto visto en el
capítulo diez de la serie del servidor:

```php
namespace App\Grpc;

use Profile\GetProfileRequest;
use Profile\Profile;
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

class ProfileServiceHandler
{
    public function __construct(private readonly UserRepository $users) {}

    public function getProfile(HttpRequest $req, HttpResponse $res): void
    {
        $getProfile = new GetProfileRequest();
        $getProfile->mergeFromString($req->readMessage());

        $user = $this->users->find($getProfile->getUserId());

        $profile = (new Profile())
            ->setId($user->id)
            ->setName($user->name)
            ->setRegion($user->region);

        $res->writeMessage($profile->serializeToString());
        // un simple return: el servidor añade grpc-status: 0 (OK) por su cuenta
    }
}
```

`$this->users` llegó a través del constructor, como en cualquier servicio
de Laravel: el contenedor y la inyección de dependencias siguen en pleno
juego, aunque el enrutamiento de Laravel nunca tocó este camino. Los
errores viajan de la misma manera que en el `TrueAsync Server` desnudo: a
través de un trailer `grpc-status`, no de un código de estado HTTP.

```php
public function getProfile(HttpRequest $req, HttpResponse $res): void
{
    if (!$this->authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        return;
    }

    // ...
}
```

Una excepción lanzada fuera de un handler es convertida por el propio
`laravel-spawn` en `grpc-status: 13` (`INTERNAL`), el mismo comportamiento
que tenía el servidor desnudo, ahora escondido dentro del adaptador.

## Qué es real aquí y qué no

Ninguno de los dos caminos es una emulación ni un truco montado sobre el
`StreamedResponse` de Symfony, ambos son acceso directo a las mismas
primitivas `HttpRequest`/`HttpResponse` de la serie del servidor, justo
desde debajo de una ruta de Laravel. El costo es predecible: un handler
SSE no responde a través del familiar `return response()->json(...)`,
escribe él mismo y decide por sí mismo cuándo cerrar la conexión; un
handler gRPC no ve en absoluto el middleware ni el enrutamiento de
Laravel, solo el contenedor para la inyección de dependencias. No hay
magia negra aquí, pero tampoco fingimiento: si necesitas un flujo real,
tienes que salir del mundo acogedor del `Response` con buffer hacia el
lugar donde vive el propio servidor.

Hemos cubierto lo que Laravel puede hacer: peticiones ordinarias, flujos,
gRPC. Lo que queda es lo que Laravel no puede hacer por sí solo, y lo que
merece un escrutinio cuidadoso en tu propio código y en el de otros antes
de entregárselo a corrutinas concurrentes. Ahí es adonde vamos en el
próximo capítulo.
