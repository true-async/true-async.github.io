---
layout: docs
lang: en
path_key: "/docs/reference/server/exceptions.html"
nav_active: docs
permalink: /en/docs/reference/server/exceptions.html
page_title: "TrueAsync Server — exceptions"
description: "Server exception hierarchy: HttpServerException and descendants, plus HttpException — a cancellation carrier of an HTTP status."
---

# TrueAsync Server exceptions

(PHP 8.6+, true_async_server 0.1+)

## Hierarchy

```
\Exception
  └── TrueAsync\HttpServerException                  // base
        ├── TrueAsync\HttpServerRuntimeException     // final
        ├── TrueAsync\HttpServerInvalidArgumentException  // final
        ├── TrueAsync\HttpServerConnectionException  // final
        ├── TrueAsync\HttpServerProtocolException    // final
        └── TrueAsync\HttpServerTimeoutException     // final

\Async\AsyncCancellation
  └── TrueAsync\HttpException                        // NOT final — subclass for domain exceptions
```

## TrueAsync\HttpServerException

```php
namespace TrueAsync;

class HttpServerException extends \Exception {}
```

Base exception for all server errors. Catch-all for error handling when the error domain does not
matter.

## TrueAsync\HttpServerRuntimeException

```php
final class HttpServerRuntimeException extends HttpServerException {}
```

Runtime errors during server operation. Typical sources:

- Mutating the config after `new HttpServer($config)` (`$config->setXxx()` after lock).
- Mutating `StaticHandler` after attach (`$static->setXxx()` after `addStaticHandler()`).
- Any attempt to modify `HttpResponse` after `sendFile()` (response sealed).
- `end()`-after-`end()`, `write()` after `sendFile()`, and similar lifecycle violations.

## TrueAsync\HttpServerInvalidArgumentException

```php
final class HttpServerInvalidArgumentException extends HttpServerException {}
```

Invalid argument. Thrown by `HttpServerConfig`/`StaticHandler`/`UploadedFile` setters when a value
is out of the valid range (for example, `setBrotliLevel(99)`, `setMaxBodySize(0)`, an unknown
content-coding in `enablePrecompressed()`).

## TrueAsync\HttpServerConnectionException

```php
final class HttpServerConnectionException extends HttpServerException {}
```

Socket-level and network errors: bind failed, listener not up, peer reset on a critical protocol
path.

## TrueAsync\HttpServerProtocolException

```php
final class HttpServerProtocolException extends HttpServerException {}
```

Protocol-level errors: malformed HTTP, invalid headers, unrecoverable protocol violations.

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

**A special class**: extends `Async\AsyncCancellation` rather than `HttpServerException`. Use it
to send a specific HTTP response from anywhere inside the handler — the server reads:

- `$code` — HTTP status (must be 4xx/5xx, otherwise 500);
- `$message` — response body.

It is also thrown **internally** when the parser hits a limit after the handler has been
dispatched: the server cancels the handler with `HttpException`, and the cancellation travels
through the normal Async chain while carrying the exact HTTP status for the peer.

**Not final** — subclass it per domain:

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

Any **other** exception thrown from a handler (E_ERROR, OOM, uncaught `\Throwable`) does **not
crash the server**. The bailout firewall sits at the H1/H2/H3 request entry point:

1. Drains the failing coroutine.
2. Emits 500 to the client (if headers are not on the wire yet).
3. Returns control to the listener — it keeps accepting.

This behaviour is uniform across HTTP/1.1, HTTP/2 streams, and HTTP/3 streams.

## See also

- [`Async\AsyncCancellation`](/en/docs/reference/exceptions/async-cancellation.html)
- [Bailout firewall](/en/architecture/server.html#bailout-firewall)
- [`HttpServerConfig::isLocked()`](/en/docs/reference/server/http-server-config.html#islocked)
