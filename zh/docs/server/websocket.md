---
layout: docs
lang: zh
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /zh/docs/server/websocket.html
page_title: "TrueAsync Server：WebSocket"
description: "addWebSocketHandler()：基于 RFC 6455 的全双工连接，backpressure、keepalive、子协议协商、permessage-deflate。"
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

$server->start();
```

每个连接由自己的协程处理，与 HTTP 相同的 per-request 模型。

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
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // 客户端读取得不够快
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

详见 [配置：WebSocket](/zh/docs/server/configuration.html#websocket)。

## 也可参考

- [`TrueAsync\WebSocket` 及相关类](/zh/docs/reference/server/websocket.html)：完整参考
- [`HttpServer::addWebSocketHandler()`](/zh/docs/reference/server/http-server.html#addwebsockethandler)
- [配置：WebSocket](/zh/docs/server/configuration.html#websocket)
