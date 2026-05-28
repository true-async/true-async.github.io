---
layout: docs
lang: zh
path_key: "/docs/server/examples.html"
nav_active: docs
permalink: /zh/docs/server/examples.html
page_title: "TrueAsync Server：示例"
description: "实战配方：JSON-API、fan-out、multipart 上传、静态文件、重定向、SSE、bailout firewall。"
---

# TrueAsync Server 示例

(PHP 8.6+, true_async_server 0.6+)

## JSON-API 带并发 fan-out

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;
use function Async\await_all;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(\Async\available_parallelism())
);

$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() !== '/dashboard') {
        $res->setStatusCode(404)->json(['error' => 'not found']);
        return;
    }

    $userId = (int) $req->getQueryParam('user_id');

    // 三个独立的数据库查询，并发执行
    [$user, $posts, $followers] = await_all([
        spawn(fn() => fetchUser($userId)),
        spawn(fn() => fetchPosts($userId)),
        spawn(fn() => fetchFollowers($userId)),
    ]);

    $res->json([
        'user'      => $user,
        'posts'     => $posts,
        'followers' => $followers,
    ]);
});

$server->start();
```

## 静态资源 + 动态路由

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\StaticHandler;
use TrueAsync\StaticOnMissing;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setCompressionEnabled(true);

$server = new HttpServer($config);

// /assets/* 从 public/ 出，不经过 PHP 处理程序
$server->addStaticHandler(
    (new StaticHandler('/assets/', __DIR__ . '/public'))
        ->setIndexFiles('index.html')
        ->enablePrecompressed('br', 'gzip')
        ->setCacheControl('public, max-age=31536000, immutable')
);

// 其他都进 PHP
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(200)->html('<h1>Dynamic route: ' . htmlspecialchars($req->getPath()) . '</h1>');
});

$server->start();
```

## Multipart 上传并 move

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setMaxBodySize(100 * 1024 * 1024)
);

$server->addHttpHandler(function ($req, $res) {
    if ($req->getMethod() !== 'POST') {
        $res->setStatusCode(405); return;
    }

    $avatar = $req->getFile('avatar');
    if ($avatar === null || !$avatar->isValid()) {
        $res->setStatusCode(400)->json(['error' => 'no valid avatar']);
        return;
    }

    if ($avatar->getSize() > 5 * 1024 * 1024) {
        $res->setStatusCode(413)->json(['error' => 'too big']);
        return;
    }

    $target = '/var/storage/avatars/' . bin2hex(random_bytes(8)) . '.bin';
    $avatar->moveTo($target);

    $res->json([
        'saved' => $target,
        'name'  => $avatar->getClientFilename(),
        'mime'  => $avatar->getClientMediaType(),
        'size'  => $avatar->getSize(),
    ]);
});

$server->start();
```

## 大文件上传流式接收，不占用内存

```php
$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setBodyStreamingEnabled(true)
        ->setMaxBodySize(10 * 1024 * 1024 * 1024)   // 10 GiB
);

$server->addHttpHandler(function ($req, $res) {
    $id = bin2hex(random_bytes(8));
    $fp = fopen("/var/storage/uploads/$id.bin", 'wb');
    if ($fp === false) {
        $res->setStatusCode(500)->json(['error' => 'open failed']); return;
    }

    $total = 0;
    try {
        while (($chunk = $req->readBody()) !== null) {
            fwrite($fp, $chunk);
            $total += strlen($chunk);
        }
    } finally {
        fclose($fp);
    }

    $res->json(['id' => $id, 'size' => $total]);
});

$server->start();
```

## SSE（Server-Sent Events）

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() !== '/events') {
        $res->setStatusCode(404); return;
    }

    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setHeader('X-Accel-Buffering', 'no')   // 对 nginx 友好
        ->setNoCompression();                      // SSE：事件要立刻送达客户端

    for ($i = 0; $i < 60; $i++) {
        $payload = json_encode(['t' => time(), 'i' => $i]);
        $res->send("data: $payload\n\n");
        \Async\delay(1000);
    }
});
```

## 带鉴权的文件下载

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, $res) {
    $token = $req->getHeader('Authorization');
    if (!isValidToken($token)) {
        $res->setStatusCode(401); return;
    }

    $reportId = preg_replace('#[^a-z0-9-]#', '', $req->getQueryParam('id') ?? '');
    if ($reportId === '') {
        $res->setStatusCode(400); return;
    }

    $res->sendFile("/var/storage/reports/$reportId.pdf", new SendFileOptions(
        contentType:  'application/pdf',
        disposition:  SendFileDisposition::ATTACHMENT,
        downloadName: "report-$reportId.pdf",
        cacheControl: 'private, no-store',
    ));
});
```

## Redirect

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/old-url') {
        $res->redirect('/new-url', 301);
        return;
    }
    // ...
});
```

## 预编码 JSON（跳过二次编码）

```php
$cache = new RedisCache();

$server->addHttpHandler(function ($req, $res) use ($cache) {
    $key = 'feed:' . $req->getQueryParam('uid');
    $cached = $cache->get($key);

    if ($cached !== null) {
        // 字符串 → 原样发送，不再打包
        $res->json($cached);
        return;
    }

    $payload = buildFeed($req);
    $cache->set($key, $payload = json_encode($payload), 60);
    $res->json($payload);
});
```

## Bailout firewall：fatal 不会击垮服务器

故意写坏的处理程序：

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/boom') {
        throw new \Error('uncaught fatal');
    }
    $res->setStatusCode(200)->setBody('ok');
});
```

对 `/boom` 的请求会返回 **500 Internal Server Error**，handler 协程被排空，listener
继续接受新连接。E_ERROR、OOM 以及 shutdown 期间未捕获的异常行为相同。H1、H2、H3 上都一致。

## 自定义 HTTP 异常

`TrueAsync\HttpException extends Async\AsyncCancellation`。在处理程序里任何位置抛出它，
就能通过正常的 cancellation 链发出具体的 HTTP 状态。

```php
use TrueAsync\HttpException;

class NotFoundException extends HttpException {}
class ForbiddenException extends HttpException {}

$server->addHttpHandler(function ($req, $res) {
    $user = User::find($req->getQueryParam('id'))
         ?? throw new NotFoundException('user not found', 404);

    if (!$user->canBeViewedBy(currentUser()))
         throw new ForbiddenException('access denied', 403);

    $res->json($user->toArray());
});
```

状态码取自 `$code`（必须是 4xx/5xx，否则降为 500），响应体取自 `$message`。

## 也可参考

- [仓库的 `examples/` 目录](https://github.com/true-async/server/tree/main/examples)
  （`minimal-server.php`、`demo-server.php`、`multi-worker.php`、`multi-worker-manual.php`）
- [配置](/zh/docs/server/configuration.html)
- [Multi-worker](/zh/docs/server/workers.html)
