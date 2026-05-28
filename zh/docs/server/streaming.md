---
layout: docs
lang: zh
path_key: "/docs/server/streaming.html"
nav_active: docs
permalink: /zh/docs/server/streaming.html
page_title: "TrueAsync Server：请求与响应流式传输"
description: "readBody()：分块读取请求体。send()/sendable()：分块发送响应，配合反向压力。HTTP/2 trailers。"
---

# 请求与响应流式传输

(PHP 8.6+, true_async_server 0.6+)

## 分块读取请求体：`readBody()`

默认情况下，处理程序拿到的是已经完整读取的请求体（`HttpRequest::getBody()`）。
启用 `HttpServerConfig::setBodyStreamingEnabled(true)` 后，H1/H2 解析器会把 DATA 块按 FIFO
放入与请求绑定的队列，处理程序通过 `HttpRequest::readBody()` 一块一块地取。

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setBodyStreamingEnabled(true)
);

$server->addHttpHandler(function ($req, $res) {
    $fp = fopen('/tmp/upload-' . bin2hex(random_bytes(8)), 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($fp, $chunk);
        $total += strlen($chunk);
    }
    fclose($fp);

    $res->json(['received' => $total]);
});

$server->start();
```

### 语义

- 每次 `readBody()` 返回**一个**由解析器交付的块：
  - H2 的一个 DATA 帧（默认最多 16 KiB）；
  - llhttp `on_body` 给的一段（受 H1 读缓冲限制 = 8 KiB）。
- 队列为空时，协程会挂起在请求的触发事件上。
- 流到达末尾时返回 `null`（幂等）。
- 流出错时（peer reset、超过 `max_body_size`）抛出 `\Exception`。
- 参数 `$maxLen` 目前为后续的块合并预留，暂时被忽略。签名保持与未来完善（issue #26）的二进制兼容。

### 何时启用

- 大文件上传（日志、媒体、备份）。
- 流式解析（NDJSON、MessagePack stream）。
- 把请求体留在内存里会拖累尾部延迟（p99）的服务。
- 无论 `setBodyStreamingEnabled()` 是否开启，multipart **总是**走流式。

什么时候**不要**启用：请求体很小、用 `getBody()`/`getPost()`/`getQuery()` 一次性处理更方便的 REST 端点。
不支持"按条件混合"模式（仅当请求体 > X 时才流）；流式模式下调用 `getBody()` 会抛
`LogicException`（路线图中规划中）。

### 内存占用

50 个并发 20 MiB POST（h2load，WSL2）的对照：峰值 RSS 从 1170 MiB 降到 **197 MiB**（6 倍）。
吞吐从 36 req/s 提升到 **100 req/s**（×2.7），因为处理程序的派发不再等整个请求体。

## 分块发送响应：`send()` / `sendable()`

通过 `setBody()` / `json()` / `html()` / `redirect()` 的简单响应是一次性发出的。

要做流式发送（H1 的 chunked 编码、H2 的 DATA 帧），使用 `send($chunk)`：

```php
$server->addHttpHandler(function ($req, $res) {
    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setNoCompression();   // SSE：事件需要立即送达客户端

    // 第一次 send() 会提交状态行 + 响应头（此后不可修改）
    foreach (generateEvents() as $event) {
        $res->send("data: " . json_encode($event) . "\n\n");
    }
});
```

### 反向压力（backpressure）

`send()` **只**在出现反向压力时挂起处理程序协程：即流的中间缓冲区已写满。
正常情况下函数立即返回。

HTTP/2：当环形缓冲槽位写满**或**超过 `HttpServerConfig::setStreamWriteBufferBytes()`
（默认 256 KiB）时触发压力。HTTP/1 chunked 使用内核的发送缓冲。

### `sendable()`

一个建议性的非阻塞探测：如果 `send()` 能不挂起地接受一块，就返回 `true`。
返回 `false` 表示三种情况之一：`send()` 会挂起、响应已关闭或被 `sendFile()` 封口、
或者这种响应类型本来就不支持流式。

```php
foreach ($events as $event) {
    if (!$res->sendable()) {
        // 不想等慢客户端 —— 去做别的事
        $event->save();   // 写到数据库里
        continue;
    }
    $res->send($event->encode());
}
```

无论 `sendable()` 返回什么，调用 `send()` **始终**是安全的。`sendable()` 只是给处理程序一个机会，
能在等慢客户端时去干点别的活。

## HTTP/2 trailers

HTTP/2 支持在响应体之后再发一个 HEADERS 帧（trailers）。典型消费者是 gRPC
（在 trailer 中携带 `grpc-status`）。

```php
$res->setStatusCode(200);
$res->send($body);
$res->setTrailer('grpc-status', '0');
$res->setTrailer('grpc-message', 'OK');
```

批量设置：

```php
$res->setTrailers(['grpc-status' => '0', 'grpc-message' => 'OK']);
$res->resetTrailers();   // 清掉全部
$res->getTrailers();
```

在 HTTP/1.1 上调用会**被静默忽略**：在 chunked 编码里发送 trailer 尚未实现（Step 5b）。

> Trailer 名一律小写（RFC 9113 §8.2.2）；大写会被自动转换。

## 也可参考

- [`HttpServerConfig::setBodyStreamingEnabled()`](/zh/docs/reference/server/http-server-config.html#setbodystreamingenabled)
- [`HttpServerConfig::setStreamWriteBufferBytes()`](/zh/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
- [`HttpRequest::readBody()`](/zh/docs/reference/server/http-request.html#readbody)
- [`HttpResponse::send()`](/zh/docs/reference/server/http-response.html#send)
- [`HttpResponse::sendable()`](/zh/docs/reference/server/http-response.html#sendable)
- [`HttpResponse::setTrailer()`](/zh/docs/reference/server/http-response.html#settrailer)
