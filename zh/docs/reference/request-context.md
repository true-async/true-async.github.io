---
layout: docs
lang: zh
path_key: "/docs/reference/request-context.html"
nav_active: docs
permalink: /zh/docs/reference/request-context.html
page_title: "request_context()"
description: "Async\\request_context() —— 整棵处理程序协程树都可见的请求级上下文。绑定到由宿主 C 代码（HTTP 服务器）建立的 request-scope。"
---

# request_context

(PHP 8.6+, True Async 1.0)

`Async\request_context()` 返回从父协程继承的 request-scope 的
[`Context`](/zh/docs/components/context.html)，如果当前没有 request-scope 则返回 `null`。

## 描述

```php
namespace Async;

function request_context(): ?Context
```

Request-scope 由**宿主 C 代码**（例如 HTTP 服务器）建立，并自动传播到所有子协程。
这给处理程序提供一个整棵请求协程树都可见的统一上下文。

| 函数 | 返回什么 |
|------|----------|
| `current_context()` | **当前协程**的上下文 —— 每个协程独立 |
| `coroutine_context()` | `current_context()` 的别名 |
| `request_context()` | **请求**上下文 —— handler 与其所有子协程共享 |
| `root_context()` | root-scope 的上下文 |

## 返回值

`Async\Context` —— request-scope 共享上下文；不在 request-scope 内（例如没有 HTTP 服务器的 CLI 脚本）
则返回 `null`。

## 示例

### 示例 #1 把 request-id 贯穿到整棵协程树

```php
<?php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;
use function Async\await_all;
use function Async\request_context;

$server = new HttpServer((new HttpServerConfig())->addListener('0.0.0.0', 8080));

$server->addHttpHandler(function ($req, $res) {
    $rid = $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8));
    request_context()->set('request_id', $rid);
    request_context()->set('user_id', authUser($req));

    // 子协程自动看到同一个上下文。
    [$user, $posts] = await_all([
        spawn(fn() => fetchUser()),
        spawn(fn() => fetchPosts()),
    ]);

    $res->setHeader('X-Request-Id', $rid);
    $res->json(['user' => $user, 'posts' => $posts]);
});

function fetchUser(): array
{
    // 这里能拿到 request_id —— 例如用于日志
    $rid = request_context()?->get('request_id');
    log_debug("[$rid] fetching user");
    // ...
    return [/* ... */];
}

$server->start();
```

### 示例 #2 在非 request-scope 中安全访问

```php
<?php
use function Async\request_context;

function audit_log(string $event): void
{
    $ctx = request_context();
    $rid = $ctx?->get('request_id') ?? 'no-request';
    error_log("[$rid] $event");
}

// 在 HTTP 处理程序里能拿到 request_id；
// 在后台 CLI 任务里 request_context() === null，$rid === 'no-request'。
```

### 示例 #3 与 `current_context()` 的区别

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\request_context;
use function Async\current_context;

$server->addHttpHandler(function ($req, $res) {
    request_context()->set('request_id', 'abc-123');
    current_context()->set('local',      'handler-only');

    $child = spawn(function () {
        // 能看到 request_context，因为它在整个请求 scope 共享。
        var_dump(request_context()->get('request_id')); // string(7) "abc-123"

        // 子协程的 current_context() 是它自己的。
        var_dump(current_context()->find('local'));     // NULL
    });
    await($child);

    $res->setStatusCode(204);
});
```

## 备注

> **何时返回 `null`**。Request-scope 由外部代码（HTTP 服务器、队列、gRPC）设置。
> 在没有这类宿主的普通 CLI 脚本里，`request_context()` 始终为 `null` —— 这是正常情况。

> **不是用作通用通信。** `request_context()` 有意限定在请求 scope 内。
> 系统级共享值（配置、registry）请使用普通服务 / DI 容器；per-coroutine 数据用 `current_context()`。

## 也可参考

- [Async\\Context](/zh/docs/components/context.html) —— context 类本身及其方法
- [Async\\current_context()](/zh/docs/reference/current-context.html) —— 当前协程的上下文
- [Async\\root_context()](/zh/docs/reference/root-context.html) —— root-scope 上下文
- [TrueAsync Server：per-request scope](/zh/docs/server/workers.html#per-request-scope)
