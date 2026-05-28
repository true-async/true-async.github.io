---
layout: docs
lang: en
path_key: "/docs/reference/server/send-file-options.html"
nav_active: docs
permalink: /en/docs/reference/server/send-file-options.html
page_title: "TrueAsync\\SendFileOptions"
description: "TrueAsync\\SendFileOptions — value object with HttpResponse::sendFile() settings. Disposition, downloadName, ETag, Range, precompressed sidecars, deleteAfterSend."
---

# TrueAsync\SendFileOptions

(PHP 8.6+, true_async_server 0.4+)

Value object with settings for
[`HttpResponse::sendFile()`](/en/docs/reference/server/http-response.html#sendfile).
Immutable (`final readonly class`), created via named arguments in the constructor.

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

## Fields

| Field | Type | Default | What it does |
|-------|------|---------|--------------|
| `contentType` | `?string` | `null` | Override MIME. `null` — derived automatically from the extension. |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` — display in the browser; `ATTACHMENT` — download. Affects `Content-Disposition`. |
| `downloadName` | `?string` | `null` | File name for `Content-Disposition: attachment; filename=...`. Meaningful with `ATTACHMENT`. |
| `cacheControl` | `?string` | `null` | Literally placed into `Cache-Control`. `null` — no header. |
| `etag` | `bool` | `true` | Emit weak `ETag` from `(mtime_ns, size, ino)`. |
| `lastModified` | `bool` | `true` | Emit `Last-Modified` (IMF-fixdate). |
| `acceptRanges` | `bool` | `true` | Support `Range:` (HTTP/1.1 partial content). |
| `precompressed` | `bool` | `true` | Look for sidecars (`*.br`, `*.gz`, `*.zst`) when `Accept-Encoding` permits. |
| `conditional` | `bool` | `true` | `If-Modified-Since` / `If-None-Match` → 304. |
| `deleteAfterSend` | `bool` | `false` | `unlink($path)` after a successful send. Useful for one-shot downloads from temp files. |
| `status` | `?int` | `null` | Override the HTTP status. Example: 200 on a specific staged response, even when the default would be 304. |

## SendFileDisposition

```php
namespace TrueAsync;

enum SendFileDisposition: string
{
    case INLINE     = 'inline';
    case ATTACHMENT = 'attachment';
}
```

## Examples

### Inline PDF

```php
use TrueAsync\SendFileOptions;

$res->sendFile('/var/storage/q1-report.pdf', new SendFileOptions(
    contentType:  'application/pdf',
    cacheControl: 'private, max-age=300',
));
```

### Download with a user-friendly name

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$res->sendFile('/var/storage/abc123.bin', new SendFileOptions(
    disposition:  SendFileDisposition::ATTACHMENT,
    downloadName: 'Q1 Report 2026.pdf',
    contentType:  'application/pdf',
));
```

### One-shot temp file

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

### Without conditional GET (always 200)

```php
$res->sendFile('/var/storage/live.mp4', new SendFileOptions(
    conditional:   false,
    acceptRanges:  true,
    cacheControl:  'no-store',
));
```

### Without precompressed sidecars (compress on the fly in the engine)

```php
$res->sendFile('/var/storage/big.json', new SendFileOptions(
    precompressed: false,
));
```

## See also

- [`HttpResponse::sendFile()`](/en/docs/reference/server/http-response.html#sendfile)
- [`TrueAsync\StaticHandler`](/en/docs/reference/server/static-handler.html)
- [Static files and sendFile](/en/docs/server/static-files.html)
