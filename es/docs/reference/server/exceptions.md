---
layout: docs
lang: es
path_key: "/docs/reference/server/exceptions.html"
nav_active: docs
permalink: /es/docs/reference/server/exceptions.html
page_title: "TrueAsync Server: excepciones"
description: "Jerarquía de excepciones del servidor: HttpServerException y descendientes, más HttpException, portador de cancellation con status HTTP."
---

# Excepciones de TrueAsync Server

(PHP 8.6+, true_async_server 0.1+)

## Jerarquía

```
\Exception
  └── TrueAsync\HttpServerException                  // base
        ├── TrueAsync\HttpServerRuntimeException     // final
        ├── TrueAsync\HttpServerInvalidArgumentException  // final
        ├── TrueAsync\HttpServerConnectionException  // final
        ├── TrueAsync\HttpServerProtocolException    // final
        └── TrueAsync\HttpServerTimeoutException     // final

\Async\AsyncCancellation
  └── TrueAsync\HttpException                        // NO final, hereda para excepciones de dominio
```

## TrueAsync\HttpServerException

```php
namespace TrueAsync;

class HttpServerException extends \Exception {}
```

Excepción base para todos los errores del servidor. Catch-all para error-handling cuando el
dominio del error no importa.

## TrueAsync\HttpServerRuntimeException

```php
final class HttpServerRuntimeException extends HttpServerException {}
```

Errores en runtime durante la ejecución del servidor. Fuentes típicas:

- Intentar cambiar el config después de `new HttpServer($config)` (`$config->setXxx()` post lock).
- Intentar cambiar el `StaticHandler` tras el attach (`$static->setXxx()` post
  `addStaticHandler()`).
- Cualquier intento de modificar el `HttpResponse` tras `sendFile()` (response sellada).
- `end()` después de `end()`, `write()` después de `sendFile()` y otras violaciones similares
  del ciclo de vida.

## TrueAsync\HttpServerInvalidArgumentException

```php
final class HttpServerInvalidArgumentException extends HttpServerException {}
```

Argumento inválido. Lanzada desde los setters de `HttpServerConfig`/`StaticHandler`/`UploadedFile`
cuando el valor sale del rango válido (por ejemplo `setBrotliLevel(99)`, `setMaxBodySize(0)`,
content-coding desconocido en `enablePrecompressed()`).

## TrueAsync\HttpServerConnectionException

```php
final class HttpServerConnectionException extends HttpServerException {}
```

Errores a nivel de socket y de red: bind failed, listener no levantado, peer reset en la ruta
crítica del protocolo.

## TrueAsync\HttpServerProtocolException

```php
final class HttpServerProtocolException extends HttpServerException {}
```

Errores a nivel de protocolo: HTTP malformado, cabeceras inválidas, violaciones de protocolo no
recuperables.

## TrueAsync\HttpServerTimeoutException

```php
final class HttpServerTimeoutException extends HttpServerException {}
```

Timeouts: read, write, keep-alive, graceful shutdown.

## TrueAsync\HttpException

```php
namespace TrueAsync;

class HttpException extends \Async\AsyncCancellation {}
```

**Clase especial**: hereda no de `HttpServerException` sino de `Async\AsyncCancellation`. Úsala
para enviar una respuesta HTTP específica desde cualquier punto del handler — el servidor leerá:

- `$code`: status HTTP (debe ser 4xx/5xx, en caso contrario será 500);
- `$message`: cuerpo de la respuesta.

También se lanza **internamente** cuando el parser supera un límite ya después del dispatch del
handler: el servidor cancela el handler con `HttpException` y la cancellation viaja por la
cadena Async normal, pero portando el status HTTP exacto para el peer.

**No final**: hereda para tu dominio:

```php
use TrueAsync\HttpException;

class NotFoundException extends HttpException {}
class ForbiddenException extends HttpException {}
class PayloadTooLargeException extends HttpException {}

$server->addHttpHandler(function ($req, $res) {
    $user = User::find($req->getQueryParam('id'))
         ?? throw new NotFoundException('user not found', 404);

    if (!$user->canBeViewedBy(currentUser()))
        throw new ForbiddenException('access denied', 403);

    $res->json($user->toArray());
});
```

## Bailout firewall

Cualquier **otra** excepción del handler (E_ERROR, OOM, `\Throwable` no capturados) **no tira el
servidor**. El bailout firewall en la frontera de los entry-points H1/H2/H3:

1. Drena la corrutina fallida.
2. Emite 500 al cliente (si las cabeceras aún no están en el cable).
3. Devuelve el control al listener, que sigue aceptando.

Este comportamiento es común para HTTP/1.1, streams HTTP/2 y streams HTTP/3.

## Véase también

- [`Async\AsyncCancellation`](/es/docs/reference/exceptions/async-cancellation.html)
- [Bailout firewall](/es/architecture/server.html#bailout-firewall)
- [`HttpServerConfig::isLocked()`](/es/docs/reference/server/http-server-config.html#islocked)
