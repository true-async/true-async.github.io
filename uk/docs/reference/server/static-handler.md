---
layout: docs
lang: uk
path_key: "/docs/reference/server/static-handler.html"
nav_active: docs
permalink: /uk/docs/reference/server/static-handler.html
page_title: "TrueAsync\\StaticHandler"
description: "TrueAsync\\StaticHandler — роздача статики prefix-mount без PHP-обробника. Precompressed sidecars, ETag, Range, політики dotfile/symlink, open-file cache."
---

# TrueAsync\StaticHandler

(PHP 8.6+, true_async_server 0.6+)

Вбудований handler статичних файлів (issue #13). Один екземпляр = один prefix-mount.
Attach'ється до сервера через [`HttpServer::addStaticHandler()`](/uk/docs/reference/server/http-server.html#addstatichandler).

Повністю в C: запити не спавнять корутини і не заходять в PHP VM — файли віддаються через libuv async
fs ops прямо в response-stream.

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

## Конструктор

### __construct

```php
public StaticHandler::__construct(string $urlPrefix, string $rootDirectory)
```

| Параметр | Вимоги |
|----------|--------|
| `$urlPrefix` | URL-префікс. Має починатися і закінчуватися `/`. Приклад: `"/static/"`. |
| `$rootDirectory` | Абсолютний шлях до директорії на диску; canonicalize'ється на attach-time. |

## Index / fallthrough

### setIndexFiles

```php
public StaticHandler::setIndexFiles(string ...$files): static
```

Імена файлів, що віддаються при request'і на directory-URL. Дефолт `["index.html"]`. Порожній список —
вимикає index lookup.

### disableIndex

```php
public StaticHandler::disableIndex(): static
```

Еквівалент `setIndexFiles()`.

### setOnMissing

```php
public StaticHandler::setOnMissing(StaticOnMissing $mode): static
```

Що робити, якщо запитуваний шлях не резолвиться у звичайний файл всередині root:

| Значення | Поведінка |
|----------|-----------|
| `StaticOnMissing::NOT_FOUND` (дефолт) | 404 в C, запит не потрапляє в PHP VM |
| `StaticOnMissing::NEXT` | Control повертається dispatcher'у, спавниться звичайна handler-корутина — запит іде в [`addHttpHandler()`](/uk/docs/reference/server/http-server.html#addhttphandler) |

## Precompressed sidecars

### enablePrecompressed

```php
public StaticHandler::enablePrecompressed(string ...$encodings): static
```

Вмикає видачу precompressed-sidecar'ів (`main.css.br`, `main.css.gz`, `main.css.zst`), коли
клієнт дозволяє через `Accept-Encoding`. Аргументи — content-coding імена: `"br"`, `"gzip"`,
`"zstd"`. Невідомі — `InvalidArgumentException` на setter.

### disablePrecompressed

```php
public StaticHandler::disablePrecompressed(): static
```

## Security

### setDotfilePolicy

```php
public StaticHandler::setDotfilePolicy(StaticDotfiles $policy): static
```

"Dotfile" — будь-який path-segment, що починається з `.`, включно з `..` (останнє завжди відкидає
traversal guard, незалежно від політики).

| | Поведінка |
|---|---|
| `StaticDotfiles::DENY` (дефолт) | 404 на будь-який шлях з dotfile-компонентом |
| `StaticDotfiles::ALLOW` | dotfiles обслуговуються як звичайні файли |
| `StaticDotfiles::IGNORE` | ніби файл не існує (passthrough за `StaticOnMissing`) |

### setSymlinkPolicy

```php
public StaticHandler::setSymlinkPolicy(StaticSymlinks $policy): static
```

| | Поведінка |
|---|---|
| `StaticSymlinks::REJECT` (дефолт) | 404 на будь-який symlink на шляху. `O_NOFOLLOW` + per-segment `lstat` — symlink ніколи не traverse'иться |
| `StaticSymlinks::FOLLOW` | symlinks розкручуються; post-`realpath()` target має лишатися всередині root |
| `StaticSymlinks::OWNER_MATCH` | follow лише якщо symlink і target належать одному uid |

### hide

```php
public StaticHandler::hide(string ...$globs): static
```

Glob-patterns: matching paths повертають 404 незалежно від існування. Порівняння —
**відносно root**, розділювач `/`.

## Cache / headers

### setEtagEnabled

```php
public StaticHandler::setEtagEnabled(bool $enabled): static
```

Toggle weak ETag (дефолт `true`). При увімкненні кожен 200 несе `ETag: W/"…"` з
`(mtime_ns, size, ino)`; `If-None-Match` / `If-Modified-Since` дають 304.

### setCacheControl

```php
public StaticHandler::setCacheControl(string $value): static
```

Літеральний `Cache-Control`. Порожній рядок — придушити emission.

### setOpenFileCache

```php
public StaticHandler::setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static
```

nginx-style open-file cache: зберігає resolved path, fstat-метадані, MIME, ETag і Last-Modified
для останніх N запитів. У межах `ttlSeconds` повторні запити хітять кеш і пропускають
realpath/stat/MIME-walk.

Вимкнено за замовчуванням. Виграє на cold-dentry / великий docroot / мережева FS. На warm-dentry
локального диска syscalls і так під µs — оверхед HashTable-lookup з'їсть виграш.

`$maxEntries == 0` — вимкнути.

### disableOpenFileCache

```php
public StaticHandler::disableOpenFileCache(): static
```

Сахар для `setOpenFileCache(0)`.

### setHeader

```php
public StaticHandler::setHeader(string $name, string $value): static
```

Фіксований заголовок, що оцінюється один раз на attach-time. Емітується на кожному 200 і на 304 (крім
`Content-*` заголовків за RFC 9110 §15.4.5).

## Directory listing

### setBrowseEnabled

```php
public StaticHandler::setBrowseEnabled(bool $enabled): static
```

Toggle HTML-listing при request'і на directory без index. Дефолт `false`.

> Зарезервовано під PR #6 — зараз no-op, приймається на setter без ефекту.

## MIME

### setMimeType

```php
public StaticHandler::setMimeType(string $extension, string $contentType): static
```

Override `Content-Type` для файлів із заданим розширенням. Extension — lowercased, без leading dot.

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

`true` після attach у сервер через `addStaticHandler()`. Locked-handler відкидає всі сетери з
runtime-exception'ом.

## Enums

Див. окремі сторінки:

- [`StaticOnMissing`](/uk/docs/reference/server/static-on-missing.html)
- [`StaticDotfiles`](/uk/docs/reference/server/static-dotfiles.html)
- [`StaticSymlinks`](/uk/docs/reference/server/static-symlinks.html)

(Усі три — `enum: int` під namespace `TrueAsync`.)

## Приклад

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

## Див. також

- [Статика і sendFile](/uk/docs/server/static-files.html)
- [`HttpServer::addStaticHandler()`](/uk/docs/reference/server/http-server.html#addstatichandler)
- [`HttpResponse::sendFile()`](/uk/docs/reference/server/http-response.html#sendfile)
