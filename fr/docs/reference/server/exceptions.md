---
layout: docs
lang: fr
path_key: "/docs/reference/server/exceptions.html"
nav_active: docs
permalink: /fr/docs/reference/server/exceptions.html
page_title: "TrueAsync Server — exceptions"
description: "Hiérarchie des exceptions du serveur : HttpServerException et descendants, plus HttpException — porteur de statut HTTP via la cancellation."
---

# Exceptions TrueAsync Server

(PHP 8.6+, true_async_server 0.1+)

## Hiérarchie

```
\Exception
  └── TrueAsync\HttpServerException                  // base
        ├── TrueAsync\HttpServerRuntimeException     // final
        ├── TrueAsync\HttpServerInvalidArgumentException  // final
        ├── TrueAsync\HttpServerConnectionException  // final
        ├── TrueAsync\HttpServerProtocolException    // final
        └── TrueAsync\HttpServerTimeoutException     // final

\Async\AsyncCancellation
  └── TrueAsync\HttpException                        // PAS final — héritez pour vos exceptions domain
```

## TrueAsync\HttpServerException

```php
namespace TrueAsync;

class HttpServerException extends \Exception {}
```

Exception de base pour toutes les erreurs serveur. Catch-all pour l'error-handling quand le domaine
de l'erreur n'importe pas.

## TrueAsync\HttpServerRuntimeException

```php
final class HttpServerRuntimeException extends HttpServerException {}
```

Erreurs runtime pendant le fonctionnement du serveur. Sources typiques :

- Tentative de modifier la config après `new HttpServer($config)` (`$config->setXxx()` après lock).
- Tentative de modifier un `StaticHandler` après attach (`$static->setXxx()` après
  `addStaticHandler()`).
- Toute tentative de modifier `HttpResponse` après `sendFile()` (réponse sealed).
- `end()`-après-`end()`, `write()` après `sendFile()` et violations de lifecycle analogues.

## TrueAsync\HttpServerInvalidArgumentException

```php
final class HttpServerInvalidArgumentException extends HttpServerException {}
```

Argument invalide. Levée par les setters de `HttpServerConfig`/`StaticHandler`/`UploadedFile` quand
la valeur est hors plage (par ex. `setBrotliLevel(99)`, `setMaxBodySize(0)`, content-coding inconnu
dans `enablePrecompressed()`).

## TrueAsync\HttpServerConnectionException

```php
final class HttpServerConnectionException extends HttpServerException {}
```

Erreurs niveau socket et réseau : bind failed, listener non levé, peer reset sur critical-path du
protocole.

## TrueAsync\HttpServerProtocolException

```php
final class HttpServerProtocolException extends HttpServerException {}
```

Erreurs niveau protocole : HTTP malformé, en-têtes invalides, violations de protocole non
récupérables.

## TrueAsync\HttpServerTimeoutException

```php
final class HttpServerTimeoutException extends HttpServerException {}
```

Timeouts : read, write, keep-alive, graceful shutdown.

## TrueAsync\HttpException

```php
namespace TrueAsync;

class HttpException extends \Async\AsyncCancellation {}
```

**Classe particulière** : hérite non pas de `HttpServerException` mais de `Async\AsyncCancellation`.
À utiliser pour envoyer une réponse HTTP spécifique depuis n'importe où dans le handler — le
serveur lit :

- `$code` : statut HTTP (doit être 4xx/5xx, sinon 500) ;
- `$message` : corps de la réponse.

Également levée **en interne** quand le parseur bute sur une limite après le dispatch du handler :
le serveur cancel le handler avec `HttpException`, la cancellation passe par la chaîne Async
normale, mais porte le statut HTTP exact pour le peer.

**Pas final** — héritez par domaine :

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

Toute **autre** exception du handler (E_ERROR, OOM, `\Throwable` non capturés) **ne tue pas le
serveur**. Bailout firewall à la frontière du request entry-point H1/H2/H3 :

1. Draine la coroutine en échec.
2. Émet 500 vers le client (si les en-têtes ne sont pas encore partis).
3. Rend le contrôle au listener — qui continue d'accepter.

Ce comportement est uniforme pour HTTP/1.1, streams HTTP/2 et streams HTTP/3.

## Voir aussi

- [`Async\AsyncCancellation`](/fr/docs/reference/exceptions/async-cancellation.html)
- [Bailout firewall](/fr/architecture/server.html#bailout-firewall)
- [`HttpServerConfig::isLocked()`](/fr/docs/reference/server/http-server-config.html#islocked)
