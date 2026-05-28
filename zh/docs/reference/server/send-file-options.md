---
layout: docs
lang: zh
path_key: "/docs/reference/server/send-file-options.html"
nav_active: docs
permalink: /zh/docs/reference/server/send-file-options.html
page_title: "TrueAsync\\SendFileOptions"
description: "TrueAsync\\SendFileOptions —— HttpResponse::sendFile() 的配置 value-object。Disposition、downloadName、ETag、Range、预压缩 sidecar、deleteAfterSend。"
---

# TrueAsync\SendFileOptions

(PHP 8.6+, true_async_server 0.4+)

[`HttpResponse::sendFile()`](/zh/docs/reference/server/http-response.html#sendfile) 的配置 value-object。
不可变（`final readonly class`），通过构造函数的具名参数创建。

```php
namespace TrueAsync;

final readonly class SendFileOptions
{
    public function __construct(
        public ?string             $contentType     = null,
        public SendFileDisposition $disposition     = SendFileDisposition::INLINE,
        public ?string             $downloadName    = null,
        public ?string             $cacheControl    = null,
        public bool                $etag            = true,
        public bool                $lastModified    = true,
        public bool                $acceptRanges    = true,
        public bool                $precompressed   = true,
        public bool                $conditional     = true,
        public bool                $deleteAfterSend = false,
        public ?int                $status          = null,
    ) {}
}
```

## 字段

| 字段 | 类型 | 默认 | 作用 |
|------|------|------|------|
| `contentType` | `?string` | `null` | 覆盖 MIME。`null` 时按扩展名自动判断。 |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` —— 在浏览器中展示；`ATTACHMENT` —— 下载。影响 `Content-Disposition`。 |
| `downloadName` | `?string` | `null` | `Content-Disposition: attachment; filename=...` 的文件名。配合 `ATTACHMENT` 使用。 |
| `cacheControl` | `?string` | `null` | 直接放入 `Cache-Control`。`null` 表示不发该头部。 |
| `etag` | `bool` | `true` | 是否发送由 `(mtime_ns, size, ino)` 生成的 weak `ETag`。 |
| `lastModified` | `bool` | `true` | 是否发送 `Last-Modified`（IMF-fixdate）。 |
| `acceptRanges` | `bool` | `true` | 是否支持 `Range:`（HTTP/1.1 partial content）。 |
| `precompressed` | `bool` | `true` | 当 `Accept-Encoding` 兼容时是否查找 sidecar（`*.br`、`*.gz`、`*.zst`）。 |
| `conditional` | `bool` | `true` | `If-Modified-Since` / `If-None-Match` → 304。 |
| `deleteAfterSend` | `bool` | `false` | 成功发送后 `unlink($path)`。适合 temp-file 的一次性下载。 |
| `status` | `?int` | `null` | 覆盖 HTTP 状态。例如默认本应 304 时，强制返回 200。 |

## SendFileDisposition

```php
namespace TrueAsync;

enum SendFileDisposition: string
{
    case INLINE     = 'inline';
    case ATTACHMENT = 'attachment';
}
```

## 示例

### Inline PDF

```php
use TrueAsync\SendFileOptions;

$res->sendFile('/var/storage/q1-report.pdf', new SendFileOptions(
    contentType:  'application/pdf',
    cacheControl: 'private, max-age=300',
));
```

### 带用户文件名的下载

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$res->sendFile('/var/storage/abc123.bin', new SendFileOptions(
    disposition:  SendFileDisposition::ATTACHMENT,
    downloadName: 'Q1 Report 2026.pdf',
    contentType:  'application/pdf',
));
```

### 一次性 temp-file

```php
$tmp = '/tmp/export-' . bin2hex(random_bytes(8)) . '.csv';
generateExport($tmp);

$res->sendFile($tmp, new SendFileOptions(
    disposition:     SendFileDisposition::ATTACHMENT,
    downloadName:    'export.csv',
    contentType:     'text/csv; charset=utf-8',
    deleteAfterSend: true,
));
```

### 关闭 conditional GET（始终 200）

```php
$res->sendFile('/var/storage/live.mp4', new SendFileOptions(
    conditional:   false,
    acceptRanges:  true,
    cacheControl:  'no-store',
));
```

### 不使用预压缩 sidecar（让引擎现编码）

```php
$res->sendFile('/var/storage/big.json', new SendFileOptions(
    precompressed: false,
));
```

## 也可参考

- [`HttpResponse::sendFile()`](/zh/docs/reference/server/http-response.html#sendfile)
- [`TrueAsync\StaticHandler`](/zh/docs/reference/server/static-handler.html)
- [静态文件与 sendFile](/zh/docs/server/static-files.html)
