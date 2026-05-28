---
layout: docs
lang: uk
path_key: "/docs/reference/server/exceptions.html"
nav_active: docs
permalink: /uk/docs/reference/server/exceptions.html
page_title: "TrueAsync Server — винятки"
description: "Ієрархія винятків сервера: HttpServerException і нащадки, плюс HttpException — cancellation-носій HTTP-статусу."
---

# Винятки TrueAsync Server

(PHP 8.6+, true_async_server 0.1+)

## Ієрархія

```
\Exception
  └── TrueAsync\HttpServerException                  // base
        ├── TrueAsync\HttpServerRuntimeException     // final
        ├── TrueAsync\HttpServerInvalidArgumentException  // final
        ├── TrueAsync\HttpServerConnectionException  // final
        ├── TrueAsync\HttpServerProtocolException    // final
        └── TrueAsync\HttpServerTimeoutException     // final

\Async\AsyncCancellation
  └── TrueAsync\HttpException                        // НЕ final — успадковуйте під domain-винятки
```

## TrueAsync\HttpServerException

```php
namespace TrueAsync;

class HttpServerException extends \Exception {}
```

Базовий виняток для всіх помилок сервера. Catch-all для error-handling, коли домен помилки не
важливий.

## TrueAsync\HttpServerRuntimeException

```php
final class HttpServerRuntimeException extends HttpServerException {}
```

Runtime-помилки під час роботи сервера. Типові джерела:

- Спроба змінити конфіг після `new HttpServer($config)` (`$config->setXxx()` після lock).
- Спроба змінити `StaticHandler` після attach (`$static->setXxx()` після `addStaticHandler()`).
- Будь-яка спроба модифікувати `HttpResponse` після `sendFile()` (response sealed).
- `end()`-after-`end()`, `write()` після `sendFile()` та аналогічні порушення lifecycle.

## TrueAsync\HttpServerInvalidArgumentException

```php
final class HttpServerInvalidArgumentException extends HttpServerException {}
```

Неправильний аргумент. Кидається з сетерів `HttpServerConfig`/`StaticHandler`/`UploadedFile` при
виході значення за валідний діапазон (наприклад, `setBrotliLevel(99)`, `setMaxBodySize(0)`, невідомий
content-coding у `enablePrecompressed()`).

## TrueAsync\HttpServerConnectionException

```php
final class HttpServerConnectionException extends HttpServerException {}
```

Помилки сокет-рівня і мережі: bind failed, непіднятий listener, peer reset на critical-path
протоколу.

## TrueAsync\HttpServerProtocolException

```php
final class HttpServerProtocolException extends HttpServerException {}
```

Помилки рівня протоколу: malformed HTTP, невалідні заголовки, неусувні protocol-violation'и.

## TrueAsync\HttpServerTimeoutException

```php
final class HttpServerTimeoutException extends HttpServerException {}
```

Таймаути: read, write, keep-alive, graceful shutdown.

## TrueAsync\HttpException

```php
namespace TrueAsync;

class HttpException extends \Async\AsyncCancellation {}
```

**Особливий клас**: успадковується не від `HttpServerException`, а від `Async\AsyncCancellation`. Використовуйте
для надсилання специфічної HTTP-відповіді з будь-якого місця обробника — сервер прочитає:

- `$code` — HTTP-статус (має бути 4xx/5xx, інакше буде 500);
- `$message` — тіло відповіді.

Також кидається **внутрішньо**, коли parser упирається в ліміт уже після dispatch'а обробника:
сервер кенселить handler з `HttpException`, і cancellation іде через нормальний Async-ланцюжок,
але несе точний HTTP-статус для peer'а.

**Не final** — успадковуйте під domain:

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

Будь-який **інший** виняток з handler'а (E_ERROR, OOM, неперехоплені `\Throwable`) **не валить
сервер**. Bailout firewall на межі H1/H2/H3 request entry-point:

1. Дренує failing-корутину.
2. Емітує 500 клієнту (якщо headers ще не на дроті).
3. Повертає control listener'у — він продовжує accept'ити.

Ця поведінка єдина для HTTP/1.1, HTTP/2 streams і HTTP/3 streams.

## Див. також

- [`Async\AsyncCancellation`](/uk/docs/reference/exceptions/async-cancellation.html)
- [Bailout firewall](/uk/architecture/server.html#bailout-firewall)
- [`HttpServerConfig::isLocked()`](/uk/docs/reference/server/http-server-config.html#islocked)
