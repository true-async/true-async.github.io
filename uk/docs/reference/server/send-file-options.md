---
layout: docs
lang: uk
path_key: "/docs/reference/server/send-file-options.html"
nav_active: docs
permalink: /uk/docs/reference/server/send-file-options.html
page_title: "TrueAsync\\SendFileOptions"
description: "TrueAsync\\SendFileOptions — value-object з налаштуваннями HttpResponse::sendFile(). Disposition, downloadName, ETag, Range, precompressed sidecars, deleteAfterSend."
---

# TrueAsync\SendFileOptions

(PHP 8.6+, true_async_server 0.4+)

Value-object з налаштуваннями
[`HttpResponse::sendFile()`](/uk/docs/reference/server/http-response.html#sendfile).
Імутабельний (`final readonly class`), створюється через named-args у конструкторі.

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

## Поля

| Поле | Тип | Дефолт | Що робить |
|------|-----|--------|-----------|
| `contentType` | `?string` | `null` | Override MIME. `null` — визначається автоматично за розширенням. |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` — показувати в браузері; `ATTACHMENT` — завантажити. Впливає на `Content-Disposition`. |
| `downloadName` | `?string` | `null` | Ім'я файлу для `Content-Disposition: attachment; filename=...`. Має сенс з `ATTACHMENT`. |
| `cacheControl` | `?string` | `null` | Літерально в `Cache-Control`. `null` — без заголовка. |
| `etag` | `bool` | `true` | Емітувати weak `ETag` з `(mtime_ns, size, ino)`. |
| `lastModified` | `bool` | `true` | Емітувати `Last-Modified` (IMF-fixdate). |
| `acceptRanges` | `bool` | `true` | Підтримка `Range:` (HTTP/1.1 partial content). |
| `precompressed` | `bool` | `true` | Шукати sidecar (`*.br`, `*.gz`, `*.zst`) при сумісному `Accept-Encoding`. |
| `conditional` | `bool` | `true` | `If-Modified-Since` / `If-None-Match` → 304. |
| `deleteAfterSend` | `bool` | `false` | `unlink($path)` після успішного надсилання. Зручно для one-shot завантажень з temp-files. |
| `status` | `?int` | `null` | Override HTTP-статусу. Приклад: 200 на конкретний staged response, навіть якщо default був би 304. |

## SendFileDisposition

```php
namespace TrueAsync;

enum SendFileDisposition: string
{
    case INLINE     = 'inline';
    case ATTACHMENT = 'attachment';
}
```

## Приклади

### Inline PDF

```php
use TrueAsync\SendFileOptions;

$res->sendFile('/var/storage/q1-report.pdf', new SendFileOptions(
    contentType:  'application/pdf',
    cacheControl: 'private, max-age=300',
));
```

### Завантаження з іменем для користувача

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$res->sendFile('/var/storage/abc123.bin', new SendFileOptions(
    disposition:  SendFileDisposition::ATTACHMENT,
    downloadName: 'Q1 Report 2026.pdf',
    contentType:  'application/pdf',
));
```

### One-shot temp-file

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

### Без conditional GET (always 200)

```php
$res->sendFile('/var/storage/live.mp4', new SendFileOptions(
    conditional:   false,
    acceptRanges:  true,
    cacheControl:  'no-store',
));
```

### Без precompressed sidecar (на льоту стискати рушієм)

```php
$res->sendFile('/var/storage/big.json', new SendFileOptions(
    precompressed: false,
));
```

## Див. також

- [`HttpResponse::sendFile()`](/uk/docs/reference/server/http-response.html#sendfile)
- [`TrueAsync\StaticHandler`](/uk/docs/reference/server/static-handler.html)
- [Статика і sendFile](/uk/docs/server/static-files.html)
