---
layout: docs
lang: en
path_key: "/docs/reference/server/static-handler.html"
nav_active: docs
permalink: /en/docs/reference/server/static-handler.html
page_title: "TrueAsync\\StaticHandler"
description: "TrueAsync\\StaticHandler — prefix-mount static delivery without a PHP handler. Precompressed sidecars, ETag, Range, dotfile/symlink policies, open-file cache."
---

# TrueAsync\StaticHandler

(PHP 8.6+, true_async_server 0.6+)

Built-in static file handler (issue #13). One instance = one prefix mount. Attached to the server
via [`HttpServer::addStaticHandler()`](/en/docs/reference/server/http-server.html#addstatichandler).

Entirely in C: requests do not spawn coroutines and do not enter the PHP VM — files are served
through libuv async fs ops straight into the response stream.

```php
namespace TrueAsync;

final class StaticHandler
{
    public function __construct(string $urlPrefix, string $rootDirectory);

    // index / fallthrough
    public function setIndexFiles(string ...$files): static;
    public function disableIndex(): static;
    public function setOnMissing(StaticOnMissing $mode): static;

    // precompressed sidecars
    public function enablePrecompressed(string ...$encodings): static;
    public function disablePrecompressed(): static;

    // security
    public function setDotfilePolicy(StaticDotfiles $policy): static;
    public function setSymlinkPolicy(StaticSymlinks $policy): static;
    public function hide(string ...$globs): static;

    // cache / headers
    public function setEtagEnabled(bool $enabled): static;
    public function setCacheControl(string $value): static;
    public function setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static;
    public function disableOpenFileCache(): static;
    public function setHeader(string $name, string $value): static;

    // directory listing
    public function setBrowseEnabled(bool $enabled): static;

    // MIME
    public function setMimeType(string $extension, string $contentType): static;

    // introspection
    public function getUrlPrefix(): string;
    public function getRootDirectory(): string;
    public function isLocked(): bool;
}
```

## Constructor

### __construct

```php
public StaticHandler::__construct(string $urlPrefix, string $rootDirectory)
```

| Parameter | Requirements |
|-----------|--------------|
| `$urlPrefix` | URL prefix. Must start and end with `/`. Example: `"/static/"`. |
| `$rootDirectory` | Absolute path to a directory on disk; canonicalised at attach time. |

## Index / fallthrough

### setIndexFiles

```php
public StaticHandler::setIndexFiles(string ...$files): static
```

File names served when a directory URL is requested. Default `["index.html"]`. An empty list
disables index lookup.

### disableIndex

```php
public StaticHandler::disableIndex(): static
```

Equivalent to `setIndexFiles()` with no arguments.

### setOnMissing

```php
public StaticHandler::setOnMissing(StaticOnMissing $mode): static
```

What to do when the requested path does not resolve to a regular file inside the root:

| Value | Behaviour |
|-------|-----------|
| `StaticOnMissing::NOT_FOUND` (default) | 404 in C, the request never reaches the PHP VM |
| `StaticOnMissing::NEXT` | Control is handed back to the dispatcher and a normal handler coroutine is spawned — the request goes to [`addHttpHandler()`](/en/docs/reference/server/http-server.html#addhttphandler) |

## Precompressed sidecars

### enablePrecompressed

```php
public StaticHandler::enablePrecompressed(string ...$encodings): static
```

Enables serving precompressed sidecars (`main.css.br`, `main.css.gz`, `main.css.zst`) when the
client allows them through `Accept-Encoding`. Arguments are content-coding names: `"br"`,
`"gzip"`, `"zstd"`. Unknown names — `InvalidArgumentException` from the setter.

### disablePrecompressed

```php
public StaticHandler::disablePrecompressed(): static
```

## Security

### setDotfilePolicy

```php
public StaticHandler::setDotfilePolicy(StaticDotfiles $policy): static
```

A "dotfile" is any path segment that starts with `.`, including `..` (which is always rejected by
the traversal guard regardless of policy).

| | Behaviour |
|---|-----------|
| `StaticDotfiles::DENY` (default) | 404 on any path containing a dotfile component |
| `StaticDotfiles::ALLOW` | dotfiles are served as regular files |
| `StaticDotfiles::IGNORE` | as if the file did not exist (passthrough governed by `StaticOnMissing`) |

### setSymlinkPolicy

```php
public StaticHandler::setSymlinkPolicy(StaticSymlinks $policy): static
```

| | Behaviour |
|---|-----------|
| `StaticSymlinks::REJECT` (default) | 404 on any symlink in the path. `O_NOFOLLOW` + per-segment `lstat` — a symlink is never traversed |
| `StaticSymlinks::FOLLOW` | symlinks are followed; the post-`realpath()` target must stay inside the root |
| `StaticSymlinks::OWNER_MATCH` | follow only when the symlink and its target share the same uid |

### hide

```php
public StaticHandler::hide(string ...$globs): static
```

Glob patterns: matching paths return 404 regardless of whether they exist. Comparison is
**relative to the root** and uses `/` as the separator.

## Cache / headers

### setEtagEnabled

```php
public StaticHandler::setEtagEnabled(bool $enabled): static
```

Toggle weak ETag (default `true`). When enabled, every 200 carries an `ETag: W/"…"` derived from
`(mtime_ns, size, ino)`; `If-None-Match` / `If-Modified-Since` produce 304.

### setCacheControl

```php
public StaticHandler::setCacheControl(string $value): static
```

Literal `Cache-Control`. An empty string suppresses emission.

### setOpenFileCache

```php
public StaticHandler::setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static
```

nginx-style open-file cache: caches resolved path, fstat metadata, MIME, ETag, and Last-Modified
for the last N requests. Within `ttlSeconds`, repeat requests hit the cache and skip
realpath/stat/MIME walks.

Disabled by default. It pays off on cold dentry caches / large docroots / network filesystems.
On a warm-dentry local disk, syscalls already cost sub-microseconds — the HashTable-lookup
overhead eats the win.

`$maxEntries == 0` — disable.

### disableOpenFileCache

```php
public StaticHandler::disableOpenFileCache(): static
```

Sugar for `setOpenFileCache(0)`.

### setHeader

```php
public StaticHandler::setHeader(string $name, string $value): static
```

Fixed header, evaluated once at attach time. Emitted on every 200 and 304 (except `Content-*`
headers per RFC 9110 §15.4.5).

## Directory listing

### setBrowseEnabled

```php
public StaticHandler::setBrowseEnabled(bool $enabled): static
```

Toggle HTML listing when a directory is requested without an index. Default `false`.

> Reserved for PR #6 — currently a no-op; accepted by the setter without effect.

## MIME

### setMimeType

```php
public StaticHandler::setMimeType(string $extension, string $contentType): static
```

Override `Content-Type` for files with the given extension. Extension — lowercased, no leading
dot.

## Introspection

### getUrlPrefix / getRootDirectory

```php
public StaticHandler::getUrlPrefix(): string
public StaticHandler::getRootDirectory(): string
```

### isLocked

```php
public StaticHandler::isLocked(): bool
```

`true` after the handler is attached to the server via `addStaticHandler()`. A locked handler
rejects every setter with a runtime exception.

## Enums

See the individual pages:

- [`StaticOnMissing`](/en/docs/reference/server/static-on-missing.html)
- [`StaticDotfiles`](/en/docs/reference/server/static-dotfiles.html)
- [`StaticSymlinks`](/en/docs/reference/server/static-symlinks.html)

(All three are `enum: int` under the `TrueAsync` namespace.)

## Example

```php
use TrueAsync\StaticHandler;
use TrueAsync\StaticOnMissing;
use TrueAsync\StaticDotfiles;

$static = (new StaticHandler('/static/', '/var/www/public'))
    ->setIndexFiles('index.html', 'index.htm')
    ->enablePrecompressed('br', 'gzip')
    ->setOnMissing(StaticOnMissing::NEXT)
    ->setDotfilePolicy(StaticDotfiles::DENY)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setEtagEnabled(true)
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60)
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->hide('*.bak', '*.tmp', 'private/**');

$server->addStaticHandler($static);
```

## See also

- [Static files and sendFile](/en/docs/server/static-files.html)
- [`HttpServer::addStaticHandler()`](/en/docs/reference/server/http-server.html#addstatichandler)
- [`HttpResponse::sendFile()`](/en/docs/reference/server/http-response.html#sendfile)
