---
layout: docs
lang: ru
path_key: "/docs/reference/server/exceptions.html"
nav_active: docs
permalink: /ru/docs/reference/server/exceptions.html
page_title: "TrueAsync Server — исключения"
description: "Иерархия исключений сервера: HttpServerException и наследники, плюс HttpException — cancellation-носитель HTTP-статуса."
---

# Исключения TrueAsync Server

(PHP 8.6+, true_async_server 0.1+)

## Иерархия

```
\Exception
  └── TrueAsync\HttpServerException                  // base
        ├── TrueAsync\HttpServerRuntimeException     // final
        ├── TrueAsync\HttpServerInvalidArgumentException  // final
        ├── TrueAsync\HttpServerConnectionException  // final
        ├── TrueAsync\HttpServerProtocolException    // final
        └── TrueAsync\HttpServerTimeoutException     // final

\Async\AsyncCancellation
  └── TrueAsync\HttpException                        // НЕ final — наследуйте под domain-исключения
```

## TrueAsync\HttpServerException

```php
namespace TrueAsync;

class HttpServerException extends \Exception {}
```

Базовое исключение для всех ошибок сервера. Catch-all для error-handling, когда домен ошибки не
важен.

## TrueAsync\HttpServerRuntimeException

```php
final class HttpServerRuntimeException extends HttpServerException {}
```

Runtime-ошибки во время работы сервера. Типичные источники:

- Попытка изменить конфиг после `new HttpServer($config)` (`$config->setXxx()` после lock).
- Попытка изменить `StaticHandler` после attach (`$static->setXxx()` после `addStaticHandler()`).
- Любая попытка модифицировать `HttpResponse` после `sendFile()` (response sealed).
- `end()`-after-`end()`, `write()` после `sendFile()` и аналогичные нарушения lifecycle.

## TrueAsync\HttpServerInvalidArgumentException

```php
final class HttpServerInvalidArgumentException extends HttpServerException {}
```

Неверный аргумент. Бросается из сеттеров `HttpServerConfig`/`StaticHandler`/`UploadedFile` при
выходе значения из валидного диапазона (e.g. `setBrotliLevel(99)`, `setMaxBodySize(0)`, неизвестное
content-coding в `enablePrecompressed()`).

## TrueAsync\HttpServerConnectionException

```php
final class HttpServerConnectionException extends HttpServerException {}
```

Ошибки сокет-уровня и сети: bind failed, неподнятый listener, peer reset на critical-path
протокола.

## TrueAsync\HttpServerProtocolException

```php
final class HttpServerProtocolException extends HttpServerException {}
```

Ошибки уровня протокола: malformed HTTP, невалидные заголовки, неустранимые protocol-violation'ы.

## TrueAsync\HttpServerTimeoutException

```php
final class HttpServerTimeoutException extends HttpServerException {}
```

Таймауты: read, write, keep-alive, graceful shutdown.

## TrueAsync\HttpException

```php
namespace TrueAsync;

class HttpException extends \Async\AsyncCancellation {}
```

**Особый класс**: наследуется не от `HttpServerException`, а от `Async\AsyncCancellation`. Используйте
для отправки специфического HTTP-ответа из любого места обработчика — сервер прочитает:

- `$code` — HTTP-статус (должен быть 4xx/5xx, иначе будет 500);
- `$message` — тело ответа.

Также бросается **внутренне**, когда parser упирается в лимит уже после dispatch'а обработчика:
сервер кэнселит handler с `HttpException`, и cancellation идёт через нормальную Async-цепочку,
но несёт точный HTTP-статус для peer'а.

**Не final** — наследуйте под domain:

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

Любое **другое** исключение из handler'а (E_ERROR, OOM, неперехваченные `\Throwable`) **не валит
сервер**. Bailout firewall на границе H1/H2/H3 request entry-point:

1. Драинит failing-корутину.
2. Эмитит 500 клиенту (если headers ещё не на проводе).
3. Возвращает control listener'у — он продолжает accept'ить.

Это поведение единое для HTTP/1.1, HTTP/2 streams и HTTP/3 streams.

## См. также

- [`Async\AsyncCancellation`](/ru/docs/reference/exceptions/async-cancellation.html)
- [Bailout firewall](/ru/architecture/server.html#bailout-firewall)
- [`HttpServerConfig::isLocked()`](/ru/docs/reference/server/http-server-config.html#islocked)
