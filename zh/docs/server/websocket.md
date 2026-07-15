---
layout: docs
lang: zh
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /zh/docs/server/websocket.html
page_title: "TrueAsync Server：WebSocket"
description: "addWebSocketHandler()：基于 RFC 6455 的全双工连接，跨 worker 的 pub/sub topic、backpressure、keepalive、子协议协商、permessage-deflate。"
---

# WebSocket

(PHP 8.6+, true_async_server 0.9+)

`HttpServer::addWebSocketHandler()` 注册一个基于 RFC 6455 的全双工连接处理程序。

一个连接以普通 HTTP 请求开始，然后客户端要求服务器在同一条 TCP 连接上切换到另一种协议：
这就是 Upgrade。服务器回复状态码 `101 Switching Protocols`，从那一刻起，同一条连接
承载的就是 WebSocket，而不再是 HTTP。支持：

- 从 HTTP/1.1 升级（经典的 `Connection: Upgrade` 头）。
- 从 HTTP/2 升级（RFC 8441 Extended CONNECT）。
- `wss://`（基于 TLS 的 WebSocket）。
- permessage-deflate（RFC 7692），消息级压缩。
- [Pub/sub topic](#topics-publishsubscribe-across-every-worker)，能抵达进程内每一个 worker，
  因此一个聊天室既不需要单 worker 服务器，也不需要外部 broker。

> 该实现已通过 Autobahn|Testsuite 一致性测试套件的验证，`behavior` 分类下全部 246 项
> 测试均通过。

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\WebSocket;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
);

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});

// 必需：没有 HTTP 处理程序服务器就拒绝启动，同时它也用来回应那些不是 upgrade 的请求。
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(404)->end();
});

$server->start();
```

注册处理程序本身就打开了 WebSocket —— 没有单独的开关要拨，就像 HTTP/2 和 `addHttp2Handler()` 一样。

> `HttpServerConfig::enableWebSocket()` 是一个遗留开关，并不是那个开关。给它传 `true`
> 会抛出 `HttpServerRuntimeException`，并指引你使用 `addWebSocketHandler()` —— 请改为注册处理程序。

每个连接由自己的协程处理，与 HTTP 相同的 per-request 模型。
处理程序抛异常不会把 worker 一起拖垮：异常会被记录，peer 会在协议内被告知 —— 如果抛在
upgrade 之前就是一个 HTTP 状态码，会话一旦建立起来则是 `CLOSE 1011`。

处理程序总是以三个参数调用，PHP 会丢掉你没有声明的那些 —— 因此
`function (WebSocket $ws)`、`function (WebSocket $ws, HttpRequest $req)` 以及三参数形式
都合法。只声明你用得到的。

## 生命周期

连接会一直保持打开，直到处理程序协程返回。如果处理程序自然结束（例如
`recv()`/`foreach` 循环最后得到了 `null`），服务器会自动以代码 `1000 Normal` 关闭连接。
只有当你想用不同的代码或自定义的 reason 文本时，才需要在 `return` 之前显式调用 `close()`。

## 接收消息：`recv()` 与 `foreach`

```php
public WebSocket::recv(): ?WebSocketMessage
```

挂起协程，直到下一条消息到达或连接关闭。返回一个
[`WebSocketMessage`](/zh/docs/reference/server/websocket.html#websocketmessage)，
或者在客户端干净地关闭连接时（正常关闭代码，或没有显式 CLOSE 帧的断连）返回 `null`：

```php
while (($msg = $ws->recv()) !== null) {
    handle($msg->data, $msg->binary);
}
```

`WebSocket` 实现了 `\Iterator`，所以同样的循环可以更简洁地写成
`foreach ($ws as $msg) { ... }`。干净的关闭只会结束 `foreach`；带错误的关闭会直接从循环里
抛出 `WebSocketClosedException`。

只从一个地方读取消息：如果在同一条连接上从两个协程并行调用 `recv()`，第二次调用会抛出
`WebSocketConcurrentReadException`。如果你需要把消息分发给多个处理程序，保留一个
`recv()` 循环，自己从里面做分发。

## 发送消息：`send()`、`trySend()`

`send()` 和 `sendBinary()` 可以安全地从任意协程调用，包括同时从多个协程调用：服务器保证
不同调用的数据不会在线路上混在一起。

```php
$ws->send('text frame');       // 文本必须是合法的 UTF-8
$ws->sendBinary($binaryData);  // 二进制数据没有编码限制
```

通常这些函数会立刻返回。如果客户端读取得很慢，发送缓冲区被填满，协程会挂起，
待客户端消耗掉一部分缓冲区后恢复。如果等待时间超过 `write_timeout_ms`，会抛出
`WebSocketBackpressureException`，由处理程序决定接下来怎么做：丢弃消息、关闭连接，或重试。

对于要向多个客户端广播、又不希望一个慢客户端拖慢其他人的场景，有非阻塞的变体：

```php
if (!$ws->trySend($text)) {
    // 这个客户端的缓冲区满了，消息没有被发送，该客户端已经落后
}
```

`trySend()`/`trySendBinary()` 从不挂起协程：消息被接受时立刻返回 `true`，
缓冲区已满时返回 `false`（此时消息根本没有被发送）。缓冲区大小由
[`HttpServerConfig::setStreamWriteBufferBytes()`](/zh/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
设置（`0` 表示不限制：`trySend()` 总是发送成功并返回 `true`）。

## Topic：跨每一个 worker 的 publish/subscribe {#topics-publishsubscribe-across-every-worker}

一个 worker 是一个拥有自己 PHP 上下文的线程。所以搭建聊天室的那种显而易见的做法 ——
保存一个连接数组然后遍历它 —— 永远只能抵达*一个* worker 的 peer，这正是这样的聊天室
以前不得不跑在 `setWorkers(1)` 上的原因。

Topic 解决了这个问题。它们活在服务器里，而不是你的处理程序里：每个 worker 为它拥有的连接
建索引，一次 `publish()` 会被交给每一个 worker，再由它投递给自己的 socket。不需要 Redis，
不需要消息 broker，也不需要单 worker 服务器。

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = ltrim($req->getPath(), '/') ?: 'lobby';

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", $msg->data);   // 抵达所有 worker 上的订阅者
    }
});
```

topic 是在**调用点用名字**寻址的。没有 topic 对象要获取、持有或传进处理程序。

### 过滤器遵循 MQTT

层级用 `/` 分隔，`+` 恰好匹配一层，末尾的 `#` 匹配其余部分：

| 过滤器 | 接收 |
|--------|------|
| `chat/general` | 恰好是这个 topic |
| `chat/+/typing` | `chat/general/typing`、`chat/random/typing` —— 一层，任意取值 |
| `user/42/#` | `user/42`、`user/42/presence`、`user/42/dm/7` —— 整个子树 |

通配符属于*订阅*。**publish 的 topic 必须是具体的**：fan-out 到一个模式的消息没有明确的
目的地，所以 `publish('chat/+/typing', …)` 会抛 `WebSocketException`。过滤器最多可以有 128 层深。

### API

```php
$ws->subscribe('chat/+/typing');            // 幂等
$ws->unsubscribe('chat/+/typing');          // 幂等
$ws->getTopics();                           // string[] —— 该连接的过滤器

$ws->publish('chat/general', $text);        // 文本，发往每一个 worker
$ws->publishBinary('chat/general', $bytes); // 二进制对应版本

$ws->subscriberCount('chat/general');       // 跨所有 worker，含通配符
```

`publish()` **从不挂起**。一个出站队列已积压的 peer 会丢弃该消息，而不是拖住对 topic 里其余
peer 的投递 —— 与 `trySend()` 相同的语义。当你需要投递保证时，请改为对那一个连接 `send()`。
被自己多个过滤器同时匹配到的订阅者仍然只会收到恰好一份。

`$excludeSelf` 默认为 `true` —— 正是聊天室想要的"除发送者外的所有人"这种情况：

```php
$ws->publish('chat/general', $msg->data);                      // 发送者不会收到回传
$ws->publish('chat/general', $msg->data, excludeSelf: false);  // 发送者也会收到
```

返回值是**仅在调用 worker 上**被服务的订阅者数量。对其他 worker 的投递是异步的，无法在调用点
计数，所以这是一个本地数字，而不是全进程的。`subscriberCount()` 才是全进程的那个 —— 但由于
每个 worker 用自己的计数来回答、然后把答案相加，它是一个快照而非实时计数器，并且一个没有及时
回答的 worker 会被漏掉。

一个正在关闭的连接会自己退订一切。

### 限额

两者都默认关闭，这正是每个自托管 broker 的出厂设置（EMQX `max_subscriptions` / `messages_rate`，
NATS `max_subs`）：只有应用自己知道它需要多少个 topic。

```php
$config
    ->setWsMaxSubscriptions(32)          // 一个连接可以持有多少个不同的过滤器
    ->setWsPublishRateLimit(50, burst: 100);
```

只要客户端输入会流进 `subscribe()` —— 比如 `$ws->subscribe($msg->data)` —— 就设上
`setWsMaxSubscriptions()`，这样一个 peer 才不能无止境地撑大 worker 的 topic 树。超过上限时，
`subscribe()` 抛 `WebSocketException`，连接保持不断。

`setWsPublishRateLimit()` 是一个 per-connection 的 token bucket。`publish()` 是唯一一个
非特权 peer 能变成对进程内*每个* worker 都产生工作的 WebSocket 调用 —— `send()` 和 `trySend()`
只会碰它自己的 socket。不加计量的话，一个循环转发消息的客户端会填满每个 worker 的 inbox，
而随之而来的丢弃还会连累*其他* topic 的流量。超过速率时，`publish()` 抛
`WebSocketBackpressureException`，连接保持不断：发送者会被告知，而不是让消息消失进一个没人
看得见的满 mailbox 里。

`$burst` 是以消息数计的桶深 —— 一个处理程序可以领先持续速率多远。`0` 表示一秒钟的量。

```php
try {
    $ws->publish("chat/$room", $msg->data);
} catch (WebSocketBackpressureException) {
    $ws->send('you are sending too fast');
} catch (WebSocketException $e) {
    $ws->send('bad topic: ' . $e->getMessage());
}
```

### 代价几何

每个 worker 用一个 topic 前缀的 counting Bloom filter 概括它的订阅，publisher 会跳过那些
可证明不持有任何订阅者的 worker，而不是把它们全部唤醒。一次 publish 到进程内无人监听的 topic
花费零次跨 worker 唤醒。`HttpServer::getRuntimeStats()` 报告结果 —— `ws_topic_posted`、
`ws_topic_skipped`（过滤器发挥了作用）和 `ws_topic_dropped`（某个 worker 的 mailbox 满了：
这一项是数据丢失）。

Topic 在每一种 WebSocket 传输上都能用，不只是明文 HTTP/1 —— 在 TLS 上、在 HTTP/2 Extended
CONNECT 上，也在 permessage-deflate 下，此时一次 `publish()` 会并排服务一个压缩 peer 和一个
明文 peer，各自用它协商好的 framing。

## 客户端地址

```php
$ws->getRemoteAddress();   // "203.0.113.7" 或 "2001:db8::1" —— 裸 IP，没有端口
$ws->getRemotePort();      // 54321
```

`getRemoteAddress()` 返回**裸 IP**：没有端口，IPv6 字面量外面也没有方括号 —— 和
`$_SERVER['REMOTE_ADDR']` 一样的形状，因此可以直接喂给
`filter_var(…, FILTER_VALIDATE_IP)`、一个 ACL 或一个 rate limiter。在 Unix-socket listener
上两者都返回 `null`，因为它没有 IP peer。

这是 TCP 连接的 peer。它**不是**从 `X-Forwarded-For` 推导出来的 —— 在代理后面，请自己解析
那个头，并且只在你信任设置它的那个代理时才这么做。

> **破坏性变更。** `getRemoteAddress()` 过去返回 `"host:port"`（没有 IP peer 时返回 `""`）。
> 它现在返回裸 IP，以及 `null`。端口请用 `getRemotePort()`。

## 关闭连接：`close()`、`isClosed()`

```php
$ws->close(WebSocketCloseCode::NORMAL, 'bye');
```

开始关闭连接。可以安全地多次调用：之后的调用都是空操作。关闭代码是一个
[`WebSocketCloseCode`](/zh/docs/reference/server/websocket.html#websocketclosecode)
枚举值，或者 `4000..4999` 范围内的整数（保留给应用自定义代码）。`$reason` 接受 UTF-8
文本，最多 123 字节。

`close()` 调用之后，或者客户端发出自己的关闭信号之后，`isClosed()` 返回 `true`。

## Ping 与 keepalive

```php
$ws->ping('optional payload');   // 最多 125 字节，RFC 6455 §5.5
```

应用代码很少需要手动调用它：服务器的 keepalive 定时器
（`HttpServerConfig::setWsPingIntervalMs()`）会自动发送 PING。如果客户端没有及时回复
（`setWsPongTimeoutMs()`），服务器会自行关闭连接。详见
[配置](/zh/docs/server/configuration.html#websocket)。

## 子协议协商与拒绝：`WebSocketUpgrade`

默认情况下处理程序只接收 `WebSocket $ws`。要自行决定是否接受连接以及选用哪个子协议，
用三个参数注册处理程序：服务器会检测参数数量，在这种情况下传入第三个对象
`WebSocketUpgrade`：

```php
use TrueAsync\WebSocket;
use TrueAsync\HttpRequest;
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    $offered = $u->getOfferedSubprotocols();   // 来自 Sec-WebSocket-Protocol 头

    if (!in_array('chat.v2', $offered, true)) {
        $u->reject(400, 'unsupported subprotocol');
        return;
    }

    $u->setSubprotocol('chat.v2');   // 必须在 return 或 reject() 之前调用

    foreach ($ws as $msg) {
        // ...
    }
});
```

`WebSocketUpgrade` 的生命周期从处理程序被调用开始，到 `reject()` 或成功 `return`
为止（此时服务器会用选定的子协议完成握手）。之后再对这个对象做任何调用都会抛出异常：
响应已经发到线路上，子协议不能再变了。

`getOfferedExtensions()` 返回客户端提供的扩展列表。permessage-deflate（RFC 7692，
消息压缩）由服务器自己通过 `HttpServerConfig::setWsPermessageDeflate()` 协商；
其余提供的值仅供参考。

## 关闭代码与异常

`WebSocketCloseCode` 是一个包含标准 RFC 6455 关闭代码的枚举（`NORMAL`、`GOING_AWAY`、
`PROTOCOL_ERROR`、`MESSAGE_TOO_BIG` 等）。异常体系：

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException            // 也包括：非法 topic 过滤器、订阅数上限
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // 慢读取端 —— 或 publish() 超过其速率限制
              └── WebSocketConcurrentReadException  // 第二个并行的 recv()
```

客户端的干净关闭会表现为 `recv()` 返回 `null`，而不是异常。只有在协议错误或带显式
错误代码的关闭时才会抛出异常；`$closeCode`/`$closeReason` 携带具体原因。详见
[参考文档](/zh/docs/reference/server/websocket.html)。

## 配置

| 方法 | 默认值 | 作用 |
|------|--------|------|
| `setWsMaxMessageSize($bytes)` | 1 MiB | 重组后消息的最大大小，超出会得到 `1009` |
| `setWsMaxFrameSize($bytes)` | 1 MiB | 单个帧的最大大小，防止大量微小分片的洪泛 |
| `setWsPingIntervalMs($ms)` | 30000 | 服务器 ping 空闲连接的频率，`0` 表示禁用 |
| `setWsPongTimeoutMs($ms)` | 60000 | 关闭连接前等待 PONG 的时长（`1001`） |
| `setWsPermessageDeflate($bool)` | `false` | RFC 7692，因 CPU 开销而默认关闭，需主动开启 |
| `setWsMaxSubscriptions($count)` | `0`（不限制） | 一个连接可持有的不同 topic 过滤器数量 |
| `setWsPublishRateLimit($perSecond, $burst)` | `0`（关闭） | 针对 `publish()` 的 per-connection token bucket |

详见 [配置：WebSocket](/zh/docs/server/configuration.html#websocket)。

## 也可参考

- [`TrueAsync\WebSocket` 及相关类](/zh/docs/reference/server/websocket.html)：完整参考
- [`HttpServer::addWebSocketHandler()`](/zh/docs/reference/server/http-server.html#addwebsockethandler)
- [配置：WebSocket](/zh/docs/server/configuration.html#websocket)
