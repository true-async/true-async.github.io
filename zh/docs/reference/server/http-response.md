---
layout: docs
lang: zh
path_key: "/docs/reference/server/http-response.html"
nav_active: docs
permalink: /zh/docs/reference/server/http-response.html
page_title: "TrueAsync\\HttpResponse"
description: "TrueAsync\\HttpResponse —— 状态、头部、响应体、通过 send()/sendable() 流式传输、HTTP/2 trailers、sendFile()、json()、html()、redirect()。"
---

# TrueAsync\HttpResponse

(PHP 8.6+, true_async_server 0.6+)

带 fluent 接口的响应对象。作为处理程序第二个参数传入。由服务器构造，不应由用户实例化。

```php
namespace TrueAsync;

final class HttpResponse
{
    // status
    public function setStatusCode(int $code): static;
    public function getStatusCode(): int;
    public function setReasonPhrase(string $phrase): static;
    public function getReasonPhrase(): string;

    // headers
    public function setHeader(string $name, string|array $value): static;
    public function addHeader(string $name, string|array $value): static;
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function resetHeaders(): static;

    // trailers (HTTP/2)
    public function setTrailer(string $name, string $value): static;
    public function setTrailers(array $trailers): static;
    public function resetTrailers(): static;
    public function getTrailers(): array;

    // 协议自省
    public function getProtocolName(): string;
    public function getProtocolVersion(): string;

    // body
    public function write(string $data): static;
    public function send(string $chunk): static;
    public function sendable(): bool;
    public function setNoCompression(): static;
    public function getBody(): string;
    public function setBody(string $body): static;
    public function getBodyStream(): mixed;       // TODO
    public function setBodyStream(mixed $stream): static;  // TODO

    // helpers
    public function json(array|string|object|null|int|float|bool $data, int $status = 200, int $flags = 0): static;
    public function html(string $html): static;
    public function redirect(string $url, int $status = 302): static;

    // 发送 / 状态
    public function end(?string $data = null): void;
    public function sendFile(string $path, ?SendFileOptions $options = null): void;

    // Server-Sent Events (text/event-stream)
    public function sseStart(): static;
    public function sseEvent(?string $data = null, ?string $event = null, ?string $id = null, ?int $retry = null): static;
    public function sseComment(string $text = ""): static;
    public function sseRetry(int $milliseconds): static;

    public function isHeadersSent(): bool;
    public function isClosed(): bool;
}
```

## 状态

### setStatusCode

```php
public HttpResponse::setStatusCode(int $code): static
```

HTTP 状态码 100..599。

### getStatusCode

```php
public HttpResponse::getStatusCode(): int
```

### setReasonPhrase / getReasonPhrase

```php
public HttpResponse::setReasonPhrase(string $phrase): static
public HttpResponse::getReasonPhrase(): string
```

`"OK"`、`"Not Found"` 等。

## 头部

### setHeader

```php
public HttpResponse::setHeader(string $name, string|array $value): static
```

设置头部，替换之前的值。

### addHeader

```php
public HttpResponse::addHeader(string $name, string|array $value): static
```

在已有值上追加（如 `Set-Cookie`）。

### hasHeader / getHeader / getHeaderLine / getHeaders

```php
public HttpResponse::hasHeader(string $name): bool
public HttpResponse::getHeader(string $name): ?string
public HttpResponse::getHeaderLine(string $name): string
public HttpResponse::getHeaders(): array
```

读 handler 已设置的头部，大小写不敏感。

### resetHeaders

```php
public HttpResponse::resetHeaders(): static
```

清掉所有头部。

## Trailers（HTTP/2）

响应体之后发送的 HEADERS 帧。典型消费者是 gRPC（`grpc-status`）。
**HTTP/1.1 上调用会被静默忽略** —— chunked 编码的 trailer 不在 Step 5b 范围内。

### setTrailer

```php
public HttpResponse::setTrailer(string $name, string $value): static
```

名字一律小写（RFC 9113 §8.2.2）；大写会自动转换。

### setTrailers

```php
public HttpResponse::setTrailers(array $trailers): static
```

批量设置。已存在的 trailer 会保留 —— 想从零开始，先 `resetTrailers()`。

### resetTrailers

```php
public HttpResponse::resetTrailers(): static
```

### getTrailers

```php
public HttpResponse::getTrailers(): array
```

## 协议

### getProtocolName / getProtocolVersion

```php
public HttpResponse::getProtocolName(): string     // 始终 "HTTP"
public HttpResponse::getProtocolVersion(): string  // "1.1"、"2"、"3"
```

## 响应体

### write

```php
public HttpResponse::write(string $data): static
```

追加到内部 body 缓冲。在 `end()` 时或处理程序返回时自动发送。

### send

```php
public HttpResponse::send(string $chunk): static
```

向客户端发送一个 chunk（流式）。

- **第一次** `send()` 会提交状态码 + 头部，之后无法修改。
- 后续调用追加 DATA 帧（HTTP/2）或 chunked segment（HTTP/1）。
- 仅在 backpressure 时挂起处理程序协程（per-stream staging buffer 已满）。
  backpressure 阈值默认 256 KiB，可由 `setStreamWriteBufferBytes()` 调整。
- 正常情况下立即返回。

### sendable

```php
public HttpResponse::sendable(): bool
```

建议性的非阻塞探测：

- `true` —— `send()` 能不挂起协程地接收 chunk。
- `false` —— `send()` 会因 backpressure 阻塞，或者响应已被 `sendFile()` 封口 / 已关闭，
  又或者本就不是支持流式的响应类型。

无论 `sendable()` 返回什么，调用 `send()` **始终**安全 —— `sendable()` 只是给 handler 一个机会，
能在等慢对端时去做别的事。

### setNoCompression

```php
public HttpResponse::setNoCompression(): static
```

禁止该响应的压缩 —— 覆盖 Accept-Encoding、MIME 白名单和尺寸阈值。
适用于：BREACH 敏感的端点（机密 + 反射用户输入）、已自行设置 `Content-Encoding` 的 payload、
任何不希望被服务器再次包装的响应。幂等。

### getBody / setBody

```php
public HttpResponse::getBody(): string
public HttpResponse::setBody(string $body): static
```

读写当前缓冲的内容。

## Helpers

### json

```php
public HttpResponse::json(
    array|string|object|null|int|float|bool $data,
    int $status = 200,
    int $flags  = 0
): static
```

通过 `php_json_encode_ex` 做 JSON 序列化（与 `json_encode()` 走同一路径）：

- `array` / `object` / scalar 的 `$data` → 编码后输出。
- `string` 的 `$data` → **原样发送**（缓存 JSON、预构建字节）。跳过二次编码。

`Content-Type: application/json` **仅当** handler 没自行设置时才加 —— 想用别的 media type，
就 `setHeader('Content-Type', 'application/problem+json')->json($payload)`。

`$flags` —— `JSON_*` 位掩码。`0` 表示用服务器默认值
[`HttpServerConfig::setJsonEncodeFlags()`](/zh/docs/reference/server/http-server-config.html#setjsonencodeflags-getjsonencodeflags)
（开箱即用是 `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`）。

`JSON_THROW_ON_ERROR` 会被静默剥除：编码失败会返回 `500` JSON 错误体，异常不会被抛出。
handler 永远不需要把 `json()` 包到 try/catch 里。

### html

```php
public HttpResponse::html(string $html): static
```

设置 `Content-Type: text/html`。

### redirect

```php
public HttpResponse::redirect(string $url, int $status = 302): static
```

## 发送

### end

```php
public HttpResponse::end(?string $data = null): void
```

结束响应并发送给客户端。`end()` 之后不能再写任何内容。

### sendFile

```php
public HttpResponse::sendFile(string $path, ?SendFileOptions $options = null): void
```

由 handler 驱动的文件发送。把 path + options **记录**到 response 上并**立刻返回** ——
实际传输在 dispose 阶段进行，使用与 `StaticHandler` 相同的 FSM（MIME、ETag、IMF-date、Range、
conditional GET、预压缩 sidecar）。

**`sendFile()` 之后 response 被封口**：`setHeader` / `setStatus*` / `write` / `send` / `setBody` /
`json` / `html` / `redirect` / `end` / 再次 `sendFile()` 都会抛 `HttpServerRuntimeException`。

路径是**受信任**的（访问控制由 handler 做的）。open/fstat 错误（`ENOENT`、`EACCES`、超尺寸、
非常规文件）返回 500，因为响应头还没出去。

`sendFile` 不走压缩中间件（有自己的传输流水线）。

> `sendFile()` 的 HTTP/3 路径仍在开发；目前 H3 上 dispose 钩子直接返回 500。

参见 [`SendFileOptions`](/zh/docs/reference/server/send-file-options.html)。

## Server-Sent Events（text/event-stream）

(true_async_server 0.8+)。带示例的指南：[SSE](/zh/docs/server/sse.html)。

### sseStart

```php
public HttpResponse::sseStart(): static
```

将响应切换到 SSE 模式并锁定头部：`Content-Type: text/event-stream`、
`Cache-Control: no-cache, no-transform`、`X-Accel-Buffering: no`，并将响应标记为不可压缩。
响应会以第一次 `send()` 同样的方式进入流式模式：状态码和头部被提交、不能再变，
但事件负载本身还没有发到线路上。

这次调用是可选的：第一次 `sseEvent()`/`sseComment()` 也会自行启动流。`sseStart()`
本身**不会**刷新状态行和头部：提交是惰性的，发生在第一次
`sseEvent()`/`sseComment()`/`sseRetry()` 调用时（如果一次都没调用过，
响应结束时会刷出一个空的 `200 text/event-stream`）。要立刻打开流，例如在真正的事件
就绪之前先解除浏览器 `onopen` 的阻塞，可以先发送一个初始的 `sseComment()`。

如果处理程序已经设置了非 `text/event-stream` 的 `Content-Type`，会抛出
`HttpServerInvalidArgumentException`；如果响应已经在流式传输、已关闭，
或正忙于 `sendFile()`，则抛出 `HttpServerRuntimeException`。

### sseEvent

```php
public HttpResponse::sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null
): static
```

格式化并发送一个 SSE 事件，如有需要会启动流。多行的 `$data` 会按
`\n`/`\r\n`/`\r` 拆分，并作为多个 `data:` 字段发送（WHATWG §9.2）。`$event`、`$id`
和 `$retry` 仅在非 `null` 时才会包含在记录中。记录以空行结束，这样浏览器会立刻
派发该事件。

`$event` 和 `$id` 不能包含 `\r`/`\n`（否则解析器会把它们当成字段/记录分隔符），
`$id` 也不能包含 NUL：违反会抛出 `HttpServerInvalidArgumentException`。`$retry`
必须是非负数。

`$data === ""` 也是合法值，会派发一个空的 `MessageEvent`。四个参数全部设为 `null`
是空操作；`EventSource` 解析器会跳过既没有 `data` 也没有 `retry` 的事件。

### sseComment

```php
public HttpResponse::sseComment(string $text = ""): static
```

发送一行注释（以 `:` 开头的记录）。浏览器会忽略注释，但它们能让连接在中间代理的
空闲超时（nginx 的 `proxy_read_timeout`，默认 60 秒）之下保持存活。标准的负载是
空字符串（线路上是 `:\n\n`）。`$text` 不能包含 `\r`/`\n`。如果流还没运行，会启动它。

### sseRetry

```php
public HttpResponse::sseRetry(int $milliseconds): static
```

发送一个裸的 `retry:` 指令，告诉浏览器在流断开后要等多少毫秒才重连。相当于不带负载、
只调用 `sseEvent(retry: $milliseconds)` 的语法糖。如果流还没运行，会启动它。

## 状态

### isHeadersSent

```php
public HttpResponse::isHeadersSent(): bool
```

### isClosed

```php
public HttpResponse::isClosed(): bool
```

## 示例

```php
use TrueAsync\HttpResponse;
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, HttpResponse $res) {
    // SSE
    if ($req->getPath() === '/events') {
        foreach (loadEvents() as $event) {
            $res->sseEvent(json_encode($event));
        }
        $res->end();
        return;
    }

    // sendFile
    if ($req->getPath() === '/report.pdf') {
        $res->sendFile('/var/reports/q1.pdf', new SendFileOptions(
            disposition:  SendFileDisposition::ATTACHMENT,
            downloadName: 'Q1-Report.pdf',
        ));
        return;
    }

    // JSON
    $res->json(['ok' => true]);
});
```

## 也可参考

- [`TrueAsync\HttpRequest`](/zh/docs/reference/server/http-request.html)
- [`TrueAsync\SendFileOptions`](/zh/docs/reference/server/send-file-options.html)
- [SSE](/zh/docs/server/sse.html)
- [流式传输](/zh/docs/server/streaming.html)
- [压缩](/zh/docs/server/compression.html)
