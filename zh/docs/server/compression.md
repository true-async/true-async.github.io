---
layout: docs
lang: zh
path_key: "/docs/server/compression.html"
nav_active: docs
permalink: /zh/docs/server/compression.html
page_title: "TrueAsync Server：HTTP 压缩"
description: "TrueAsync Server 中的 gzip、Brotli 与 zstd：Accept-Encoding 协商、MIME 过滤、限额、BREACH 防护、入站请求体解压。"
---

# HTTP 压缩

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server 支持三种编解码器：**gzip**、**Brotli (br)** 和 **zstd**，在所有协议下行为一致：
HTTP/1.1、HTTP/2 和 HTTP/3。

## 后端

- **gzip** —— 优先使用 `zlib-ng`（在相同压缩级别下大约 ~2–4× 更快），如果没有则回退到系统 `zlib`。
  代码完全相同，通过 `zng_*` ↔ `*` 的宏层切换。
- **Brotli** —— `libbrotli`。仅当 `--enable-brotli` 检测到库时启用。
- **zstd** —— `libzstd`。仅当 `--enable-zstd` 检测到库时启用。

具体编译进了哪些可以在运行时查询：

```php
TrueAsync\HttpServerConfig::getSupportedEncodings();
// → ["zstd", "br", "gzip", "identity"]
```

结果一定包含 `"identity"`；`"gzip"` 在 `--enable-http-compression` 成功时出现；
`"br"`/`"zstd"` 在 configure 阶段检测到对应库时出现。

## 服务端偏好

服务端的优先级顺序：**`zstd > gzip > brotli > identity`**。

> **为什么 gzip 排在 brotli 前面？** Brotli 编码器无法复用状态
> （`libbrotli` 没有公开的 reset API）。在 arena 分配器实现之前（TODO Step 4），
> gzip 的 `deflateReset` 在默认场景下更优。通过 q-values 明确偏好 brotli 的客户端
> （`br;q=1.0, gzip;q=0.5`）仍然会拿到 brotli。

## 协商（RFC 9110 §12.5.3）

服务器解析客户端的 `Accept-Encoding`：q-values、`identity;q=0`、`*;q=0`。
如果**没有**该头部，响应不会被压缩（仅 identity）。这与 nginx 行为一致，
也比严格按 RFC 解读更安全。

**跳过**压缩的条件：

- 状态码 `1xx`、`204`、`304`
- 方法是 `HEAD`
- 带 `Range` 的响应
- 处理程序已自行设置了 `Content-Encoding`
- MIME 不在白名单内
- 响应体小于阈值

## 配置

```php
use TrueAsync\HttpServerConfig;

$config
    ->setCompressionEnabled(true)              // 总开关（默认：true）
    ->setCompressionLevel(6)                   // gzip 1..9，默认 6
    ->setBrotliLevel(4)                        // 0..11，默认 4
    ->setZstdLevel(3)                          // 1..22，默认 3
    ->setCompressionMinSize(1024)              // 不压缩 < 1 KiB 的响应体
    ->setCompressionMimeTypes([
        'application/javascript',
        'application/json',
        'application/xml',
        'image/svg+xml',
        'text/css',
        'text/html',
        'text/javascript',
        'text/plain',
        'text/xml',
    ])
    ->setRequestMaxDecompressedSize(10 * 1024 * 1024);  // 防 zip-bomb 上限
```

### 压缩级别

| 编解码器 | 范围 | 默认 | 备注 |
|----------|-----:|-----:|------|
| gzip | 1..9 | 6 | 经典 zlib 语义 |
| brotli | 0..11 | 4 | quality 11 ≈ 比 quality 4 慢 50×，收益却很有限 |
| zstd | 1..22 | 3 | zstd 项目自家默认：压缩比好且比 gzip-6 更快 |

### MIME 白名单

`setCompressionMimeTypes()` 会**完全替换**列表（nginx `gzip_types` 语义）。
条目在 setter 阶段被规范化：参数（`; charset=...`）被截掉、空格被 trim、统一转小写。
运行时比较保持精确且 zero-allocation。

### 防 zip-bomb

`setRequestMaxDecompressedSize($bytes)` 限制入站请求体**解压后**的尺寸。
默认 10 MiB。超过时返回 413。`0` 关闭限制，但必须显式设置：没有"隐式无限"的入口。

## 单响应 opt-out

`HttpResponse::setNoCompression()` 会覆盖一切（Accept-Encoding、MIME、大小）。适用于：

- 把机密和反射的用户输入混在一起的端点（**BREACH 防护**）
- 已经带有 `Content-Encoding` 的 payload（处理程序自己设置过的）
- 任何不希望被服务器再次包装的响应

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/account') {
        // 同时包含 CSRF token + 反射的搜索关键词，对 BREACH 敏感
        $res->setNoCompression();
    }
    $res->json($payload);
});
```

方法是幂等的。

## 流式

当处理程序调用 `HttpResponse::send($chunk)` 时，如果协商允许，压缩 wrapper 会在第一次调用时透明启用，
并保持**每个源 chunk 对应一个下游 chunk**，这样在 chunked H1 和 H2 DATA 帧上都保持高效的帧划分。

## 入站解压

请求上的 `Content-Encoding: gzip` / `br` / `zstd`（以及历史遗留的 `x-gzip`）会被透明解压。
`identity` 表示不处理。未知的 coding → 413/415（见下表）。

| 情况 | 状态码 |
|------|------:|
| 未知 coding | 415 |
| 超出 anti-bomb 上限 | 413 |
| inflate 出错 | 400 |

在处理程序里，已解压的请求体通过
[`HttpRequest::getBody()`](/zh/docs/reference/server/http-request.html#getbody) 拿到。

## 一次性 brotli

从 0.6.3 起，对于已知大小的响应体，服务器使用 `BrotliEncoderCompress()`
（通过 `BROTLI_PARAM_SIZE_HINT` 提供大小提示）：编码器会按正确的尺寸分配 ring-buffer 和哈希表，
而不是按任意长度准备的流式模式。流式路径仍然用于 chunked / 长度未知的响应。

## 基准测试

C 侧的默认值是面向生产的（gzip 6、brotli 4）。作者跑 bench 时使用
`setCompressionLevel(1)` / `setBrotliLevel(1)` 以与 Swoole 的 `BrotliEncoderCompress` 路径保持可比性。

## 也可参考

- [`HttpServerConfig::setCompressionEnabled()`](/zh/docs/reference/server/http-server-config.html#setcompressionenabled)
- [`HttpResponse::setNoCompression()`](/zh/docs/reference/server/http-response.html#setnocompression)
- [静态文件](/zh/docs/server/static-files.html)：预压缩 sidecar（`.br`、`.gz`、`.zst`）
