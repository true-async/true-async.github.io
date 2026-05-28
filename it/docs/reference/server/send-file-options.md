---
layout: docs
lang: it
path_key: "/docs/reference/server/send-file-options.html"
nav_active: docs
permalink: /it/docs/reference/server/send-file-options.html
page_title: "TrueAsync\\SendFileOptions"
description: "TrueAsync\\SendFileOptions: value-object con le opzioni di HttpResponse::sendFile(). Disposition, downloadName, ETag, Range, sidecar precompressi, deleteAfterSend."
---

# TrueAsync\SendFileOptions

(PHP 8.6+, true_async_server 0.4+)

Value-object con le impostazioni di
[`HttpResponse::sendFile()`](/it/docs/reference/server/http-response.html#sendfile).
Immutabile (`final readonly class`), si crea tramite argomenti nominati nel costruttore.

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

## Campi

| Campo | Tipo | Default | Cosa fa |
|-------|------|---------|---------|
| `contentType` | `?string` | `null` | Override del MIME. `null`: autodetect dall'estensione. |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE`: mostra nel browser; `ATTACHMENT`: download. Influenza `Content-Disposition`. |
| `downloadName` | `?string` | `null` | Nome file per `Content-Disposition: attachment; filename=...`. Ha senso con `ATTACHMENT`. |
| `cacheControl` | `?string` | `null` | Letterale in `Cache-Control`. `null`: nessun header. |
| `etag` | `bool` | `true` | Emette `ETag` weak da `(mtime_ns, size, ino)`. |
| `lastModified` | `bool` | `true` | Emette `Last-Modified` (IMF-fixdate). |
| `acceptRanges` | `bool` | `true` | Supporto a `Range:` (HTTP/1.1 partial content). |
| `precompressed` | `bool` | `true` | Cerca sidecar (`*.br`, `*.gz`, `*.zst`) se `Accept-Encoding` lo consente. |
| `conditional` | `bool` | `true` | `If-Modified-Since` / `If-None-Match` → 304. |
| `deleteAfterSend` | `bool` | `false` | `unlink($path)` dopo invio riuscito. Utile per download one-shot da file temporanei. |
| `status` | `?int` | `null` | Override dello stato HTTP. Esempio: 200 su una risposta in staging specifica, anche se il default sarebbe 304. |

## SendFileDisposition

```php
namespace TrueAsync;

enum SendFileDisposition: string
{
    case INLINE     = 'inline';
    case ATTACHMENT = 'attachment';
}
```

## Esempi

### PDF inline

```php
use TrueAsync\SendFileOptions;

$res->sendFile('/var/storage/q1-report.pdf', new SendFileOptions(
    contentType:  'application/pdf',
    cacheControl: 'private, max-age=300',
));
```

### Download con nome per l'utente

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$res->sendFile('/var/storage/abc123.bin', new SendFileOptions(
    disposition:  SendFileDisposition::ATTACHMENT,
    downloadName: 'Q1 Report 2026.pdf',
    contentType:  'application/pdf',
));
```

### File temporaneo one-shot

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

### Senza GET condizionali (sempre 200)

```php
$res->sendFile('/var/storage/live.mp4', new SendFileOptions(
    conditional:   false,
    acceptRanges:  true,
    cacheControl:  'no-store',
));
```

### Senza sidecar precompresso (lascia comprimere al motore al volo)

```php
$res->sendFile('/var/storage/big.json', new SendFileOptions(
    precompressed: false,
));
```

## Vedi anche

- [`HttpResponse::sendFile()`](/it/docs/reference/server/http-response.html#sendfile)
- [`TrueAsync\StaticHandler`](/it/docs/reference/server/static-handler.html)
- [File statici e sendFile](/it/docs/server/static-files.html)
