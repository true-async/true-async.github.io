---
layout: docs
lang: it
path_key: "/docs/reference/server/exceptions.html"
nav_active: docs
permalink: /it/docs/reference/server/exceptions.html
page_title: "TrueAsync Server — eccezioni"
description: "Gerarchia delle eccezioni del server: HttpServerException e discendenti, più HttpException — vettore di cancellation che porta uno stato HTTP."
---

# Eccezioni di TrueAsync Server

(PHP 8.6+, true_async_server 0.1+)

## Gerarchia

```
\Exception
  └── TrueAsync\HttpServerException                  // base
        ├── TrueAsync\HttpServerRuntimeException     // final
        ├── TrueAsync\HttpServerInvalidArgumentException  // final
        ├── TrueAsync\HttpServerConnectionException  // final
        ├── TrueAsync\HttpServerProtocolException    // final
        └── TrueAsync\HttpServerTimeoutException     // final

\Async\AsyncCancellation
  └── TrueAsync\HttpException                        // NON final — ereditata per eccezioni di dominio
```

## TrueAsync\HttpServerException

```php
namespace TrueAsync;

class HttpServerException extends \Exception {}
```

Eccezione base per tutti gli errori del server. Catch-all per la gestione errori quando il dominio
dell'errore non importa.

## TrueAsync\HttpServerRuntimeException

```php
final class HttpServerRuntimeException extends HttpServerException {}
```

Errori a runtime durante il funzionamento del server. Origini tipiche:

- Tentativo di modificare la configurazione dopo `new HttpServer($config)` (`$config->setXxx()` dopo
  il lock).
- Tentativo di modificare uno `StaticHandler` dopo l'attach (`$static->setXxx()` dopo
  `addStaticHandler()`).
- Qualunque tentativo di modificare un `HttpResponse` dopo `sendFile()` (risposta sigillata).
- `end()`-dopo-`end()`, `write()` dopo `sendFile()` e analoghe violazioni del lifecycle.

## TrueAsync\HttpServerInvalidArgumentException

```php
final class HttpServerInvalidArgumentException extends HttpServerException {}
```

Argomento non valido. Lanciata dai setter di `HttpServerConfig`/`StaticHandler`/`UploadedFile` quando
un valore esce dal range valido (es. `setBrotliLevel(99)`, `setMaxBodySize(0)`, content-coding
sconosciuto in `enablePrecompressed()`).

## TrueAsync\HttpServerConnectionException

```php
final class HttpServerConnectionException extends HttpServerException {}
```

Errori a livello di socket e rete: bind fallito, listener non avviato, peer reset sul critical-path
del protocollo.

## TrueAsync\HttpServerProtocolException

```php
final class HttpServerProtocolException extends HttpServerException {}
```

Errori a livello di protocollo: HTTP malformato, header non validi, violazioni del protocollo non
recuperabili.

## TrueAsync\HttpServerTimeoutException

```php
final class HttpServerTimeoutException extends HttpServerException {}
```

Timeout: lettura, scrittura, keep-alive, graceful shutdown.

## TrueAsync\HttpException

```php
namespace TrueAsync;

class HttpException extends \Async\AsyncCancellation {}
```

**Classe speciale**: non eredita da `HttpServerException` ma da `Async\AsyncCancellation`. Da usare
per inviare una risposta HTTP specifica da qualsiasi punto dell'handler — il server legge:

- `$code`: stato HTTP (deve essere 4xx/5xx, altrimenti 500);
- `$message`: corpo della risposta.

Viene anche lanciata **internamente** quando il parser raggiunge un limite dopo che l'handler è già
stato dispatchato: il server cancella l'handler con `HttpException`, e la cancellation passa per la
normale catena Async pur portando lo stato HTTP esatto per il peer.

**Non final**: ereditala per dominio:

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

## Firewall di bailout

Qualsiasi **altra** eccezione dall'handler (E_ERROR, OOM, `\Throwable` non gestiti) **non abbatte
il server**. Sul confine H1/H2/H3 di ingresso della richiesta c'è un firewall di bailout che:

1. Drena la coroutine fallita.
2. Invia 500 al client (se gli header non sono ancora sulla rete).
3. Restituisce il controllo al listener, che continua ad accettare.

Il comportamento è unico per HTTP/1.1, stream HTTP/2 e stream HTTP/3.

## Vedi anche

- [`Async\AsyncCancellation`](/it/docs/reference/exceptions/async-cancellation.html)
- [Firewall di bailout](/it/architecture/server.html#firewall-di-bailout)
- [`HttpServerConfig::isLocked()`](/it/docs/reference/server/http-server-config.html#islocked)
