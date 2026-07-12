---
layout: tutorial
lang: zh
path_key: "/tutors-laravel/03-sse-grpc.html"
nav_active: docs
permalink: /zh/tutors-laravel/03-sse-grpc.html
page_title: "Laravel 中的 SSE 与 gRPC"
description: "trueasync_response()、Sse 与 grpc_handlers：直接从控制器越过被缓冲的 Illuminate Response。"
---

# Laravel 中的 SSE 与 gRPC

`laravel-spawn` 内部的 `TrueAsyncServer` 构建得很简单：它接收一个 `HttpRequest`，从中组装出一个 `Illuminate\Http\Request`，把它交给 `Kernel::handle()` 处理，得到一个 `Illuminate\Http\Response`，将其整体缓冲进一个 `HttpResponse`，然后发送出去。一个请求，一个响应，所有内容一次性发出。这正是 Laravel 自诞生以来一直习惯的方式。

但本站的第二个系列里出现过一个通过 `SSE` 和 `gRPC` 在同一端口上传输的进度条，而它们都不遵循"一个响应"的公式，而是遵循"消息流"的公式。被缓冲的 `Illuminate\Response` 并不是为它们设计的：它既没有 `sseEvent()`，也没有 `writeMessage()`。所以控制器需要一种方式，越过缓冲区，直接触达底层原始的 `HttpResponse`。

## 按需获取原始响应

`laravel-spawn` 会在把控制权交给 Laravel 路由器之前，把当前请求的 `HttpRequest` 和 `HttpResponse` 放入 `request_context()`，这正是 Laravel 自身在第一章中用来存放 `auth` 和 `session` 的同一套手法。你可以用两个函数取回它们：

```php
trueasync_request();   // TrueAsync\HttpRequest
trueasync_response();  // TrueAsync\HttpResponse
```

一旦控制器已经写入了原始响应并自行关闭它(`$res->end()`)，通常的 `Illuminate\Response` 流程就不再需要了：`TrueAsyncServer` 在缓冲之前会检查 `isClosed()`，如果响应已经被手动发送，它就不会在上面再追加任何内容。控制器仍然被要求返回点什么，Laravel 需要它，但已经没有人在意那个返回值的内容了。

## SSE：Laravel 路由中的进度条

每次都通过 `trueasync_response()` 去调用 `sseStart()`/`sseEvent()`/`sseComment()` 很不方便，所以这个包提供了一个轻量的封装：

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
            break; // 标签页已被关闭
        }

        delay(1000);
    }

    Sse::event(event: 'finished', data: 'ok');
    Sse::end();

    return response()->noContent();
});
```

认出这段代码了吗？这正是服务器系列第六章中的那个进度条，逐字逐句，只是把 `$res->sseEvent()` 换成了 `Sse::event()`。在这个路由内部，`Auth::user()`、`session()`、`Eloquent` 依然全部可用，这是一个普通的 Laravel 处理器，只是它用流而不是一次性的方式来响应。中间件、通过 `Route::middleware('auth:sanctum')` 实现的授权、第一章中用于每请求状态的 `current_context()`，全都照常工作，因为这段代码周围的 `Kernel::handle()` 一行都没有改变。

有一个配置细节和 Laravel 本身无关，而是关于服务器本身的：长时间存活的流不应该被那些普通响应实际需要的写超时打断，所以带有流的服务会把它全局关闭，在 `.env` 中设置 `ASYNC_WRITE_TIMEOUT=0`，这正是服务器系列生产环境那一章用到的同一个开关。

## gRPC：契约取代路由

对 `gRPC` 而言，妥协更彻底。该协议使用 protobuf 编码的消息通信，这些消息无法有意义地映射到 `Illuminate\Http\Request` 上，更遑论 `Response` 了。为了把它硬塞进 Laravel 的路由和中间件而伪造一个假的 HTTP 请求毫无意义：gRPC 客户端既不发送 cookie，也不发送 CSRF 令牌，也没有表单体。所以 `laravel-spawn` 中的 `gRPC` 完全绕过了 `Kernel`，走一条通过配置文件设置的独立路径：

```php
// config/async.php
'grpc_handlers' => [
    '/profile.ProfileService/GetProfile' => [
        \App\Grpc\ProfileServiceHandler::class, 'getProfile',
    ],
],
```

处理器本身通过容器解析(所以普通的构造函数依赖注入依然有效)，方法签名和服务器系列第十章中见过的那对原始对象是一样的：

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
        // 普通的 return：服务器自己会附加 grpc-status: 0 (OK)
    }
}
```

`$this->users` 是通过构造函数注入进来的，就像任何 Laravel 服务一样：容器和依赖注入依然完全在起作用，尽管 Laravel 的路由从未触碰过这条路径。错误的传递方式和普通的 `TrueAsync Server` 中一样：通过 `grpc-status` 尾部字段(trailer)，而不是 HTTP 状态码。

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

从处理器中抛出的异常，会被 `laravel-spawn` 自身转换为 `grpc-status: 13`(`INTERNAL`)，和裸服务器的行为一致，只是现在被藏在了适配器内部。

## 这里什么是真实的，什么不是

这两条路径都不是套在 Symfony 的 `StreamedResponse` 之上的模拟或黑科技，二者都是从 Laravel 路由内部直接访问服务器系列里那同一套 `HttpRequest`/`HttpResponse` 原语。代价是可以预见的：SSE 处理器不再通过熟悉的 `return response()->json(...)` 来响应，它需要自行写入并自行决定何时关闭连接；gRPC 处理器完全看不到 Laravel 的中间件或路由，只能看到用于依赖注入的容器。这里没有任何黑魔法，但也没有任何假装：如果你需要真正的流，就必须走出被缓冲的 `Response` 那个舒适的世界，进入服务器自身所在的地方。

我们已经讲完了 Laravel 能做什么：普通请求、流、gRPC。剩下的是 Laravel 自己做不到的事，以及在把代码交给并发协程之前，你自己的代码和别人的代码中值得仔细审视的地方。这正是下一章要讲的内容。
