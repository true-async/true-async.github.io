---
layout: tutorial
lang: zh
path_key: "/tutors-server/01-first-server.html"
nav_active: docs
permalink: /zh/tutors-server/01-first-server.html
page_title: "你的第一个服务器"
description: "PHP 内部的 HTTP 服务器：HttpServer、HttpServerConfig，以及你的第一个处理器。"
---

# 你的第一个服务器

让我们回忆一下 PHP 通常是如何处理一个请求的。Nginx 接受连接，然后把它
交给 PHP-FPM。FPM 抓取一个空闲进程。进程醒来，加载类，打开数据库连接，
组装响应，发送出去。然后死掉。它设法构建的一切，每一个连接，每一个缓
存，还有第一部里那些精心预热好的连接池，统统被扔进垃圾桶。一毫秒之后
下一个请求到来，整个故事又从头再演一遍。每秒一百次。一千次。

与此同时，在第一部里我们打造了一整套军火库，而这样的生命方式恰恰对它
们是禁忌：连接池只有在长期存活时才有用，而一个被记忆化的 `Future` 如果
随着进程一起死掉就毫无意义了。

所以这一部的计划很简单：去掉中间人。`TrueAsync Server` 是一个扩展，它
把 `HTTP` 服务器直接运行在 `PHP` 进程内部：

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    new HttpServerConfig()->addListener('0.0.0.0', 8080)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

```bash
$ php server.php &
$ curl -i http://localhost:8080/
HTTP/1.1 200 OK
Content-Length: 13

Hello, World!
```

`addListener` 打开一个端口，`addHttpHandler` 注册一个处理器函数，而
`start()` 启动事件循环并且永不返回。每一个到来的请求都会运行这个处理器。

## 处理器就是一个协程

每一次处理器的调用都运行在它自己的协程里（`spawn`）。这在实践中意味着
什么？让我们做个实验。我们给服务器加一个故意很慢的路由：

```php
use function Async\delay;

$server->addHttpHandler(function ($request, $response) {
    if ($request->getPath() === '/slow') {
        delay(5000); // 五秒钟的“繁重” I/O 工作
        $response->setBody("was slow\n");
        return;
    }

    $response->setBody("fast\n");
});
```

现在打开两个终端。在第一个里，请求 `/slow`。它会挂起，等满它的五秒钟。
不用等它，在第二个终端里请求 `/`：

```bash
$ curl http://localhost:8080/
fast
```

瞬间返回。

如果你读过第一部，你已经明白发生了什么。`/slow` 协程在 `delay` 里睡着
了，调度器把控制权交了出去，服务器从容地处理了第二个请求。这些就是第
一章里那两个“A”和“B”计数器，只不过现在它们叫做 HTTP 请求。一个线程。一
个事件循环。成千上万个并发的客户端。

现在设想同样的 `/slow` 会对经典的 FPM 造成什么后果。五秒的睡眠就是五秒
钟里一整个 worker 完全瘫痪。十几个这样的请求，worker 池就耗尽了。整个
站点停下来干等，就因为有人在打盹。

## 一个不会死的进程

第二个后果比第一个更有意思，尽管它看起来平淡无奇。`start()` 永不返回。
这意味着在它之前创建的一切都会与服务器同寿：

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX     => 10,
]);

$directory = new RegionsDirectory(); // 来自第六章的记忆化

$server->addHttpHandler(function ($request, $response) use ($pdo, $directory) {
    // 连接池已经预热，目录已经加载
});

$server->start();
```

连接池只打开一次。地区目录只加载一次。路由只编译一次。还记得第一部在
复用工具上花了多少功夫吗？这里就是它们全部落地归位的地方。冷启动没有变
快。它消失了。

公平地说，长寿命是有代价的，值得开门见山地讲清楚。内存泄漏不再因为请求
结束后进程的死亡而被原谅。一个全局变量不再是“只服务一个请求”，它是永久
的，而且是对所有人的。不必惊慌：第一部里的 scope、连接池和 context 正是
为此而发明的，我们会在单独的一章里讲清楚服务器特有的细节。

眼下我们的服务器有个更简单的问题：它对所有请求都回答同样的东西。
`GET /profile/42`、`POST /profile/42/address`、URL 里的一个拼写错误，都没
有区别。一个真正的 `ProfileService` 得学会读取请求。这正是我们接下来要
攻克的。
