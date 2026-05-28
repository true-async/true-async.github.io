---
layout: docs
lang: zh
path_key: "/docs/server/static-files.html"
nav_active: docs
permalink: /zh/docs/server/static-files.html
page_title: "TrueAsync Server：静态文件与 sendFile"
description: "StaticHandler：内置静态资源服务，不走 PHP 处理程序。sendFile()：从处理程序里直接发送文件。预压缩 sidecar、ETag、Range、安全策略。"
---

# 静态文件与 sendFile

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server 提供两套独立的文件传输机制：

1. **`StaticHandler`** —— 一个独立的前缀挂载，**全部在 C 内实现**，不会派生协程，也不进入 PHP VM。
2. **`HttpResponse::sendFile()`** —— 由处理程序驱动。PHP 代码先做决定（鉴权、ACL、文件名生成），
   服务器再从磁盘读取并发送。

两者共用同一套引擎内 FSM（MIME、ETag、IMF-date、Range、conditional GET、预压缩 sidecar）。

## StaticHandler

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\StaticHandler;

$server = new HttpServer(
    (new HttpServerConfig())->addListener('0.0.0.0', 8080)
);

$static = (new StaticHandler('/static/', '/var/www/public'))
    ->setIndexFiles('index.html')
    ->enablePrecompressed('br', 'gzip')
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setEtagEnabled(true);

$server->addStaticHandler($static);

$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(200)->setBody('dynamic route');
});

$server->start();
```

对 `/static/...` 的请求由 `StaticHandler` 接管（不会调用任何 PHP 处理程序）。
其余请求走普通的 `addHttpHandler`。

多个挂载按**注册顺序**匹配。一旦 attach，`StaticHandler` 会被锁定；之后调用 setter 会抛
`HttpServerRuntimeException`。

### Index 与 fallthrough

```php
$static
    ->setIndexFiles('index.html', 'index.htm')   // 对目录 URL 返回什么
    ->disableIndex()                              // 或者干脆不做 index 查找
    ->setOnMissing(StaticOnMissing::NEXT);        // → 移交给 PHP 处理程序
```

**`StaticOnMissing`** 决定在 root 内找不到文件时的行为：

| 值 | 行为 |
|----|------|
| `NOT_FOUND`（默认） | 在 C 里返回 404，请求不进入 PHP VM |
| `NEXT` | 控制权转给调度器，派生普通的处理程序协程 |

> 对目录 URL 但没有 trailing slash、且所有 index 文件都 404 的请求会返回 404。
> 这个 handler **不**会像 nginx/Apache 那样发 301 redirect。如果部署依赖在目录路径上的 catch-all，
> 请关闭 index 查找：`setIndexFiles([])` / `disableIndex()`。

### 预压缩 sidecar

```php
$static->enablePrecompressed('br', 'gzip', 'zstd');
```

当客户端发来 `Accept-Encoding: br, gzip` 时，handler 会查找 `main.css` 旁边的 `main.css.br`，
直接发送该 sidecar，省下编码 CPU。可用名称：`"br"`、`"gzip"`、`"zstd"`。
未知名称会在 setter 阶段抛出 `InvalidArgumentException`。

### 安全策略

```php
use TrueAsync\StaticDotfiles;
use TrueAsync\StaticSymlinks;

$static
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setSymlinkPolicy(StaticSymlinks::REJECT)
    ->hide('*.bak', '*.tmp', 'private/**');
```

**`StaticDotfiles`**：

| | 行为 |
|---|---|
| `DENY`（默认） | 路径中任何以 `.` 开头的 segment（包含 `..`）一律 404 |
| `ALLOW` | dotfile 像普通文件一样提供 |
| `IGNORE` | 当作文件不存在（按 `StaticOnMissing` 落入 passthrough） |

**`StaticSymlinks`**：

| | 行为 |
|---|---|
| `REJECT`（默认） | 路径上出现 symlink 一律 404。使用 `O_NOFOLLOW` + 逐 segment 的 `lstat`，symlink 永远不被 traverse |
| `FOLLOW` | 跟随 symlink；`realpath()` 之后的 target 仍必须落在 root 内 |
| `OWNER_MATCH` | 仅当 symlink 与 target 属于同一个 uid 时才跟随 |

`hide($glob, ...)` 配置 glob 规则，匹配的文件无论是否存在都返回 404。比较**相对于 root**，
分隔符为 `/`。

### 缓存 / 头部

```php
$static
    ->setEtagEnabled(true)                                   // W/"…"，由 (mtime_ns, size, ino) 生成
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

**Open-file cache**（nginx 风格）：缓存最近 N 个请求的 resolved path、fstat 元数据、MIME、ETag、
Last-Modified。在 `ttlSeconds` 内的重复请求直接命中缓存，跳过 realpath/stat/MIME-walk。

默认关闭。在 cold dentry、大 docroot、网络 FS 下有收益；本地磁盘 warm dentry 时 syscall 本就在 µs 量级，
HashTable 查找开销会吃掉收益。

### MIME override

```php
$static->setMimeType('webmanifest', 'application/manifest+json');
```

扩展名不带前导点，小写。

### 性能

自 0.4.0 起引擎做了：

- **内联 `open(2)`/`fstat(2)`**（issue #13）：不再走 libuv thread pool 的 futex 来回。
  收益：H1 tiny 256B 19k → 35k req/s，H1 304 If-None-Match 24k → 123k req/s。
- **小文件快速路径**（≤ 64 KiB）：把文件 slurp 到 `zend_string`，一次
  `writev(headers + body)` 全部发出。收益：H1 tiny → 103k req/s（×2.9），H2 tiny → 154k（×4.4）。
- 大于 64 KiB 的文件走 sendfile。

## 在 handler 里 sendFile

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, $res) {
    $userId = (int) $req->getQueryParam('id');
    if (!isAuthorized($userId)) {
        $res->setStatusCode(403); return;
    }

    $res->sendFile('/var/storage/reports/2026-Q1.pdf', new SendFileOptions(
        contentType:   'application/pdf',
        disposition:   SendFileDisposition::ATTACHMENT,
        downloadName:  'Q1-report.pdf',
        cacheControl:  'private, no-store',
        acceptRanges:  true,
        conditional:   true,
        precompressed: false,
    ));
});
```

`sendFile()` 会把 path + options **记录**到 response 上，**立刻返回**。实际传输在 dispose 阶段
通过和 `StaticHandler` 一样的 FSM 完成。sendFile 不走压缩中间件（它有自己的传输流水线）。

`sendFile()` 之后 response 被**封口**：`setHeader` / `setStatus*` / `write` / `send` / `setBody` /
`json` / `html` / `redirect` / `end` 以及再次 `sendFile()` 都会抛 `HttpServerRuntimeException`。

路径被视为**受信任**：访问决策是 handler 做的。open/fstat 错误（`ENOENT`、`EACCES`、超尺寸、
非常规文件）返回 500，因为响应头尚未发出。

### SendFileOptions

`final readonly class`，构造函数使用具名参数：

| 字段 | 类型 | 默认 | 作用 |
|------|------|------|------|
| `contentType` | `?string` | `null` | 覆盖 MIME；`null` 表示按扩展名自动 |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` 或 `ATTACHMENT` |
| `downloadName` | `?string` | `null` | `Content-Disposition: attachment; filename=...` 的文件名 |
| `cacheControl` | `?string` | `null` | 直接放进 `Cache-Control` |
| `etag` | `bool` | `true` | 是否输出 weak ETag |
| `lastModified` | `bool` | `true` | 是否输出 `Last-Modified` |
| `acceptRanges` | `bool` | `true` | 是否支持 `Range:` |
| `precompressed` | `bool` | `true` | 是否查找 `.br`/`.gz`/`.zst` sidecar |
| `conditional` | `bool` | `true` | If-Modified-Since / If-None-Match → 304 |
| `deleteAfterSend` | `bool` | `false` | 成功发送后 unlink 文件（适用于一次性下载） |
| `status` | `?int` | `null` | 覆盖 HTTP 状态码（例如 CDN respond 用 200） |

> `sendFile()` 的 HTTP/3 路径仍在开发：H3 上 dispose 钩子会返回 500。

## 也可参考

- [`TrueAsync\StaticHandler`](/zh/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/zh/docs/reference/server/send-file-options.html)
- [`HttpResponse::sendFile()`](/zh/docs/reference/server/http-response.html#sendfile)
- [压缩](/zh/docs/server/compression.html)
