---
layout: docs
lang: fr
path_key: "/docs/reference/server/send-file-options.html"
nav_active: docs
permalink: /fr/docs/reference/server/send-file-options.html
page_title: "TrueAsync\\SendFileOptions"
description: "TrueAsync\\SendFileOptions — value-object avec les réglages de HttpResponse::sendFile(). Disposition, downloadName, ETag, Range, sidecars précompressés, deleteAfterSend."
---

# TrueAsync\SendFileOptions

(PHP 8.6+, true_async_server 0.4+)

Value-object avec les réglages de
[`HttpResponse::sendFile()`](/fr/docs/reference/server/http-response.html#sendfile).
Immuable (`final readonly class`), créé via args nommés au constructeur.

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

## Champs

| Champ | Type | Défaut | Rôle |
|-------|------|--------|------|
| `contentType` | `?string` | `null` | Override MIME. `null` : déterminé automatiquement par l'extension. |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` : afficher dans le navigateur ; `ATTACHMENT` : télécharger. Affecte `Content-Disposition`. |
| `downloadName` | `?string` | `null` | Nom de fichier pour `Content-Disposition: attachment; filename=...`. Pertinent avec `ATTACHMENT`. |
| `cacheControl` | `?string` | `null` | Littéralement dans `Cache-Control`. `null` : pas d'en-tête. |
| `etag` | `bool` | `true` | Émettre un weak `ETag` calculé depuis `(mtime_ns, size, ino)`. |
| `lastModified` | `bool` | `true` | Émettre `Last-Modified` (IMF-fixdate). |
| `acceptRanges` | `bool` | `true` | Support de `Range:` (partial content HTTP/1.1). |
| `precompressed` | `bool` | `true` | Chercher un sidecar (`*.br`, `*.gz`, `*.zst`) avec un `Accept-Encoding` compatible. |
| `conditional` | `bool` | `true` | `If-Modified-Since` / `If-None-Match` → 304. |
| `deleteAfterSend` | `bool` | `false` | `unlink($path)` après envoi réussi. Pratique pour les téléchargements one-shot depuis des temp-files. |
| `status` | `?int` | `null` | Override du statut HTTP. Ex. : 200 sur une réponse stagée précise, même si le défaut serait 304. |

## SendFileDisposition

```php
namespace TrueAsync;

enum SendFileDisposition: string
{
    case INLINE     = 'inline';
    case ATTACHMENT = 'attachment';
}
```

## Exemples

### PDF inline

```php
use TrueAsync\SendFileOptions;

$res->sendFile('/var/storage/q1-report.pdf', new SendFileOptions(
    contentType:  'application/pdf',
    cacheControl: 'private, max-age=300',
));
```

### Téléchargement avec un nom pour l'utilisateur

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$res->sendFile('/var/storage/abc123.bin', new SendFileOptions(
    disposition:  SendFileDisposition::ATTACHMENT,
    downloadName: 'Q1 Report 2026.pdf',
    contentType:  'application/pdf',
));
```

### Temp-file one-shot

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

### Sans conditional GET (toujours 200)

```php
$res->sendFile('/var/storage/live.mp4', new SendFileOptions(
    conditional:   false,
    acceptRanges:  true,
    cacheControl:  'no-store',
));
```

### Sans sidecar précompressé (compression à la volée par le moteur)

```php
$res->sendFile('/var/storage/big.json', new SendFileOptions(
    precompressed: false,
));
```

## Voir aussi

- [`HttpResponse::sendFile()`](/fr/docs/reference/server/http-response.html#sendfile)
- [`TrueAsync\StaticHandler`](/fr/docs/reference/server/static-handler.html)
- [Fichiers statiques et sendFile](/fr/docs/server/static-files.html)
