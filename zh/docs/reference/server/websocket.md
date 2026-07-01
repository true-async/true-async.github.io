---
layout: docs
lang: zh
path_key: "/docs/reference/server/websocket.html"
nav_active: docs
permalink: /zh/docs/reference/server/websocket.html
page_title: "TrueAsync\\WebSocket"
description: "TrueAsync\\WebSocket、WebSocketMessage、WebSocketUpgrade、WebSocketCloseCode，以及 WebSocket 异常体系。"
---

# TrueAsync\WebSocket

(PHP 8.6+, true_async_server 0.9+)

基于 RFC 6455 的全双工连接背后的类。带示例的指南：
[WebSocket](/zh/docs/server/websocket.html)。

## TrueAsync\WebSocket

一个 WebSocket 连接。在升级握手完成后由服务器立即创建，作为第一个参数传给通过
[`HttpServer::addWebSocketHandler()`](/zh/docs/reference/server/http-server.html#addwebsockethandler)
注册的处理程序。

```php
namespace TrueAsync;

final class WebSocket implements \Iterator
{
    public function recv(): ?WebSocketMessage;

    public function send(string $text): void;
    public function sendBinary(string $data): void;
    public function trySend(string $text): bool;
    public function trySendBinary(string $data): bool;

    public function ping(string $payload = ''): void;
    public function close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void;

    public function isClosed(): bool;
    public function getSubprotocol(): ?string;
    public function getRemoteAddress(): string;

    // Iterator
    public function current(): ?WebSocketMessage;
    public function key(): int;
    public function next(): void;
    public function rewind(): void;
    public function valid(): bool;
}
```

实例只能由服务器构造；用户代码不能使用 `new WebSocket`。

### 生命周期

连接绑定到处理程序协程。当处理程序因任何原因归还控制权，包括 `recv()` 循环因
`null` 而 `return`，服务器都会以代码 `1000 Normal` 关闭连接。只有在需要非默认代码
或 reason 文本时，才需要在 `return` 之前显式调用 `close()`。

### 并发模型

- `send()`、`sendBinary()` 和 `ping()` 可以安全地从同一线程上的任意协程调用。
  生产者原子地把序列化后的帧入队；一个协作式的 flusher 依次把它们写入 socket，
  因此来自不同调用方的帧永远不会交错。
- `recv()` 是单读者模型：同一连接上第二次并发的 `recv()` 调用会抛出
  `WebSocketConcurrentReadException`，因为连接是单一字节流，多个读者没有明确定义的语义。
- `close()` 是幂等的，可以从任意协程调用。

### recv

```php
public WebSocket::recv(): ?WebSocketMessage
```

接收下一条文本或二进制消息。挂起调用协程，直到一条完整消息到达或连接关闭。

返回一个 [`WebSocketMessage`](#websocketmessage)，或者在客户端干净关闭时返回 `null`：
正常的 CLOSE 代码（`1000`/`1001`/`1005`），或没有 CLOSE 帧的普通断连。典型的循环写法：
`while (($m = $ws->recv()) !== null) { ... }`。

该方法抛出：

- `WebSocketClosedException`：协议错误或显式的错误关闭代码；
  `$closeCode`/`$closeReason` 携带 RFC 6455 的代码和原因。
- `WebSocketConcurrentReadException`：另一个协程已经在这条连接上等待 `recv()`。

### send

```php
public WebSocket::send(string $text): void
```

发送一个文本帧。`$text` **必须**是合法的 UTF-8：非法数据会被提前拒绝，
接收方永远不会看到违反 RFC 6455 §5.6 的帧。

在常见情况下（发送缓冲区未满）会立刻返回控制权。缓冲区填满后，调用协程会挂起，
待客户端读取足够数据腾出空间后恢复。如果挂起的时长超过 `write_timeout_ms`，
该方法会抛出 `WebSocketBackpressureException`，此时处理程序可以选择丢弃消息、
关闭连接，或重试。

如果连接已经关闭，该方法还会抛出 `WebSocketClosedException`。

### sendBinary

```php
public WebSocket::sendBinary(string $data): void
```

发送一个二进制帧。二进制负载没有 UTF-8 限制。backpressure 行为与 `send()` 相同。

### trySend

```php
public WebSocket::trySend(string $text): bool
```

非阻塞发送。当发送缓冲区未满时，将文本帧入队并返回 `true`；缓冲区已满时不入队任何内容，
返回 `false`，由调用方决定丢弃消息、放慢速度，或关闭连接。与 `send()` 不同，
`trySend()` 永远不会挂起调用协程，这使它成为广播循环中的合适工具：一个慢客户端不会
拖慢向其他人的投递。

缓冲区大小由
[`HttpServerConfig::setStreamWriteBufferBytes()`](/zh/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
设置（`0` 表示不限制：`trySend()` 此时总是把帧入队并返回 `true`）。

如果消息被接受进队列，该函数返回 `true`；如果发送缓冲区已满、客户端跟不上，
则返回 `false`。如果连接已经关闭，则抛出 `WebSocketClosedException`。

### trySendBinary

```php
public WebSocket::trySendBinary(string $data): bool
```

非阻塞二进制发送。行为与 `trySend()` 相同。

### ping

```php
public WebSocket::ping(string $payload = ''): void
```

发送一个 PING 帧。按 RFC 6455 §5.5.2，对端必须回复 PONG。应用代码很少需要手动调用它：
配置好时，服务器的 keepalive 定时器（`HttpServerConfig::setWsPingIntervalMs()`）
会自动发送 ping。

`$payload` 最多接受 125 字节（RFC 6455 §5.5）。

### close

```php
public WebSocket::close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void
```

开始关闭握手并拆除连接。幂等：重复调用是空操作。

- `$code` 是一个 `WebSocketCloseCode` 枚举值，或者 `4000..4999` 范围内的原始整数
  （保留给应用自定义代码，RFC 6455 §7.4.2）。
- `$reason` 是 UTF-8 文本，最多 123 字节。

### isClosed

```php
public WebSocket::isClosed(): bool
```

在调用过 `close()` 之后，或者客户端的 CLOSE 帧被处理之后，返回 `true`。

### getSubprotocol

```php
public WebSocket::getSubprotocol(): ?string
```

升级过程中协商出的子协议，如果没有选定则为 `null`。

### getRemoteAddress

```php
public WebSocket::getRemoteAddress(): string
```

对于 TCP 连接，返回 `host:port` 形式（IPv4）或 `[host]:port` 形式（IPv6）的对端地址。
对于经由 Unix socket 的连接，返回空字符串。

### Iterator

```php
public WebSocket::current(): ?WebSocketMessage
public WebSocket::key(): int
public WebSocket::next(): void
public WebSocket::rewind(): void
public WebSocket::valid(): bool
```

让你可以写 `foreach ($ws as $msg)`，而不用手写 `recv()` 循环。每一步循环都会拉取下一条消息；
优雅的关闭只会结束 `foreach`，带错误的关闭会直接从循环里抛出 `WebSocketClosedException`。

## TrueAsync\WebSocketMessage {#websocketmessage}

```php
namespace TrueAsync;

final class WebSocketMessage
{
    public readonly string $data;
    public readonly bool $binary;
}
```

一条完整重组后的消息，由 `WebSocket::recv()` 交付。文本消息已经过 UTF-8 校验，
因此可以直接使用 `$data`，无需再次检查。

- **`$data`** —— 消息负载。对文本消息来说，这是一个合法的 UTF-8 字符串。
- **`$binary`** —— 如果消息是以二进制帧发送的则为 `true`，文本帧则为 `false`。

实例只能由服务器构造。你只能通过 `WebSocket::recv()` 获取它们；没有办法自己构造
`new WebSocketMessage`。

## TrueAsync\WebSocketUpgrade

```php
namespace TrueAsync;

final class WebSocketUpgrade
{
    public function reject(int $status, string $reason = ''): void;
    public function setSubprotocol(string $name): void;
    public function getOfferedSubprotocols(): array;
    public function getOfferedExtensions(): array;
}
```

正在进行中的升级协商的句柄。从处理程序被调用的那一刻起存在，直到调用 `reject()`，
或处理程序成功返回（此时服务器会用 `setSubprotocol()` 选定的子协议发送 `101`）。

仅对以三个参数注册的处理程序可用：

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    // ...
});
```

服务器会检测处理程序声明的参数数量；两参数的处理程序完全跳过这个对象，
升级会以默认设置被接受。

握手一旦完成，对这个对象的任何调用都会抛出异常：`Sec-WebSocket-Protocol` 已经发到
线路上，子协议不能再变了。

### reject

```php
public WebSocketUpgrade::reject(int $status, string $reason = ''): void
```

以给定的 HTTP 状态拒绝升级。`101` 响应永远不会被发送；客户端会收到指定的状态码，
连接随后关闭。调用 `reject()` 之后，处理程序应立即返回：不允许再进行任何 I/O。

- `$status` —— HTTP 状态码（必须是 4xx 或 5xx）。
- `$reason` —— 可选的响应体。

### setSubprotocol

```php
public WebSocketUpgrade::setSubprotocol(string $name): void
```

从客户端提供的列表中选定一个子协议。选定的值会在 `Sec-WebSocket-Protocol` 响应头中
回显。必须在处理程序返回之前、以及 `reject()` 之前调用。服务器不会校验选定的值
是否确实出现在 `getOfferedSubprotocols()` 中；这由处理程序自行负责。

### getOfferedSubprotocols

```php
public WebSocketUpgrade::getOfferedSubprotocols(): array
```

按客户端偏好的顺序，返回客户端在 `Sec-WebSocket-Protocol` 头中发送的子协议
（`string[]`）。如果客户端没有提供任何子协议，则返回空数组。

### getOfferedExtensions

```php
public WebSocketUpgrade::getOfferedExtensions(): array
```

按客户端偏好的顺序，返回 `Sec-WebSocket-Extensions` 头中的扩展（`string[]`）。
permessage-deflate（RFC 7692，消息压缩）由服务器自己通过
`HttpServerConfig::setWsPermessageDeflate()` 协商；其余提供的值仅供参考。
如果客户端没有提供任何扩展，则返回空数组。

## TrueAsync\WebSocketCloseCode

```php
namespace TrueAsync;

enum WebSocketCloseCode: int
{
    case NORMAL                = 1000;
    case GOING_AWAY            = 1001;
    case PROTOCOL_ERROR        = 1002;
    case UNSUPPORTED_DATA      = 1003;
    case NO_STATUS             = 1005;  // RESERVED
    case ABNORMAL_CLOSURE      = 1006;  // RESERVED
    case INVALID_FRAME_PAYLOAD = 1007;
    case POLICY_VIOLATION      = 1008;
    case MESSAGE_TOO_BIG       = 1009;
    case MANDATORY_EXTENSION   = 1010;
    case INTERNAL_SERVER_ERROR = 1011;
    case TLS_HANDSHAKE         = 1015;  // RESERVED
}
```

RFC 6455 §7.4.1 定义的关闭代码注册表。应用自定义代码（`4000..4999`，RFC 6455 §7.4.2）
依然可用：`WebSocket::close()` 除了这个枚举之外，也接受原始 `int`。

## 异常

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // final
              ├── WebSocketBackpressureException    // final
              └── WebSocketConcurrentReadException  // final
```

### TrueAsync\WebSocketException

```php
class WebSocketException extends HttpServerException {}
```

所有 WebSocket 错误的基类。继承项目通用的 `HttpServerException`，因此已有的 catch-all
处理程序不需要改动即可继续工作。

### TrueAsync\WebSocketClosedException

```php
final class WebSocketClosedException extends WebSocketException
{
    public readonly int $closeCode;
    public readonly string $closeReason;
}
```

连接因为客户端发起的正常握手以外的原因被关闭：协议错误，或来自客户端的显式错误代码。
`$closeCode` 携带 RFC 6455 的关闭代码（如果完全没有收到 CLOSE 帧，例如网络中断，
则为 `1006 Abnormal Closure`）。`$closeReason` 携带客户端 CLOSE 帧中的 UTF-8 原因文本，
如果没有给出则为空字符串。

客户端的干净关闭（代码 `1000`）不会抛出异常：这种情况下 `WebSocket::recv()`
只会返回 `null`。

### TrueAsync\WebSocketBackpressureException

```php
final class WebSocketBackpressureException extends WebSocketException {}
```

当发送缓冲区持续满载超过 `write_timeout_ms` 时，由 `send()`/`sendBinary()` 抛出。
这是应用层面的信号：客户端读取得太慢了，可以选择关闭连接，或者丢弃消息继续。

### TrueAsync\WebSocketConcurrentReadException

```php
final class WebSocketConcurrentReadException extends WebSocketException {}
```

程序员错误：在另一个协程已经在同一个 `WebSocket` 上等待 `recv()` 时，
第二个协程又调用了 `recv()`。一条连接同一时间只能从一个地方读取；如果需要把消息
分发给多个处理程序，应该建立一个 `recv()` 循环，自己从里面分发消息。

## 也可参考

- [指南：WebSocket](/zh/docs/server/websocket.html)
- [`HttpServer::addWebSocketHandler()`](/zh/docs/reference/server/http-server.html#addwebsockethandler)
- [`HttpServerConfig`：WebSocket 选项](/zh/docs/reference/server/http-server-config.html#websocket)
- [TrueAsync Server 异常](/zh/docs/reference/server/exceptions.html)
