---
layout: docs
lang: ru
path_key: "/docs/reference/server/send-file-options.html"
nav_active: docs
permalink: /ru/docs/reference/server/send-file-options.html
page_title: "TrueAsync\\SendFileOptions"
description: "TrueAsync\\SendFileOptions — value-object с настройками HttpResponse::sendFile(). Disposition, downloadName, ETag, Range, precompressed sidecars, deleteAfterSend."
---

# TrueAsync\SendFileOptions

(PHP 8.6+, true_async_server 0.4+)

Value-object с настройками
[`HttpResponse::sendFile()`](/ru/docs/reference/server/http-response.html#sendfile).
Иммутабельный (`final readonly class`), создаётся через named-args в конструкторе.

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

| Поле | Тип | Дефолт | Что делает |
|------|-----|--------|------------|
| `contentType` | `?string` | `null` | Override MIME. `null` — определяется автоматически по расширению. |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` — отображать в браузере; `ATTACHMENT` — скачать. Влияет на `Content-Disposition`. |
| `downloadName` | `?string` | `null` | Имя файла для `Content-Disposition: attachment; filename=...`. Имеет смысл с `ATTACHMENT`. |
| `cacheControl` | `?string` | `null` | Литерально в `Cache-Control`. `null` — без заголовка. |
| `etag` | `bool` | `true` | Эмитить weak `ETag` из `(mtime_ns, size, ino)`. |
| `lastModified` | `bool` | `true` | Эмитить `Last-Modified` (IMF-fixdate). |
| `acceptRanges` | `bool` | `true` | Поддержка `Range:` (HTTP/1.1 partial content). |
| `precompressed` | `bool` | `true` | Искать sidecar (`*.br`, `*.gz`, `*.zst`) при совместимом `Accept-Encoding`. |
| `conditional` | `bool` | `true` | `If-Modified-Since` / `If-None-Match` → 304. |
| `deleteAfterSend` | `bool` | `false` | `unlink($path)` после успешной отправки. Удобно для one-shot скачиваний из temp-files. |
| `status` | `?int` | `null` | Override HTTP-статуса. Пример: 200 на конкретный staged response, даже если default был бы 304. |

## SendFileDisposition

```php
namespace TrueAsync;

enum SendFileDisposition: string
{
    case INLINE     = 'inline';
    case ATTACHMENT = 'attachment';
}
```

## Примеры

### Inline PDF

```php
use TrueAsync\SendFileOptions;

$res->sendFile('/var/storage/q1-report.pdf', new SendFileOptions(
    contentType:  'application/pdf',
    cacheControl: 'private, max-age=300',
));
```

### Скачивание с именем для пользователя

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

### Без precompressed sidecar (на лету сжимать движком)

```php
$res->sendFile('/var/storage/big.json', new SendFileOptions(
    precompressed: false,
));
```

## См. также

- [`HttpResponse::sendFile()`](/ru/docs/reference/server/http-response.html#sendfile)
- [`TrueAsync\StaticHandler`](/ru/docs/reference/server/static-handler.html)
- [Статика и sendFile](/ru/docs/server/static-files.html)
