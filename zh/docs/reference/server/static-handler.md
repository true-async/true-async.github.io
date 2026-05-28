---
layout: docs
lang: zh
path_key: "/docs/reference/server/static-handler.html"
nav_active: docs
permalink: /zh/docs/reference/server/static-handler.html
page_title: "TrueAsync\\StaticHandler"
description: "TrueAsync\\StaticHandler —— 前缀挂载的静态资源服务，不走 PHP 处理程序。预压缩 sidecar、ETag、Range、dotfile/symlink 策略、open-file cache。"
---

# TrueAsync\StaticHandler

(PHP 8.6+, true_async_server 0.6+)

内置静态文件 handler（issue #13）。每个实例 = 一个前缀挂载。
通过 [`HttpServer::addStaticHandler()`](/zh/docs/reference/server/http-server.html#addstatichandler)
attach 到服务器。

完全在 C 内：请求不派生协程也不进 PHP VM —— 文件直接通过 libuv 异步 fs 操作进入 response stream。

```php
namespace TrueAsync;

final class StaticHandler
{
    public function __construct(string $urlPrefix, string $rootDirectory);

    // index / fallthrough
    public function setIndexFiles(string ...$files): static;
    public function disableIndex(): static;
    public function setOnMissing(StaticOnMissing $mode): static;

    // 预压缩 sidecar
    public function enablePrecompressed(string ...$encodings): static;
    public function disablePrecompressed(): static;

    // 安全
    public function setDotfilePolicy(StaticDotfiles $policy): static;
    public function setSymlinkPolicy(StaticSymlinks $policy): static;
    public function hide(string ...$globs): static;

    // 缓存 / 头部
    public function setEtagEnabled(bool $enabled): static;
    public function setCacheControl(string $value): static;
    public function setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static;
    public function disableOpenFileCache(): static;
    public function setHeader(string $name, string $value): static;

    // 目录列表
    public function setBrowseEnabled(bool $enabled): static;

    // MIME
    public function setMimeType(string $extension, string $contentType): static;

    // 自省
    public function getUrlPrefix(): string;
    public function getRootDirectory(): string;
    public function isLocked(): bool;
}
```

## 构造函数

### __construct

```php
public StaticHandler::__construct(string $urlPrefix, string $rootDirectory)
```

| 参数 | 要求 |
|------|------|
| `$urlPrefix` | URL 前缀。必须以 `/` 开始和结束。例：`"/static/"`。 |
| `$rootDirectory` | 磁盘上目录的绝对路径；attach 时会被 canonicalize。 |

## Index / fallthrough

### setIndexFiles

```php
public StaticHandler::setIndexFiles(string ...$files): static
```

请求目录 URL 时尝试返回的文件名。默认 `["index.html"]`。空列表关闭 index 查找。

### disableIndex

```php
public StaticHandler::disableIndex(): static
```

`setIndexFiles()` 的等价形式。

### setOnMissing

```php
public StaticHandler::setOnMissing(StaticOnMissing $mode): static
```

当请求路径无法解析为 root 内的普通文件时怎么做：

| 值 | 行为 |
|----|------|
| `StaticOnMissing::NOT_FOUND`（默认） | 在 C 里返回 404，请求不进 PHP VM |
| `StaticOnMissing::NEXT` | 控制权回到 dispatcher，派生普通的 handler 协程 —— 请求进入 [`addHttpHandler()`](/zh/docs/reference/server/http-server.html#addhttphandler) |

## 预压缩 sidecar

### enablePrecompressed

```php
public StaticHandler::enablePrecompressed(string ...$encodings): static
```

当客户端通过 `Accept-Encoding` 允许时，发送预压缩 sidecar
（`main.css.br`、`main.css.gz`、`main.css.zst`）。参数为 content-coding 名：`"br"`、`"gzip"`、`"zstd"`。
未知名称在 setter 阶段抛 `InvalidArgumentException`。

### disablePrecompressed

```php
public StaticHandler::disablePrecompressed(): static
```

## 安全

### setDotfilePolicy

```php
public StaticHandler::setDotfilePolicy(StaticDotfiles $policy): static
```

"Dotfile" 指任何以 `.` 开头的路径段，包括 `..`（traversal guard 始终拒绝 `..`，与策略无关）。

| | 行为 |
|---|---|
| `StaticDotfiles::DENY`（默认） | 路径中包含 dotfile 一律 404 |
| `StaticDotfiles::ALLOW` | 像普通文件一样提供 dotfile |
| `StaticDotfiles::IGNORE` | 当作文件不存在（按 `StaticOnMissing` passthrough） |

### setSymlinkPolicy

```php
public StaticHandler::setSymlinkPolicy(StaticSymlinks $policy): static
```

| | 行为 |
|---|---|
| `StaticSymlinks::REJECT`（默认） | 路径上有 symlink 一律 404。`O_NOFOLLOW` + 逐 segment `lstat` —— symlink 永不被 traverse |
| `StaticSymlinks::FOLLOW` | 跟随 symlink；`realpath()` 之后 target 仍必须落在 root 内 |
| `StaticSymlinks::OWNER_MATCH` | 仅当 symlink 与 target 属同一 uid 时跟随 |

### hide

```php
public StaticHandler::hide(string ...$globs): static
```

glob 规则：匹配的路径无论是否存在都返回 404。比较**相对于 root**，分隔符 `/`。

## 缓存 / 头部

### setEtagEnabled

```php
public StaticHandler::setEtagEnabled(bool $enabled): static
```

开关 weak ETag（默认 `true`）。打开时每个 200 都带 `ETag: W/"…"`，由 `(mtime_ns, size, ino)` 生成；
`If-None-Match` / `If-Modified-Since` 给 304。

### setCacheControl

```php
public StaticHandler::setCacheControl(string $value): static
```

字面量 `Cache-Control`。空字符串抑制该头。

### setOpenFileCache

```php
public StaticHandler::setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static
```

nginx 风格 open-file cache：缓存最近 N 个请求的 resolved path、fstat 元数据、MIME、ETag、Last-Modified。
在 `ttlSeconds` 内的重复请求命中缓存，跳过 realpath/stat/MIME-walk。

默认关闭。cold dentry、大 docroot、网络 FS 时有收益；本地磁盘 warm dentry 时 syscall 本就 µs 级，
HashTable 查找开销会吃掉收益。

`$maxEntries == 0` 关闭。

### disableOpenFileCache

```php
public StaticHandler::disableOpenFileCache(): static
```

`setOpenFileCache(0)` 的语法糖。

### setHeader

```php
public StaticHandler::setHeader(string $name, string $value): static
```

固定头部，attach 时一次性计算。每个 200 和 304 上都会发送（按 RFC 9110 §15.4.5，`Content-*` 除外）。

## 目录列表

### setBrowseEnabled

```php
public StaticHandler::setBrowseEnabled(bool $enabled): static
```

请求目录且无 index 时是否输出 HTML 列表。默认 `false`。

> 为 PR #6 预留 —— 当前是 no-op，setter 接收但无效果。

## MIME

### setMimeType

```php
public StaticHandler::setMimeType(string $extension, string $contentType): static
```

对指定扩展名的文件覆盖 `Content-Type`。扩展名小写、不含前导点。

## 自省

### getUrlPrefix / getRootDirectory

```php
public StaticHandler::getUrlPrefix(): string
public StaticHandler::getRootDirectory(): string
```

### isLocked

```php
public StaticHandler::isLocked(): bool
```

通过 `addStaticHandler()` attach 到服务器之后为 `true`。锁定后 setter 全部抛 runtime exception。

## Enums

参见独立页：

- [`StaticOnMissing`](/zh/docs/reference/server/static-on-missing.html)
- [`StaticDotfiles`](/zh/docs/reference/server/static-dotfiles.html)
- [`StaticSymlinks`](/zh/docs/reference/server/static-symlinks.html)

（三者都是 `TrueAsync` namespace 下的 `enum: int`。）

## 示例

```php
use TrueAsync\StaticHandler;
use TrueAsync\StaticOnMissing;
use TrueAsync\StaticDotfiles;

$static = (new StaticHandler('/static/', '/var/www/public'))
    ->setIndexFiles('index.html', 'index.htm')
    ->enablePrecompressed('br', 'gzip')
    ->setOnMissing(StaticOnMissing::NEXT)
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setEtagEnabled(true)
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60)
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->hide('*.bak', '*.tmp', 'private/**');

$server->addStaticHandler($static);
```

## 也可参考

- [静态文件与 sendFile](/zh/docs/server/static-files.html)
- [`HttpServer::addStaticHandler()`](/zh/docs/reference/server/http-server.html#addstatichandler)
- [`HttpResponse::sendFile()`](/zh/docs/reference/server/http-response.html#sendfile)
