---
layout: docs
lang: es
path_key: "/docs/reference/server/send-file-options.html"
nav_active: docs
permalink: /es/docs/reference/server/send-file-options.html
page_title: "TrueAsync\\SendFileOptions"
description: "TrueAsync\\SendFileOptions: value-object con las opciones de HttpResponse::sendFile(). Disposition, downloadName, ETag, Range, sidecars precomprimidos, deleteAfterSend."
---

# TrueAsync\SendFileOptions

(PHP 8.6+, true_async_server 0.4+)

Value-object con las opciones de
[`HttpResponse::sendFile()`](/es/docs/reference/server/http-response.html#sendfile).
Inmutable (`final readonly class`), se crea mediante named-args en el constructor.

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

## Campos

| Campo | Tipo | Default | Qué hace |
|-------|------|---------|----------|
| `contentType` | `?string` | `null` | Override del MIME. `null`: detección automática por extensión. |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` muestra en el navegador; `ATTACHMENT` descarga. Afecta a `Content-Disposition`. |
| `downloadName` | `?string` | `null` | Nombre de archivo para `Content-Disposition: attachment; filename=...`. Tiene sentido con `ATTACHMENT`. |
| `cacheControl` | `?string` | `null` | Literal en `Cache-Control`. `null`: sin cabecera. |
| `etag` | `bool` | `true` | Emitir weak `ETag` derivado de `(mtime_ns, size, ino)`. |
| `lastModified` | `bool` | `true` | Emitir `Last-Modified` (IMF-fixdate). |
| `acceptRanges` | `bool` | `true` | Soporte de `Range:` (partial content de HTTP/1.1). |
| `precompressed` | `bool` | `true` | Buscar sidecar (`*.br`, `*.gz`, `*.zst`) ante `Accept-Encoding` compatible. |
| `conditional` | `bool` | `true` | `If-Modified-Since` / `If-None-Match` → 304. |
| `deleteAfterSend` | `bool` | `false` | `unlink($path)` tras un envío correcto. Útil para descargas one-shot desde archivos temporales. |
| `status` | `?int` | `null` | Override del status HTTP. Ejemplo: 200 a una respuesta concreta aunque por defecto sería 304. |

## SendFileDisposition

```php
namespace TrueAsync;

enum SendFileDisposition: string
{
    case INLINE     = 'inline';
    case ATTACHMENT = 'attachment';
}
```

## Ejemplos

### PDF inline

```php
use TrueAsync\SendFileOptions;

$res->sendFile('/var/storage/q1-report.pdf', new SendFileOptions(
    contentType:  'application/pdf',
    cacheControl: 'private, max-age=300',
));
```

### Descarga con nombre para el usuario

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$res->sendFile('/var/storage/abc123.bin', new SendFileOptions(
    disposition:  SendFileDisposition::ATTACHMENT,
    downloadName: 'Q1 Report 2026.pdf',
    contentType:  'application/pdf',
));
```

### Archivo temporal one-shot

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

### Sin GET condicional (siempre 200)

```php
$res->sendFile('/var/storage/live.mp4', new SendFileOptions(
    conditional:   false,
    acceptRanges:  true,
    cacheControl:  'no-store',
));
```

### Sin sidecar precomprimido (comprimir al vuelo en el motor)

```php
$res->sendFile('/var/storage/big.json', new SendFileOptions(
    precompressed: false,
));
```

## Véase también

- [`HttpResponse::sendFile()`](/es/docs/reference/server/http-response.html#sendfile)
- [`TrueAsync\StaticHandler`](/es/docs/reference/server/static-handler.html)
- [Archivos estáticos y sendFile](/es/docs/server/static-files.html)
