---
layout: docs
lang: en
path_key: "/docs/server/compression.html"
nav_active: docs
permalink: /en/docs/server/compression.html
page_title: "TrueAsync Server: HTTP compression"
description: "gzip, Brotli, and zstd in TrueAsync Server: Accept-Encoding negotiation, MIME filter, limits, BREACH mitigation, inbound body decoding."
---

# HTTP compression

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server supports three codecs — **gzip**, **Brotli (br)**, and **zstd** — uniformly
across all protocols: HTTP/1.1, HTTP/2, and HTTP/3.

## Backends

- **gzip** — `zlib-ng` (preferred, roughly 2–4× faster at the same compression level) or system
  `zlib` as a fallback. The same code, switched through a `zng_*` ↔ `*` macro layer.
- **Brotli** — `libbrotli`. Active only when `--enable-brotli` finds the library.
- **zstd** — `libzstd`. Active only when `--enable-zstd` finds the library.

The compiled-in set can be inspected at runtime:

```php
TrueAsync\HttpServerConfig::getSupportedEncodings();
// → ["zstd", "br", "gzip", "identity"]
```

The list always contains `"identity"`; `"gzip"` shows up on successful `--enable-http-compression`;
`"br"`/`"zstd"` show up when the corresponding library is present at configure time.

## Server-side preference

The server preference order is **`zstd > gzip > brotli > identity`**.

> **Why is gzip ahead of brotli?** The Brotli encoder cannot reuse its state
> (`libbrotli` has no public reset API). Until an arena allocator lands (TODO Step 4), gzip's
> `deflateReset` gives the better default. Clients that explicitly prefer brotli via q-values
> (`br;q=1.0, gzip;q=0.5`) still get brotli.

## Negotiation (RFC 9110 §12.5.3)

The server parses the client `Accept-Encoding`: q-values, `identity;q=0`, `*;q=0`. If the header
is **absent**, the response is sent uncompressed (identity only). That matches nginx behaviour and
is safer than a strict reading of the RFC.

Compression is **skipped** when:

- the status is `1xx`, `204`, or `304`
- the method is `HEAD`
- the response uses `Range`
- the handler has already set `Content-Encoding`
- the MIME is outside the whitelist
- the body is smaller than the threshold

## Configuration

```php
use TrueAsync\HttpServerConfig;

$config
    ->setCompressionEnabled(true)              // master switch (default: true)
    ->setCompressionLevel(6)                   // gzip 1..9, default 6
    ->setBrotliLevel(4)                        // 0..11, default 4
    ->setZstdLevel(3)                          // 1..22, default 3
    ->setCompressionMinSize(1024)              // do not compress bodies < 1 KiB
    ->setCompressionMimeTypes([
        'application/javascript',
        'application/json',
        'application/xml',
        'image/svg+xml',
        'text/css',
        'text/html',
        'text/javascript',
        'text/plain',
        'text/xml',
    ])
    ->setRequestMaxDecompressedSize(10 * 1024 * 1024);  // anti-zip-bomb cap
```

### Compression levels

| Codec | Range | Default | Notes |
|-------|------:|--------:|-------|
| gzip | 1..9 | 6 | classic zlib semantics |
| brotli | 0..11 | 4 | quality 11 ≈ 50× slower than quality 4 with little real gain |
| zstd | 1..22 | 3 | the zstd team's own default: better ratio than gzip-6 and faster |

### MIME whitelist

`setCompressionMimeTypes()` **fully replaces** the list (nginx `gzip_types` semantics).
Entries are normalised at setter time: parameters (`; charset=...`) are trimmed off, whitespace is
stripped, everything is lowercased. The runtime comparison stays exact and zero-allocation.

### Anti-zip-bomb

`setRequestMaxDecompressedSize($bytes)` caps the **decompressed** size of inbound bodies.
The default is 10 MiB. Anything larger returns 413. `0` disables the cap, but it must be set
explicitly — there is no implicit-unlimited path.

## Per-response opt-out

`HttpResponse::setNoCompression()` overrides everything (Accept-Encoding, MIME, size). Use it for:

- endpoints where secrets sit next to reflected user input (**BREACH mitigation**)
- payloads where `Content-Encoding` is already set (the handler wrapped the body itself)
- any response the server should not re-wrap

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/account') {
        // contains a CSRF token + reflected search query — BREACH-sensitive
        $res->setNoCompression();
    }
    $res->json($payload);
});
```

The method is idempotent.

## Streaming

When the handler calls `HttpResponse::send($chunk)`, the compressing wrapper transparently kicks
in on the first call (if negotiation allowed it) and emits **one downstream chunk per source
chunk**, preserving framing efficiency for chunked H1 and H2 DATA frames.

## Inbound decoding

`Content-Encoding: gzip` / `br` / `zstd` (and the legacy `x-gzip`) on requests is decoded
transparently. `identity` is a no-op. An unknown coding → 413/415 (see below).

| Situation | Code |
|-----------|-----:|
| Unknown coding | 415 |
| Anti-bomb cap exceeded | 413 |
| Corrupt inflate | 400 |

Inside the handler, the already-decoded body is visible through
[`HttpRequest::getBody()`](/en/docs/reference/server/http-request.html#getbody).

## One-shot brotli

Since 0.6.3, the server uses `BrotliEncoderCompress()` for bodies of known size (size-hint
`BROTLI_PARAM_SIZE_HINT`): the encoder picks the correct ring-buffer and hash-table sizes up front,
instead of falling back to the streaming mode that targets unknown lengths. The streaming path
stays in use for chunked / unknown-length responses.

## Benchmarks

The C-side defaults are tuned for production (gzip 6, brotli 4). The author's bench harnesses use
`setCompressionLevel(1)` / `setBrotliLevel(1)` to match Swoole's `BrotliEncoderCompress` path.

## See also

- [`HttpServerConfig::setCompressionEnabled()`](/en/docs/reference/server/http-server-config.html#setcompressionenabled)
- [`HttpResponse::setNoCompression()`](/en/docs/reference/server/http-response.html#setnocompression)
- [Static files](/en/docs/server/static-files.html): precompressed sidecars (`.br`, `.gz`, `.zst`)
