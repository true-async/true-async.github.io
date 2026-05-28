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
        $res
            ->setStatusCode(200)
            ->setHeader('Content-Type', 'text/event-stream')
            ->setHeader('Cache-Control', 'no-store')
            ->setNoCompression();

        foreach (loadEvents() as $event) {
            $res->send("data: " . json_encode($event) . "\n\n");
        }
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
- [流式传输](/zh/docs/server/streaming.html)
- [压缩](/zh/docs/server/compression.html)
