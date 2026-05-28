---
layout: docs
lang: ko
path_key: "/docs/reference/server/exceptions.html"
nav_active: docs
permalink: /ko/docs/reference/server/exceptions.html
page_title: "TrueAsync Server — 예외"
description: "서버 예외 계층: HttpServerException과 그 자식, 그리고 HTTP 상태를 운반하는 cancellation인 HttpException."
---

# TrueAsync Server 예외

(PHP 8.6+, true_async_server 0.1+)

## 계층

```
\Exception
  └── TrueAsync\HttpServerException                  // base
        ├── TrueAsync\HttpServerRuntimeException     // final
        ├── TrueAsync\HttpServerInvalidArgumentException  // final
        ├── TrueAsync\HttpServerConnectionException  // final
        ├── TrueAsync\HttpServerProtocolException    // final
        └── TrueAsync\HttpServerTimeoutException     // final

\Async\AsyncCancellation
  └── TrueAsync\HttpException                        // final 아님 — domain 예외로 상속하세요
```

## TrueAsync\HttpServerException

```php
namespace TrueAsync;

class HttpServerException extends \Exception {}
```

모든 서버 오류의 베이스 예외. 오류 도메인이 중요하지 않을 때 error handling용 catch-all.

## TrueAsync\HttpServerRuntimeException

```php
final class HttpServerRuntimeException extends HttpServerException {}
```

서버 실행 중의 런타임 오류. 일반적인 원인:

- `new HttpServer($config)` 이후 구성을 수정하려는 시도 (`$config->setXxx()` after lock).
- attach 이후 `StaticHandler`를 수정하려는 시도 (`$static->setXxx()` after `addStaticHandler()`).
- `sendFile()` 이후 `HttpResponse`를 수정하려는 모든 시도 (response sealed).
- `end()`-after-`end()`, `sendFile()` 이후의 `write()`와 같은 유사한 lifecycle 위반.

## TrueAsync\HttpServerInvalidArgumentException

```php
final class HttpServerInvalidArgumentException extends HttpServerException {}
```

잘못된 인수. `HttpServerConfig`/`StaticHandler`/`UploadedFile`의 setter에서 값이 유효 범위를
벗어날 때 던져집니다 (예: `setBrotliLevel(99)`, `setMaxBodySize(0)`, `enablePrecompressed()`의
알 수 없는 content-coding).

## TrueAsync\HttpServerConnectionException

```php
final class HttpServerConnectionException extends HttpServerException {}
```

소켓 수준과 네트워크 오류: bind 실패, 활성화되지 않은 리스너, 프로토콜 critical path의 peer reset.

## TrueAsync\HttpServerProtocolException

```php
final class HttpServerProtocolException extends HttpServerException {}
```

프로토콜 수준 오류: malformed HTTP, 잘못된 헤더, 회복 불가능한 protocol violation.

## TrueAsync\HttpServerTimeoutException

```php
final class HttpServerTimeoutException extends HttpServerException {}
```

타임아웃: read, write, keep-alive, graceful shutdown.

## TrueAsync\HttpException

```php
namespace TrueAsync;

class HttpException extends \Async\AsyncCancellation {}
```

**특수 클래스**: `HttpServerException`이 아닌 `Async\AsyncCancellation`을 상속합니다.
핸들러의 어디서든 특정 HTTP 응답을 보내는 데 사용합니다. 서버가 읽는 값:

- `$code` — HTTP 상태 (4xx/5xx여야 함, 아니면 500);
- `$message` — 응답 본문.

핸들러 dispatch 이후 파서가 한도에 도달할 때 **내부적으로도** 던져집니다: 서버가 핸들러를
`HttpException`으로 cancel하고, cancellation은 일반 Async 체인을 통해 진행되지만 peer를 위한
정확한 HTTP 상태를 운반합니다.

**final 아님** — domain 별로 상속:

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

## Bailout 방화벽

핸들러의 **다른 모든** 예외(E_ERROR, OOM, 잡히지 않은 `\Throwable`)는 **서버를 죽이지 않습니다**.
H1/H2/H3 요청 entry-point에 있는 bailout 방화벽이:

1. 실패한 코루틴을 드레인합니다.
2. 클라이언트에 500을 emit합니다 (헤더가 아직 전송되지 않은 경우).
3. 제어를 리스너에 반환하고 — accept가 계속됩니다.

이 동작은 HTTP/1.1, HTTP/2 stream, HTTP/3 stream 모두에서 동일합니다.

## 참고

- [`Async\AsyncCancellation`](/ko/docs/reference/exceptions/async-cancellation.html)
- [Bailout 방화벽](/ko/architecture/server.html#bailout-방화벽)
- [`HttpServerConfig::isLocked()`](/ko/docs/reference/server/http-server-config.html#islocked)
