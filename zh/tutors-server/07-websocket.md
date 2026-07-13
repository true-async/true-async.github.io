---
layout: tutorial
lang: zh
path_key: "/tutors-server/07-websocket.html"
nav_active: docs
permalink: /zh/tutors-server/07-websocket.html
page_title: "WebSocket"
description: "WebSocket：recv 循环、一个聊天室、从其他协程发送，以及用 trySend 应对慢客户端。"
---

# WebSocket

在客服聊天里，双方都要写字。用户提问，客服回答，谁也不等谁：消息一有人写就双向流动。

我们能用已经学过的工具拼出这样一个聊天吗？往下、从服务器到浏览器，SSE 能承载它，从昨天那一章起我们就会做了。那往上呢？往上我们就得为用户的每一行文字单独发一个 POST。新请求、请求头、一个响应、一次断连。每一句"谢谢，有帮助"都如此。它能工作，但工作得不怎么样。

对于双向对话，有一个专门的协议，WebSocket。

它构建得出奇地朴素。客户端发送一个普通的 HTTP 请求，带着一个 `Upgrade` 请求头：一个切换到另一个协议的提议。服务器同意：`101 Switching Protocols`。就这样，HTTP 结束了。在同一个 TCP 连接上，消息现在双向流动，没有请求也没有响应。

```php
use TrueAsync\WebSocket;

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});
```

服务器把握手整个揽在自己身上：处理器是在连接已经切换之后才被调用的，它收到的是一个现成的对象。这个模型很熟悉：一个连接，一个协程。`WebSocket` 实现了 `Iterator`，正是这个迭代器让协程睡去，直到下一条消息到来。客户端离开了，循环结束了，服务器自己用 `1000 Normal` 代码关闭了连接。而普通的 HTTP 处理器在同一个端口上并肩继续工作。

## 一个聊天室

回声只是热身。在真实的聊天里，一个参与者的消息必须到达所有其他人。花一秒钟想想这在技术上意味着什么：服务于一个连接的协程必须写进另一些连接。听起来像是麻烦的源头？看：

```php
use TrueAsync\HttpRequest;

/** @var SplObjectStorage<WebSocket, string> $room */
$room = new SplObjectStorage();

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) use ($room) {
    $name = $req->getQueryParam('name', 'guest');
    $room->attach($ws, $name);
    $ws->send("Welcome, people in the room: {$room->count()}");

    try {
        foreach ($ws as $msg) {
            foreach ($room as $peer) {
                if ($peer !== $ws) {
                    $peer->trySend("$name: {$msg->data}");
                }
            }
        }
    } finally {
        $room->detach($ws);
    }
});
```

三十行，而在这三十行里，第一季的三条线索一下子汇到了一起。别急着略过，每一条都值得停一停。

第一条：聊天室只是一个对象。一个普通的 `SplObjectStorage`，在所有协程间共享，没有一把锁。讲通道的那一章承诺过，在一个线程内部这是允许的，而这里正是它的实战演出。

第二条：`finally`。一个参与者可能优雅地离开，可能随着 Wi-Fi 一起消失，或者协程可能被服务器自己在关停时取消。三种情形，一个 `finally`，保证不会有幽灵在房间里逗留。协作式取消，本来就该如此。

第三条：从任何协程写进别人的连接都是允许的。`send()` 和 `trySend()` 对此是安全的；服务器自己会保证来自不同发送者的帧不会在线路上混在一起。读取则不然，只能从一个协程读。在同一个连接上发起第二个并发的 `recv()` 会得到一个异常，这是应该的：字节流对两个读者没有任何有意义的语义。

## 慢客户端不会拖住聊天室

你注意到广播用的是 `trySend` 而不是 `send` 了吗？这不是笔误，是一个决定，值得说清楚。

`send()` 在缓冲区满时做什么？没错，背压：它让协程睡去，直到客户端清空积压。对于一条私人回复，这正是你想要的。现在把它放进广播循环里想象一下。一个参与者开着他的移动网络进了隧道，他的缓冲区满了，然后……整个房间都在等。一百个人收不到消息，只因为一个人信号差。

`trySend()` 从不等待。要么消息被接收进缓冲区并返回 `true`，要么缓冲区满了返回 `false`，消息被丢弃。这个聊天故意牺牲掉落后者的消息，以免惩罚所有人。残忍？对一个聊天来说不算：房间里丢掉一行文字并不是悲剧。如果你的任务里不允许丢失，那就用 `send()` 并忍受那些暂停，或者为每个客户端建一个队列。两种策略都是诚实的，选择在你。

作为最后的兜底，还有一道保护：如果 `send()` 挂在等待里的时间超过了写超时，它会抛出 `WebSocketBackpressureException`。这针对的是那种保持连接打开却完全不读取的客户端。

## 是谁放他们进聊天的？

现在任何人都能进房间。如果你想在门口检查，就在处理器上声明第三个参数，服务器会把握手对象传进来：

```php
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(
    function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade) use ($room) {
        if (authenticate($req) === null) {
            $upgrade->reject(401, 'auth required');
            return;
        }

        // ... 聊天室 ...
    }
);
```

`reject()` 会用一个普通的 HTTP 错误来回应，而不是切换协议。如果客户端提议了任何子协议，也是通过同一个对象来协商。

聊天做好了：房间在内存里，即时广播，落后者拖不慢任何人。记住它所依赖的那条公式："进程内存中的共享状态"。好好记住它。下一章我们会开启若干个 worker 来占满机器的所有核心，而那条看似无害的公式将第一个爆掉。
