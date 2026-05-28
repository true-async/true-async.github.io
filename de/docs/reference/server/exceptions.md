---
layout: docs
lang: de
path_key: "/docs/reference/server/exceptions.html"
nav_active: docs
permalink: /de/docs/reference/server/exceptions.html
page_title: "TrueAsync Server — Ausnahmen"
description: "Exception-Hierarchie des Servers: HttpServerException und Subklassen, plus HttpException — Cancellation-Träger für den HTTP-Status."
---

# Ausnahmen TrueAsync Server

(PHP 8.6+, true_async_server 0.1+)

## Hierarchie

```
\Exception
  └── TrueAsync\HttpServerException                  // base
        ├── TrueAsync\HttpServerRuntimeException     // final
        ├── TrueAsync\HttpServerInvalidArgumentException  // final
        ├── TrueAsync\HttpServerConnectionException  // final
        ├── TrueAsync\HttpServerProtocolException    // final
        └── TrueAsync\HttpServerTimeoutException     // final

\Async\AsyncCancellation
  └── TrueAsync\HttpException                        // NICHT final — für Domain-Exceptions ableiten
```

## TrueAsync\HttpServerException

```php
namespace TrueAsync;

class HttpServerException extends \Exception {}
```

Basis-Exception für alle Server-Fehler. Catch-all für Error-Handling, wenn die Fehlerdomäne keine
Rolle spielt.

## TrueAsync\HttpServerRuntimeException

```php
final class HttpServerRuntimeException extends HttpServerException {}
```

Runtime-Fehler während des Server-Betriebs. Typische Quellen:

- Versuch, die Config nach `new HttpServer($config)` zu ändern (`$config->setXxx()` nach Lock).
- Versuch, `StaticHandler` nach dem Attach zu ändern (`$static->setXxx()` nach `addStaticHandler()`).
- Jeder Versuch, `HttpResponse` nach `sendFile()` zu modifizieren (Response sealed).
- `end()`-after-`end()`, `write()` nach `sendFile()` und vergleichbare Lifecycle-Verletzungen.

## TrueAsync\HttpServerInvalidArgumentException

```php
final class HttpServerInvalidArgumentException extends HttpServerException {}
```

Ungültiges Argument. Wird aus Settern von `HttpServerConfig`/`StaticHandler`/`UploadedFile` geworfen,
wenn ein Wert außerhalb des gültigen Bereichs liegt (z. B. `setBrotliLevel(99)`, `setMaxBodySize(0)`,
unbekanntes Content-Coding in `enablePrecompressed()`).

## TrueAsync\HttpServerConnectionException

```php
final class HttpServerConnectionException extends HttpServerException {}
```

Fehler auf Socket- und Netzwerkebene: Bind failed, nicht hochgekommener Listener, Peer-Reset auf
einem Critical-Path-Protokoll.

## TrueAsync\HttpServerProtocolException

```php
final class HttpServerProtocolException extends HttpServerException {}
```

Fehler auf Protokollebene: malformed HTTP, ungültige Header, irreversible Protokollverstöße.

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

**Besondere Klasse**: erbt nicht von `HttpServerException`, sondern von `Async\AsyncCancellation`.
Verwenden Sie sie, um eine spezifische HTTP-Antwort aus einem beliebigen Punkt im Handler zu senden —
der Server liest:

- `$code` — HTTP-Status (muss 4xx/5xx sein, sonst wird 500 verwendet);
- `$message` — Body der Antwort.

Wird außerdem **intern** geworfen, wenn der Parser nach dem Handler-Dispatch in ein Limit läuft:
der Server cancelt den Handler mit `HttpException`, und die Cancellation läuft über die normale
Async-Kette, trägt aber den exakten HTTP-Status für den Peer.

**Nicht final** — für Domain-Subklassen ableiten:

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

## Bailout Firewall

Jede **andere** Exception aus dem Handler (E_ERROR, OOM, uncaught `\Throwable`) **kippt den Server
nicht**. Bailout Firewall an der H1/H2/H3-Request-Entry-Point-Grenze:

1. Drainiert die fehlerhafte Coroutine.
2. Emittiert 500 an den Client (sofern Header noch nicht auf dem Draht sind).
3. Gibt die Kontrolle an den Listener zurück — der nimmt weiter Accepts.

Dieses Verhalten ist einheitlich für HTTP/1.1, HTTP/2-Streams und HTTP/3-Streams.

## Siehe auch

- [`Async\AsyncCancellation`](/de/docs/reference/exceptions/async-cancellation.html)
- [Bailout Firewall](/de/architecture/server.html#bailout-firewall)
- [`HttpServerConfig::isLocked()`](/de/docs/reference/server/http-server-config.html#islocked)
