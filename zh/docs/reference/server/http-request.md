---
layout: docs
lang: zh
path_key: "/docs/reference/server/http-request.html"
nav_active: docs
permalink: /zh/docs/reference/server/http-request.html
page_title: "TrueAsync\\HttpRequest"
description: "TrueAsync\\HttpRequest —— 只读的 HTTP 请求表示：方法、URI、头部、请求体、query、multipart、W3C Trace Context、流式请求体。"
---

# TrueAsync\HttpRequest

(PHP 8.6+, true_async_server 0.6+)

作为处理程序第一个参数传入的只读对象。由服务器构造，不应由用户实例化。

```php
namespace TrueAsync;

final class HttpRequest
{
    // --- 通用 ---
    public function getMethod(): string;
    public function getUri(): string;
    public function getPath(): string;
    public function getHttpVersion(): string;
    public function isKeepAlive(): bool;

    // --- query ---
    public function getQuery(): array;
    public function getQueryParam(string $name, mixed $default = null): mixed;

    // --- headers ---
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function getContentType(): ?string;
    public function getContentLength(): ?int;

    // --- body ---
    public function getBody(): string;
    public function hasBody(): bool;
    public function awaitBody(): static;
    public function readBody(int $maxLen = 65536): ?string;

    // --- multipart / form ---
    public function getPost(): array;
    public function getFiles(): array;
    public function getFile(string $name): ?UploadedFile;

    // --- W3C Trace Context ---
    public function getTraceParent(): ?string;
    public function getTraceState(): ?string;
    public function getTraceId(): ?string;
    public function getSpanId(): ?string;
    public function getTraceFlags(): ?int;
}
```

## 通用

### getMethod

```php
public HttpRequest::getMethod(): string
```

`"GET"`、`"POST"`、`"PUT"`、`"DELETE"` 等。

### getUri

```php
public HttpRequest::getUri(): string
```

完整请求 URI —— path + query string。

### getPath

```php
public HttpRequest::getPath(): string
```

不含 query string 的路径。例如 `/search?q=hello` 给出 `/search`。HTTP/1.1、HTTP/2（`:path` 伪头部）和 HTTP/3
行为一致。与 `getQuery()` 共享一次惰性解析 —— URI 在首次访问时被拆成 path/query 并缓存到 request struct。

### getHttpVersion

```php
public HttpRequest::getHttpVersion(): string
```

`"1.1"`、`"2"`、`"3"`。

### isKeepAlive

```php
public HttpRequest::isKeepAlive(): bool
```

## Query

### getQuery

```php
public HttpRequest::getQuery(): array
```

所有 query 参数构成的关联数组 —— 相当于 `$_GET`。支持百分号解码、`+` 作空格、PHP 数组记法
（`foo[]`、`foo[bar]`）。解析委托给 `php_default_treat_data(PARSE_STRING, ...)` —— 与填充 `$_GET` 的是同一个函数。

### getQueryParam

```php
public HttpRequest::getQueryParam(string $name, mixed $default = null): mixed
```

按名取一个参数；缺失时返回 `$default`（默认 `null`）。

## 头部

### hasHeader

```php
public HttpRequest::hasHeader(string $name): bool
```

大小写不敏感。

### getHeader

```php
public HttpRequest::getHeader(string $name): ?string
```

单值，大小写不敏感。不存在则 `null`。

### getHeaderLine

```php
public HttpRequest::getHeaderLine(string $name): string
```

所有值用逗号连接。不存在则空字符串。

### getHeaders

```php
public HttpRequest::getHeaders(): array
```

所有头部。名字为 **lowercase**。

### getContentType

```php
public HttpRequest::getContentType(): ?string
```

`Content-Type` 的值，或 `null`。

### getContentLength

```php
public HttpRequest::getContentLength(): ?int
```

`Content-Length`，缺失或非法则 `null`。

## 请求体

### getBody

```php
public HttpRequest::getBody(): string
```

请求体。没有 body 时返回空字符串。

> 在 streaming-body 模式下（`HttpServerConfig::setBodyStreamingEnabled(true)`），
> `getBody()` 会抛出 —— 改用 `readBody()`。

### hasBody

```php
public HttpRequest::hasBody(): bool
```

### awaitBody

```php
public HttpRequest::awaitBody(): static
```

等待请求体接收完整。从 Phase 6 Step 3+ 起，处理程序可能**在 parsed-headers 之后立即**被调用，
还没收到 body。`awaitBody()` 将协程挂起直到 message-complete。

如果 body 已经全部进入缓冲（当前默认行为），会立刻返回，不挂起。

### readBody

```php
public HttpRequest::readBody(int $maxLen = 65536): ?string
```

pull-based 的流式请求体（issue #26）。每次返回**一个**由解析器交付的 chunk：

- H2 DATA 帧（约 16 KiB）；
- llhttp `on_body` slice（受 H1 读缓冲限制 = 8 KiB）。

行为：

- 队列为空 → 协程挂起到 per-request trigger event。
- EOF → `null`（幂等）。
- 流错（peer reset、超过 `max_body_size`） → `\Exception`。
- `$maxLen` 为后续 coalesce 优化预留，目前忽略。签名保持与未来完善的二进制兼容。

**仅当** `HttpServerConfig::setBodyStreamingEnabled(true)` 时可用。

参见 [流式传输](/zh/docs/server/streaming.html)。

## Multipart / form

### getPost

```php
public HttpRequest::getPost(): array
```

`multipart/form-data` 或 `application/x-www-form-urlencoded` 的 POST 数据。支持 PHP 风格数组：
`name[]`、`user[name]`、`matrix[0][1]`。

### getFiles

```php
public HttpRequest::getFiles(): array
```

所有上传文件。同名多文件：`['photos' => [UploadedFile, UploadedFile, ...]]`。

### getFile

```php
public HttpRequest::getFile(string $name): ?UploadedFile
```

按名取一个文件。对 `photos[]`，返回数组的第一个。缺失返回 `null`。

参见 [`UploadedFile`](/zh/docs/reference/server/uploaded-file.html)。

## W3C Trace Context

需要 `HttpServerConfig::setTelemetryEnabled(true)`。

### getTraceParent

```php
public HttpRequest::getTraceParent(): ?string
```

原始 `traceparent`，按收到的样子。缺失 / 格式非法 / telemetry 关闭时返回 `null`。

### getTraceState

```php
public HttpRequest::getTraceState(): ?string
```

原始 `tracestate`。缺失 / telemetry 关闭时返回 `null`。

### getTraceId

```php
public HttpRequest::getTraceId(): ?string
```

解码后的 32 位 lower-hex trace-id，或 `null`。

### getSpanId

```php
public HttpRequest::getSpanId(): ?string
```

解码后的 16 位 lower-hex parent span-id，或 `null`。

### getTraceFlags

```php
public HttpRequest::getTraceFlags(): ?int
```

解码后的 8 位 flags 字节（例如 `0x01` 表示 sampled），或 `null`。

## 示例

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    error_log(sprintf(
        "[%s] %s %s (HTTP/%s, body=%s, traceid=%s)",
        $req->getMethod(),
        $req->getPath(),
        $req->getQuery() ? json_encode($req->getQuery()) : '-',
        $req->getHttpVersion(),
        $req->getContentLength() ?? 'n/a',
        $req->getTraceId() ?? '-'
    ));

    if ($req->getMethod() === 'POST' && $req->getContentType() === 'application/json') {
        $body = json_decode($req->getBody(), true);
        // ...
    }

    $res->json(['ok' => true]);
});
```

## 也可参考

- [`TrueAsync\HttpResponse`](/zh/docs/reference/server/http-response.html)
- [`TrueAsync\UploadedFile`](/zh/docs/reference/server/uploaded-file.html)
- [流式传输](/zh/docs/server/streaming.html)
