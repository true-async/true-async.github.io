---
layout: docs
lang: de
path_key: "/docs/server/static-files.html"
nav_active: docs
permalink: /de/docs/server/static-files.html
page_title: "TrueAsync Server: Statische Dateien und sendFile"
description: "StaticHandler: integriertes Ausliefern statischer Dateien ohne PHP-Handler. sendFile(): Datei aus dem Handler senden. Precompressed Sidecars, ETag, Range, Security-Policies."
---

# Statische Dateien und sendFile

(PHP 8.6+, true_async_server 0.6+)

In TrueAsync Server gibt es zwei unabhängige Mechanismen zur Dateiauslieferung:

1. **`StaticHandler`** — ein eigener Prefix-Mount, der **vollständig in C** bedient wird, ohne
   Coroutine-Spawn und ohne in die PHP-VM einzutreten.
2. **`HttpResponse::sendFile()`** — handler-gesteuerte Auslieferung. Der PHP-Code hat die
   Entscheidung getroffen (Auth, ACL, Namensgenerierung), der Server holt die Datei von der Disk
   und sendet sie.

Beide nutzen dieselbe FSM in der Engine (MIME, ETag, IMF-Date, Range, Conditional GET,
Precompressed Sidecars).

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

Anfragen unter `/static/...` bedient der `StaticHandler` (kein PHP-Handler wird aufgerufen).
Alles andere geht in den regulären `addHttpHandler`.

Mehrere Mounts werden **in der Reihenfolge der Registrierung** gematcht. Nach dem Attach wird der
`StaticHandler` gesperrt; jeder Setter darauf wirft `HttpServerRuntimeException`.

### Index und Fallthrough

```php
$static
    ->setIndexFiles('index.html', 'index.htm')   // was bei Directory-URL ausgeliefert wird
    ->disableIndex()                              // oder ganz ohne Index-Lookup
    ->setOnMissing(StaticOnMissing::NEXT);        // → an den PHP-Handler weitergeben
```

**`StaticOnMissing`** legt fest, was passiert, wenn die Datei innerhalb von Root nicht gefunden wird:

| Wert | Verhalten |
|------|-----------|
| `NOT_FOUND` (Default) | 404 in C, die Anfrage erreicht die PHP-VM nicht |
| `NEXT` | Control wird an den Dispatcher übergeben, eine reguläre Handler-Coroutine wird gespawnt |

> Eine Anfrage auf eine Directory-URL ohne trailing Slash, bei der alle Index-Dateien 404 ergeben,
> liefert 404. Den 301-Redirect, den nginx/Apache hier setzen, emittiert dieser Handler **nicht**.
> Wenn Ihr Deployment auf einen Catch-All auf Directory-Pfaden setzt, schalten Sie das Index-Lookup
> aus: `setIndexFiles([])` / `disableIndex()`.

### Precompressed Sidecars

```php
$static->enablePrecompressed('br', 'gzip', 'zstd');
```

Wenn der Client `Accept-Encoding: br, gzip` sendet, sucht der Handler nach `main.css.br` neben
`main.css` und liefert das Sidecar direkt aus, ohne CPU-Aufwand für das Encoding. Unterstützte Namen:
`"br"`, `"gzip"`, `"zstd"`. Ein unbekannter Name wirft `InvalidArgumentException` im Setter.

### Security-Policies

```php
use TrueAsync\StaticDotfiles;
use TrueAsync\StaticSymlinks;

$static
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setSymlinkPolicy(StaticSymlinks::REJECT)
    ->hide('*.bak', '*.tmp', 'private/**');
```

**`StaticDotfiles`**:

| | Verhalten |
|---|---|
| `DENY` (Default) | 404 auf jeden Pfad, der ein mit `.` beginnendes Segment enthält (inkl. `..`) |
| `ALLOW` | Dotfiles werden wie reguläre Dateien ausgeliefert |
| `IGNORE` | als ob die Datei nicht existiert (Passthrough gemäß `StaticOnMissing`) |

**`StaticSymlinks`**:

| | Verhalten |
|---|---|
| `REJECT` (Default) | 404 auf jeden Symlink im Pfad. `O_NOFOLLOW` + Per-Segment-`lstat`, Symlinks werden nie traversiert |
| `FOLLOW` | Symlinks werden gefolgt; das Post-`realpath()`-Target muss innerhalb von Root bleiben |
| `OWNER_MATCH` | Folgen nur, wenn Symlink und Target derselben uid gehören |

`hide($glob, ...)` definiert Glob-Patterns für 404 unabhängig von der Existenz der Datei. Der
Vergleich erfolgt **relativ zu Root**, Trenner `/`.

### Cache / Header

```php
$static
    ->setEtagEnabled(true)                                   // W/"…" aus (mtime_ns, size, ino)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

**Open-File-Cache** (nginx-Stil): speichert resolved Path, fstat-Metadaten, MIME, ETag und
Last-Modified für die letzten N Anfragen. Innerhalb von `ttlSeconds` treffen wiederholte Anfragen
den Cache und überspringen realpath/stat/MIME-Walk.

Standardmäßig deaktiviert. Lohnt sich bei kaltem dentry-Cache / großem docroot / Netzwerk-FS. Bei
warmem Dentry auf lokaler Disk liegen die Syscalls ohnehin im µs-Bereich, sodass der
HashTable-Lookup-Overhead den Gewinn auffrisst.

### MIME-Override

```php
$static->setMimeType('webmanifest', 'application/manifest+json');
```

Extension ohne führenden Punkt, in Kleinbuchstaben.

### Performance

Seit 0.4.0 in der Engine:

- **Inline `open(2)`/`fstat(2)`** (Issue #13): kein Futex-Round-Trip über den libuv-Threadpool.
  Wins: H1 tiny 256B 19k → 35k req/s, H1 304 If-None-Match 24k → 123k req/s.
- **Small-File Fast Path** (≤ 64 KiB): Datei wird in ein `zend_string` geslurpt und mit einem
  `writev(headers + body)` ausgeliefert. Wins: H1 tiny → 103k req/s (×2.9), H2 tiny → 154k (×4.4).
- Dateien > 64 KiB laufen über sendfile.

## sendFile aus dem Handler

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

`sendFile()` **schreibt** Pfad + Optionen auf die Response und **kehrt sofort zurück**. Die Übertragung
der Datei läuft in der Dispose-Phase über dieselbe FSM wie `StaticHandler`. Die Compression-Middleware
wird für sendFile umgangen (eigene Delivery-Pipeline).

Nach `sendFile()` ist die Response **versiegelt**: `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` und ein erneutes `sendFile()` werfen
`HttpServerRuntimeException`.

Der Pfad gilt als **vertrauenswürdig**: der Handler hat die Zugriffsentscheidung getroffen.
Open/fstat-Fehler (`ENOENT`, `EACCES`, oversize, non-regular) liefern 500, da die Header noch nicht
auf dem Draht sind.

### SendFileOptions

`final readonly class` mit Named-Args im Konstruktor:

| Feld | Typ | Default | Was es tut |
|------|-----|---------|------------|
| `contentType` | `?string` | `null` | MIME-Override; `null` bedeutet Auto aus der Extension |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` oder `ATTACHMENT` |
| `downloadName` | `?string` | `null` | Dateiname für `Content-Disposition: attachment; filename=...` |
| `cacheControl` | `?string` | `null` | wörtlich in `Cache-Control` |
| `etag` | `bool` | `true` | Weak ETag emittieren |
| `lastModified` | `bool` | `true` | `Last-Modified` emittieren |
| `acceptRanges` | `bool` | `true` | `Range:`-Unterstützung |
| `precompressed` | `bool` | `true` | nach `.br`/`.gz`/`.zst`-Sidecar suchen |
| `conditional` | `bool` | `true` | If-Modified-Since / If-None-Match → 304 |
| `deleteAfterSend` | `bool` | `false` | unlink nach erfolgreichem Senden (für One-Shot-Downloads) |
| `status` | `?int` | `null` | HTTP-Status-Override (z. B. für CDN-Respond mit 200) |

> Der HTTP/3-Pfad für `sendFile()` ist noch in Arbeit: der Dispose-Hook liefert auf H3 momentan 500.

## Siehe auch

- [`TrueAsync\StaticHandler`](/de/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/de/docs/reference/server/send-file-options.html)
- [`HttpResponse::sendFile()`](/de/docs/reference/server/http-response.html#sendfile)
- [Komprimierung](/de/docs/server/compression.html)
