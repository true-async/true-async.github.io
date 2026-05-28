---
layout: docs
lang: en
path_key: "/docs/server/static-files.html"
nav_active: docs
permalink: /en/docs/server/static-files.html
page_title: "TrueAsync Server: static files and sendFile"
description: "StaticHandler: built-in static delivery without a PHP handler. sendFile(): handler-driven file delivery. Precompressed sidecars, ETag, Range, security policies."
---

# Static files and sendFile

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server has two independent file-delivery mechanisms:

1. **`StaticHandler`** — a separate prefix mount served **entirely in C**, without spawning a
   coroutine or entering the PHP VM.
2. **`HttpResponse::sendFile()`** — handler-driven delivery. The PHP code makes the decision
   (auth, ACL, name generation), and the server picks up the file from disk and sends it.

Both use the same engine FSM (MIME, ETag, IMF-date, Range, conditional GET, precompressed sidecars).

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

Requests to `/static/...` are served by `StaticHandler` (no PHP handler is invoked).
Everything else flows through the regular `addHttpHandler`.

Multiple mounts are matched **in registration order**. After attach, `StaticHandler` is locked;
any setter on it throws `HttpServerRuntimeException`.

### Index and fallthrough

```php
$static
    ->setIndexFiles('index.html', 'index.htm')   // what to serve on a directory URL
    ->disableIndex()                              // or no index lookup at all
    ->setOnMissing(StaticOnMissing::NEXT);        // → hand off to the PHP handler
```

**`StaticOnMissing`** controls what happens when a file is not found inside the root:

| Value | Behaviour |
|-------|-----------|
| `NOT_FOUND` (default) | 404 in C, the request never reaches the PHP VM |
| `NEXT` | Control is handed back to the dispatcher and a normal handler coroutine is spawned |

> A request for a directory URL without a trailing slash, where all index files 404, returns 404.
> The 301 redirect that nginx/Apache emit is **not** produced by this handler. If your deployment
> relies on a catch-all on directory paths, disable index lookup: `setIndexFiles([])` /
> `disableIndex()`.

### Precompressed sidecars

```php
$static->enablePrecompressed('br', 'gzip', 'zstd');
```

When the client sends `Accept-Encoding: br, gzip`, the handler looks for `main.css.br` next to
`main.css` and serves the sidecar directly, with no CPU cost for encoding. Supported names:
`"br"`, `"gzip"`, `"zstd"`. An unknown name throws `InvalidArgumentException` from the setter.

### Security policies

```php
use TrueAsync\StaticDotfiles;
use TrueAsync\StaticSymlinks;

$static
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setSymlinkPolicy(StaticSymlinks::REJECT)
    ->hide('*.bak', '*.tmp', 'private/**');
```

**`StaticDotfiles`**:

| | Behaviour |
|---|-----------|
| `DENY` (default) | 404 on any path containing a segment that starts with `.` (including `..`) |
| `ALLOW` | dotfiles are served as regular files |
| `IGNORE` | as if the file did not exist (passthrough governed by `StaticOnMissing`) |

**`StaticSymlinks`**:

| | Behaviour |
|---|-----------|
| `REJECT` (default) | 404 on any symlink in the path. `O_NOFOLLOW` + per-segment `lstat` — a symlink is never traversed |
| `FOLLOW` | symlinks are followed; the post-`realpath()` target must stay inside the root |
| `OWNER_MATCH` | follow only when the symlink and its target share the same uid |

`hide($glob, ...)` defines glob patterns that return 404 regardless of whether the file exists.
The comparison is **relative to the root** and uses `/` as the separator.

### Cache / headers

```php
$static
    ->setEtagEnabled(true)                                   // W/"…" from (mtime_ns, size, ino)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

**Open-file cache** (nginx style): caches resolved path, fstat metadata, MIME, ETag, and
Last-Modified for the last N requests. Within `ttlSeconds`, repeat requests hit the cache and skip
the realpath/stat/MIME walk.

Disabled by default. It pays off on cold dentry caches / large docroots / network filesystems.
On a warm-dentry local disk, syscalls already cost sub-microseconds, so the HashTable-lookup
overhead eats the win.

### MIME override

```php
$static->setMimeType('webmanifest', 'application/manifest+json');
```

Extension without a leading dot, lowercased.

### Performance

Since 0.4.0 in the engine:

- **Inline `open(2)`/`fstat(2)`** (issue #13): no futex round trip through the libuv thread pool.
  Wins: H1 tiny 256B 19k → 35k req/s, H1 304 If-None-Match 24k → 123k req/s.
- **Small-file fast path** (≤ 64 KiB): the file is slurped into a `zend_string` and sent with a
  single `writev(headers + body)`. Wins: H1 tiny → 103k req/s (×2.9), H2 tiny → 154k (×4.4).
- Files > 64 KiB go through sendfile.

## sendFile from a handler

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

`sendFile()` **records** the path + options on the response and **returns immediately**. The file
transfer happens in the dispose phase through the same FSM as `StaticHandler`. The compression
middleware is bypassed for sendFile (it has its own delivery pipeline).

After `sendFile()` the response is **sealed**: `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` and a repeat `sendFile()` all throw
`HttpServerRuntimeException`.

The path is treated as **trusted**: the handler already made the access decision. open/fstat
errors (`ENOENT`, `EACCES`, oversize, non-regular) produce a 500, because the headers are not on
the wire yet.

### SendFileOptions

A `final readonly class` with named arguments in the constructor:

| Field | Type | Default | What it does |
|-------|------|---------|--------------|
| `contentType` | `?string` | `null` | override MIME; `null` means auto-derive from the extension |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` or `ATTACHMENT` |
| `downloadName` | `?string` | `null` | filename for `Content-Disposition: attachment; filename=...` |
| `cacheControl` | `?string` | `null` | literally placed into `Cache-Control` |
| `etag` | `bool` | `true` | emit weak ETag |
| `lastModified` | `bool` | `true` | emit `Last-Modified` |
| `acceptRanges` | `bool` | `true` | support `Range:` |
| `precompressed` | `bool` | `true` | look for `.br`/`.gz`/`.zst` sidecars |
| `conditional` | `bool` | `true` | If-Modified-Since / If-None-Match → 304 |
| `deleteAfterSend` | `bool` | `false` | unlink after successful send (for one-shot downloads) |
| `status` | `?int` | `null` | override the HTTP status (for example, to answer a CDN with 200) |

> The HTTP/3 path for `sendFile()` is still in progress: the dispose hook returns 500 on H3.

## See also

- [`TrueAsync\StaticHandler`](/en/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/en/docs/reference/server/send-file-options.html)
- [`HttpResponse::sendFile()`](/en/docs/reference/server/http-response.html#sendfile)
- [Compression](/en/docs/server/compression.html)
