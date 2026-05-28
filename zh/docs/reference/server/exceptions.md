---
layout: docs
lang: zh
path_key: "/docs/reference/server/exceptions.html"
nav_active: docs
permalink: /zh/docs/reference/server/exceptions.html
page_title: "TrueAsync Server —— 异常"
description: "服务器异常体系：HttpServerException 及其子类，以及承载 HTTP 状态的 cancellation 类 HttpException。"
---

# TrueAsync Server 异常

(PHP 8.6+, true_async_server 0.1+)

## 体系

```
\Exception
  └── TrueAsync\HttpServerException                  // 基类
        ├── TrueAsync\HttpServerRuntimeException     // final
        ├── TrueAsync\HttpServerInvalidArgumentException  // final
        ├── TrueAsync\HttpServerConnectionException  // final
        ├── TrueAsync\HttpServerProtocolException    // final
        └── TrueAsync\HttpServerTimeoutException     // final

\Async\AsyncCancellation
  └── TrueAsync\HttpException                        // 非 final —— 可继承做 domain 异常
```

## TrueAsync\HttpServerException

```php
namespace TrueAsync;

class HttpServerException extends \Exception {}
```

所有服务器错误的基类。当错误的领域不重要时，用作 catch-all。

## TrueAsync\HttpServerRuntimeException

```php
final class HttpServerRuntimeException extends HttpServerException {}
```

服务器运行期错误。典型来源：

- 在 `new HttpServer($config)` 之后试图改 config（锁定后调用 `$config->setXxx()`）。
- 在 attach 后试图改 `StaticHandler`（`addStaticHandler()` 之后调用 `$static->setXxx()`）。
- 在 `sendFile()` 之后试图改 `HttpResponse`（response 已封口）。
- `end()` 之后再 `end()`、`sendFile()` 之后又 `write()` 之类的生命周期违规。

## TrueAsync\HttpServerInvalidArgumentException

```php
final class HttpServerInvalidArgumentException extends HttpServerException {}
```

参数非法。`HttpServerConfig`/`StaticHandler`/`UploadedFile` 的 setter 在值超出合法范围时抛出
（例如 `setBrotliLevel(99)`、`setMaxBodySize(0)`、`enablePrecompressed()` 收到未知 content-coding）。

## TrueAsync\HttpServerConnectionException

```php
final class HttpServerConnectionException extends HttpServerException {}
```

socket 层 / 网络错误：bind 失败、listener 没起来、协议关键路径上的 peer reset。

## TrueAsync\HttpServerProtocolException

```php
final class HttpServerProtocolException extends HttpServerException {}
```

协议级错误：HTTP 报文格式非法、非法 header、无法恢复的协议违规。

## TrueAsync\HttpServerTimeoutException

```php
final class HttpServerTimeoutException extends HttpServerException {}
```

超时：read、write、keep-alive、graceful shutdown。

## TrueAsync\HttpException

```php
namespace TrueAsync;

class HttpException extends \Async\AsyncCancellation {}
```

**特殊的一类**：不从 `HttpServerException` 派生，而是从 `Async\AsyncCancellation` 派生。
在处理程序里任意位置抛出它，就能发出具体的 HTTP 响应 —— 服务器会读：

- `$code` —— HTTP 状态（必须是 4xx/5xx，否则降为 500）；
- `$message` —— 响应体。

也会**在内部**抛出：当 parser 在 handler 派发之后撞上限制时，服务器会用 `HttpException`
取消 handler，cancellation 走正常的 Async 链路，但携带精确的 HTTP 状态给对端。

**非 final** —— 可以按 domain 派生：

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

handler 抛出的**任何其他**异常（E_ERROR、OOM、未捕获的 `\Throwable`）都**不会击垮服务器**。
在 H1/H2/H3 的请求入口处有一道 bailout firewall：

1. 把失败的协程排空。
2. 给客户端发 500（如果响应头还没出去）。
3. 把控制权交还给 listener，它继续 accept。

HTTP/1.1、HTTP/2 stream 和 HTTP/3 stream 上行为一致。

## 也可参考

- [`Async\AsyncCancellation`](/zh/docs/reference/exceptions/async-cancellation.html)
- [Bailout firewall](/zh/architecture/server.html#bailout-firewall)
- [`HttpServerConfig::isLocked()`](/zh/docs/reference/server/http-server-config.html#islocked)
