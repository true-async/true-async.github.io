---
layout: tutorial
lang: zh
path_key: "/tutors-server/02-request-response.html"
nav_active: docs
permalink: /zh/tutors-server/02-request-response.html
page_title: "请求与响应"
description: "HttpRequest 与 HttpResponse：路由、json()，以及通过 HttpException 处理错误。"
---

# 请求与响应

处理器接收两个对象。`HttpRequest` 是客户端发来的一切，它是只读的。
`HttpResponse` 是要返回的一切。在它们之间的是你的代码。让我们在这三件套
上构建一个最小的个人资料 `API`，并顺带看看这些对象都能做些什么。

## 解析请求

```php
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $method = $req->getMethod();   // GET, POST, ...
    $path   = $req->getPath();     // /profile/42，不含查询字符串

    if ($method === 'GET' && preg_match('#^/profile/(\d+)$#', $path, $m)) {
        showProfile((int) $m[1], $req, $res);
        return;
    }

    if ($method === 'POST' && preg_match('#^/profile/(\d+)/address$#', $path, $m)) {
        updateAddress((int) $m[1], $req, $res);
        return;
    }

    $res->setStatusCode(404)->setBody("Not found\n");
});
```

请求的大部分内容已经被解析好，并以便捷的形式提供：

```php
// GET /profile/42?fields=name,address&debug=1
$req->getQuery();                    // ['fields' => 'name,address', 'debug' => '1']
$req->getQueryParam('debug', '0');   // '1'，带一个默认值

// 带表单的 POST：application/x-www-form-urlencoded 或 multipart
$req->getPost();                     // ['address' => ['city' => 'Berlin', ...]]

// 请求头，大小写不敏感
$req->getHeader('authorization');    // 'Bearer eyJ...' 或 null

// 原始请求体，例如 JSON
$data = json_decode($req->getBody(), true);
```

`getQuery()` 和 `getPost()` 理解 PHP 里那种熟悉的数组记法：
`address[city]`、`photos[]`。从旧的 `$_GET`/`$_POST` 迁移过来几乎是逐字
对应的。

## 组装响应

一个 `API` 需要 `JSON`，而响应对象为它准备好了一个现成的助手方法：

```php
function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $profile = loadProfile($userId);

    $res->json($profile);                    // 200, Content-Type: application/json
    $res->json($errors, status: 422);        // 状态码作为第二个参数
}
```

其他助手方法秉承同样的风格：

```php
$res->html('<h1>Profile updated</h1>');
$res->redirect('/profile/42', 303);
$res->setHeader('Cache-Control', 'no-store');
```

每个方法都返回 `$this`，所以响应是以链式方式组装的。你不需要显式地把它
收尾：处理器返回了，响应就发出去了。

## 错误：HttpException

现在来看 `updateAddress`。个人资料可能不存在。地址可能没有被发送。校验
可能失败。我们要为每种情况都写一个 `setStatusCode` 加一个提前 `return`
吗？我们可以。或者我们也可以这样做：

```php
use TrueAsync\HttpException;

function updateAddress(int $userId, HttpRequest $req, HttpResponse $res): void
{
    if (!profileExists($userId)) {
        throw new HttpException('Profile not found', 404);
    }

    $address = $req->getPost()['address'] ?? null;

    if ($address === null) {
        throw new HttpException('Address is required', 422);
    }

    saveAddress($userId, $address);
    $res->json(['ok' => true]);
}
```

服务器无需翻译器就能理解 `HttpException`：异常码变成状态码，消息变成响
应体。不会有带着堆栈跟踪泄露出去的 500。这个类不是 final 的，所以你可以
构建自己的层级结构，从此忘掉那些魔法数字：

```php
final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Not found')
    {
        parent::__construct($message, 404);
    }
}
```

这里我要请你留意片刻，因为接下来是我在这一章里最喜欢的细节。看看这个类
的血统：

`HttpException extends Async\AsyncCancellation`

正是那个取消异常。来自第一部的第二章。巧合吗？不。想想当客户端在请求中
途断开连接时服务器应该做什么：停止处理器协程。而我们如何停止协程？协作
式取消。一个 HTTP 错误和一个协程取消，原来是同一套机制，只是从不同的侧
面去看罢了。

从这种血缘关系里，引出了那条老规矩，我们在讲取消的那一章里已经熟悉了：
如果你不小心连同 `Throwable` 一起捕获了 `HttpException`，请把它重新抛
出。服务器知道该拿它怎么办。你不必知道。

于是这个 `API` 按规矩响应，也按规矩失败。但我们的处理器仍然简单得可疑：
一个检查，一个查询，一个响应。当它们需要在内部访问数据库、`GeoDirectory`
和缓存，而且最好是并发地访问时，会发生什么？那是第三章。在那里，第一部
终于会火力全开。
