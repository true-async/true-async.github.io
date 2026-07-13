---
layout: tutorial
lang: en
path_key: "/tutors-server/05-static.html"
nav_active: docs
permalink: /en/tutors-server/05-static.html
page_title: "Static Files"
description: "StaticHandler: serving files without a PHP coroutine, caching, and security policies."
---

# Static Files

`ProfileService` has grown a frontend. HTML, CSS, scripts, avatars,
the usual. They used to be served by nginx, but we ceremonially saw
nginx off in the first chapter. Who serves them now?

The first impulse is understandable: write a handler that opens files
by URL. Stop. Consider what that means: thousands of requests for the
logo a day, and for each one a coroutine, entry into PHP, `fopen`,
exit. PHP here does nothing that requires PHP.

The server solves this radically. A static route is served entirely in
C. A request to it never enters PHP at all:

```php
use TrueAsync\StaticHandler;

$server->addStaticHandler(
    new StaticHandler('/assets/', '/var/www/profile/public')
);
```

A URL prefix, a directory on disk, done. `GET /assets/css/app.css`
turns into an asynchronous read of the file straight into the socket,
through libuv, past PHP. The handlers from previous chapters keep
receiving everything else. There can be several mounts, and matches
are searched in registration order. All the HTTP etiquette from
`sendFile` is here too: `Content-Type`, `ETag` with 304, resumed
downloads via `Range`.

## Configuring a Mount

`StaticHandler` is configured with a chain, before it's attached to
the server:

```php
$static = (new StaticHandler('/assets/', '/var/www/profile/public'))
    ->setCacheControl('public, max-age=86400')
    ->enablePrecompressed('br', 'zstd', 'gzip')
    ->hide('*.map', 'drafts/**')
    ->setOnMissing(StaticOnMissing::NEXT);

$server->addStaticHandler($static);
```

Let's go line by line.

**`setCacheControl`** — the caching header on every response. Paired
with the `ETag` that's on by default, the browser re-downloads a file
only when the file has actually changed.

**`enablePrecompressed`** — my favorite item. If `app.css.br` sits next
to `app.css`, a client with a suitable `Accept-Encoding` gets the
ready-made compressed file. Think about the economics: you compress
once at the frontend build stage, at the most expensive and highest
quality level, and serve it a million times without spending a single
cycle on compression.

**`hide`** — globs that get a 404 regardless of whether the file
exists. Source maps and drafts won't go out.

**`setOnMissing(NEXT)`** — the fate of requests that miss a file. By
default a miss answers 404 straight from C. `NEXT` instead passes the
request on, to an ordinary PHP handler. Why? SPA. The file
`/assets/app.js` is served from disk, while a nonexistent
`/assets/whatever` falls through into the application, which answers
with its own `index.html`.

After `addStaticHandler` the object is locked: the server has already
built its hot-path structures from it. An attempt to touch a setter
after that is an exception.

## Secure by Default

A small digression. Serving files by URL is historically one of the
most bountiful holes in web servers. `../../etc/passwd` in the address
bar is a trick older than many readers of this chapter.

So the out-of-the-box policy is paranoid. Requests with `..` get a
404. Paths through files with a leading dot get a 404: neither `.env`
nor `.git` will leak, even if they accidentally end up in the
directory. Symbolic links aren't dereferenced at all: the file must
physically lie inside the mount root, and no symlink can drag it out.

All of this can be relaxed deliberately (`setDotfilePolicy`,
`setSymlinkPolicy`), but the defaults are chosen so that the "plug it
in and forget" option is safe.

## When There Are a Lot of Files

For hot mounts there's one more lever:

```php
$static->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

The cache remembers the resolved path, metadata, and headers of the
most recent files and cuts the syscall walk on repeat requests. On a
large directory or a network filesystem it's noticeable. On a small
local site it's not, which is why it's off by default.

That's the whole chapter, I promised a short one. Static flies past
PHP, and PHP gets on with its work. And now that the service has a
face, it's time to bring it to life. Remember the progress bar from
the very first chapter of the first series, the one drawn in the
terminal? It's about to move into the browser. And the server itself
will draw it.
