---
layout: tutorial
lang: zh
path_key: "/tutors-server/08-workers.html"
nav_active: docs
permalink: /zh/tutors-server/08-workers.html
page_title: "Workers 与 HTTP/3"
description: "setWorkers()：把第一季的线程装进服务器引擎盖下、bootloader，以及同一端口上的 HTTP/3。"
---

# Workers 与 HTTP/3

在负载下的服务器上打开个 htop 看看。我们的进程在拼命干活，成千上万个请求在飞……而八个核心里，只有一个在忙。七个闲着。恼人吗？恼人。

这里没什么新鲜事，我们在讲线程的那一章讲过：当任务在 I/O 上等待时，一个核心就够所有人用了。但在真实流量下，服务器不只是等待。HTTP 解析、TLS 握手、JSON 序列化，这些都是计算，而它们全都撞在那一个核心上。

还是那一章里的方子：给计算配上线程。服务器只用一行就用上了它：

```php
$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(Async\available_parallelism());
```

`setWorkers(N)` 启动 N 个 worker，而它就是字面意义上第十四章里的 `Async\ThreadPool`。不是"类似的机制"，而是同一个东西。这意味着你也已经知道规则了：每个 worker 都是一个独立的操作系统线程，有自己的 PHP 环境、自己的事件循环、自己的池。配置和处理器按照通常的线程间传递规则被复制进每个 worker。父进程里的 `start()` 会等待它们全部。

只剩一个问题：是谁把进来的连接交给 worker 的？而这里是最妙的部分。没有谁。每个 worker 都用 `SO_REUSEPORT` 标志打开同一个端口，从那里起，Linux 内核自己在它们之间分发连接。没有调度器，没有队列，没有锁。八个独立的服务器藏在一个端口后面。

## Bootloader：为每个 Worker 预热

在第一季里，ThreadPool 有一个 bootloader，在那里它看起来像是一个可选的便利功能。在这里它成了核心角色。原因是这样的：我们在第一章里"一次性、在 `start()` 之前"做的一切，现在都得在每个 worker 里发生。毕竟每个 worker 都有自己的内存。

```php
$config
    ->setWorkers(8)
    ->setBootloader(function () {
        require __DIR__ . '/vendor/autoload.php';

        Database::initPool(min: 4, max: 16); // 每个 worker 里各自的 PDO 池
        Router::compile();
    });
```

这个闭包在每个 worker 里运行一次，在第一个请求之前。它内部抛出的异常会让整个池停下来。严苛？正确：一个八个 worker 里有一个没预热好的服务器，是一台每第八个客户端就吐出错误的机器。它还不如干脆别启动。

## 聊天遭遇 Workers

现在轮到那场承诺过的爆炸了。上一章我们在"进程内存中的共享状态"这条公式上建起了一个聊天。慢慢地重读这条公式。在内存中。进程的。

八个进程里的哪一个？

内核随心所欲地把连接撒出去。Alice 落进了 worker 3，Bob 落进了 worker 5。每个 worker 有自己的内存，因而也有自己的 `$room`。两个同名的房间，彼此永远不会知道对方的存在。Alice 对着虚空写字，Bob 在另一个虚空里沉默。没有竞态，没有错误，聊天只是静悄悄地不再是聊天了。

经典的出路是把共享状态挪到进程之外，挪进 Redis pub/sub，让各个 worker 通过它对话。这行得通，可现在，仅仅为了在同一台服务器的各个线程之间传递消息，一个聊天就得在旁边多跑一个服务。

所以服务器自带了它自己的答案：**topic**。一个连接订阅一个名字，一条消息被发布到那个名字上，服务器就把它投递给每一个订阅者——在每一个 worker 上。不需要连接数组，也不需要 Redis。

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = $req->getQueryParam('room', 'lobby');
    $name = $req->getQueryParam('name', 'guest');

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", "$name: {$msg->data}");
    }
});
```

把它和上一章的房间比一比。`SplObjectStorage` 不见了，随它一起消失的还有那个手写的广播循环，以及那个专门清扫幽灵的 `finally`。`subscribe()` 把这个连接放进房间；`publish()` 向房间里的每一个人送出一行。一个正在关闭的连接会自己离开它所在的房间。而在从前那个房间只活在某一个 worker 的内存里的地方，如今一个 topic 横跨了所有 worker：worker 3 里的 Alice 和 worker 5 里的 Bob 又重新待在同一个 `chat/general` 里了。

`publish()` 从不阻塞——一个缓冲区已满的对端会丢掉这一行，而不是拖住整个房间，这和 `trySend()` 做出的取舍是同一个。它返回自己触达的本地订阅者数量；投递到其他 worker 的事在幕后发生。这个名字不只是一个字符串，它是一个 [MQTT 过滤器](/zh/docs/server/websocket.html#topics-publishsubscribe-across-every-worker)：订阅 `chat/+/typing`，你就能一次拿到每一个房间的正在输入信号。

对于一个小系统，`setWorkers(1)` 仍然是一个诚实的答案——一个 worker 毫不费力地就撑住成千上万个大多在等待的 WebSocket 连接。但你不再需要仅仅为了让聊天能用而去选它了。一条要记住的规则：请求状态活在请求作用域里，进程状态活在 worker 里，共享状态要么活在一个 topic 里，要么活在外部存储里。

## HTTP/3：同样的处理器，不同的传输层

既然我们已经在扩展了，那就把技术栈升级到现代吧。关于 HTTP/3，知道三件事就够了。它不跑在 TCP 上，而是跑在 UDP 之上的 QUIC 上。它建立连接更快，而且不会让一个丢失的数据包一下子拖住所有的流。而它是必学的，因为浏览器已经更偏好它了。

听起来像一个大工程？看：

```php
$config = (new HttpServerConfig())
    ->setWorkers(Async\available_parallelism())
    ->setCertificate('/etc/tls/profile.crt')
    ->setPrivateKey('/etc/tls/profile.key')
    ->addListener('0.0.0.0', 443, tls: true)  // TCP：HTTP/1.1 和 HTTP/2
    ->addHttp3Listener('0.0.0.0', 443);       // UDP：HTTP/3
```

一行，`addHttp3Listener`。同一个端口，并且没有冲突：443/TCP 监听 HTTP/1.1 和 HTTP/2，而 443/UDP 走 QUIC。它没有单独的 TLS 标志，因为按照规范，QUIC 离开 TLS 就不存在；证书取自服务器。

客户端怎么得知那个 UDP 入口？它们自己得知。服务器会给每一个走 TCP 的响应加上一个 `Alt-Svc: h3=":443"` 头。浏览器看到它，就把后续的请求走 HTTP/3。首次访问走 HTTP/2，然后走 QUIC，谁都没配置任何东西。

```bash
$ curl --http3 -I https://profile.example.com/
HTTP/3 200
alt-svc: h3=":443"; ma=86400
```

知道这一章我最喜欢什么吗？是它里面没有的东西。我们开启了八个线程和第三个版本的 HTTP，而处理器里没有一行代码改动。第二章的路由、第六章的 SSE、第七章的聊天，没有一个知道它们周围的世界变成了多线程并开始讲 QUIC。扩展搬进了配置里，那才是它该待的地方。

服务器变快了。下一步是让它坚不可沉：过载怎么办、慢客户端怎么办、在流量正盛时部署怎么办。整整一章讲的都是糟糕的日子。
