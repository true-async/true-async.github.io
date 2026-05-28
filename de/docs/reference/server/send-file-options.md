---
layout: docs
lang: de
path_key: "/docs/reference/server/send-file-options.html"
nav_active: docs
permalink: /de/docs/reference/server/send-file-options.html
page_title: "TrueAsync\\SendFileOptions"
description: "TrueAsync\\SendFileOptions — Value-Object mit Einstellungen für HttpResponse::sendFile(). Disposition, downloadName, ETag, Range, Precompressed Sidecars, deleteAfterSend."
---

# TrueAsync\SendFileOptions

(PHP 8.6+, true_async_server 0.4+)

Value-Object mit Einstellungen für
[`HttpResponse::sendFile()`](/de/docs/reference/server/http-response.html#sendfile).
Immutabel (`final readonly class`), wird über Named-Args im Konstruktor erstellt.

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

## Felder

| Feld | Typ | Default | Was es tut |
|------|-----|---------|------------|
| `contentType` | `?string` | `null` | MIME-Override. `null` — wird automatisch aus der Endung bestimmt. |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` — im Browser anzeigen; `ATTACHMENT` — herunterladen. Beeinflusst `Content-Disposition`. |
| `downloadName` | `?string` | `null` | Dateiname für `Content-Disposition: attachment; filename=...`. Sinnvoll mit `ATTACHMENT`. |
| `cacheControl` | `?string` | `null` | wörtlich in `Cache-Control`. `null` — kein Header. |
| `etag` | `bool` | `true` | Weak `ETag` aus `(mtime_ns, size, ino)` emittieren. |
| `lastModified` | `bool` | `true` | `Last-Modified` (IMF-fixdate) emittieren. |
| `acceptRanges` | `bool` | `true` | `Range:`-Unterstützung (HTTP/1.1 Partial Content). |
| `precompressed` | `bool` | `true` | Sidecar (`*.br`, `*.gz`, `*.zst`) bei kompatiblem `Accept-Encoding` suchen. |
| `conditional` | `bool` | `true` | `If-Modified-Since` / `If-None-Match` → 304. |
| `deleteAfterSend` | `bool` | `false` | `unlink($path)` nach erfolgreichem Senden. Nützlich für One-Shot-Downloads aus Temp-Files. |
| `status` | `?int` | `null` | HTTP-Status-Override. Beispiel: 200 für eine bestimmte staged Response, auch wenn der Default 304 wäre. |

## SendFileDisposition

```php
namespace TrueAsync;

enum SendFileDisposition: string
{
    case INLINE     = 'inline';
    case ATTACHMENT = 'attachment';
}
```

## Beispiele

### Inline PDF

```php
use TrueAsync\SendFileOptions;

$res->sendFile('/var/storage/q1-report.pdf', new SendFileOptions(
    contentType:  'application/pdf',
    cacheControl: 'private, max-age=300',
));
```

### Download mit benutzerseitigem Namen

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$res->sendFile('/var/storage/abc123.bin', new SendFileOptions(
    disposition:  SendFileDisposition::ATTACHMENT,
    downloadName: 'Q1 Report 2026.pdf',
    contentType:  'application/pdf',
));
```

### One-Shot Temp-File

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

### Ohne Conditional GET (always 200)

```php
$res->sendFile('/var/storage/live.mp4', new SendFileOptions(
    conditional:   false,
    acceptRanges:  true,
    cacheControl:  'no-store',
));
```

### Ohne Precompressed Sidecar (on-the-fly durch die Engine komprimieren)

```php
$res->sendFile('/var/storage/big.json', new SendFileOptions(
    precompressed: false,
));
```

## Siehe auch

- [`HttpResponse::sendFile()`](/de/docs/reference/server/http-response.html#sendfile)
- [`TrueAsync\StaticHandler`](/de/docs/reference/server/static-handler.html)
- [Statische Dateien und sendFile](/de/docs/server/static-files.html)
