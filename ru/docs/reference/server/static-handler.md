---
layout: docs
lang: ru
path_key: "/docs/reference/server/static-handler.html"
nav_active: docs
permalink: /ru/docs/reference/server/static-handler.html
page_title: "TrueAsync\\StaticHandler"
description: "TrueAsync\\StaticHandler — раздача статики prefix-mount без PHP-обработчика. Precompressed sidecars, ETag, Range, политики dotfile/symlink, open-file cache."
---

# TrueAsync\StaticHandler

(PHP 8.6+, true_async_server 0.6+)

Встроенный handler статических файлов (issue #13). Один экземпляр = один prefix-mount.
Attach'ится к серверу через [`HttpServer::addStaticHandler()`](/ru/docs/reference/server/http-server.html#addstatichandler).

Полностью в C: запросы не спавнят корутины и не заходят в PHP VM — файлы отдаются через libuv async
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

| Параметр | Требования |
|----------|------------|
| `$urlPrefix` | URL-префикс. Должен начинаться и заканчиваться `/`. Пример: `"/static/"`. |
| `$rootDirectory` | Абсолютный путь к директории на диске; canonicalize'ится на attach-time. |

## Index / fallthrough

### setIndexFiles

```php
public StaticHandler::setIndexFiles(string ...$files): static
```

Имена файлов, отдаваемых при request'е на directory-URL. Дефолт `["index.html"]`. Пустой список —
отключает index lookup.

### disableIndex

```php
public StaticHandler::disableIndex(): static
```

Эквивалент `setIndexFiles()`.

### setOnMissing

```php
public StaticHandler::setOnMissing(StaticOnMissing $mode): static
```

Что делать, если запрошенный путь не резолвится в обычный файл внутри root:

| Значение | Поведение |
|----------|-----------|
| `StaticOnMissing::NOT_FOUND` (дефолт) | 404 в C, запрос не попадает в PHP VM |
| `StaticOnMissing::NEXT` | Control возвращается dispatcher'у, спавнится обычный handler-корутина — запрос идёт в [`addHttpHandler()`](/ru/docs/reference/server/http-server.html#addhttphandler) |

## Precompressed sidecars

### enablePrecompressed

```php
public StaticHandler::enablePrecompressed(string ...$encodings): static
```

Включает выдачу precompressed-sidecar'ов (`main.css.br`, `main.css.gz`, `main.css.zst`), когда
клиент позволяет через `Accept-Encoding`. Аргументы — content-coding имена: `"br"`, `"gzip"`,
`"zstd"`. Неизвестные — `InvalidArgumentException` на setter.

### disablePrecompressed

```php
public StaticHandler::disablePrecompressed(): static
```

## Security

### setDotfilePolicy

```php
public StaticHandler::setDotfilePolicy(StaticDotfiles $policy): static
```

"Dotfile" — любой path-segment, начинающийся с `.`, включая `..` (последнее всегда отвергает
traversal guard, независимо от политики).

| | Поведение |
|---|---|
| `StaticDotfiles::DENY` (дефолт) | 404 на любой путь с dotfile-компонентом |
| `StaticDotfiles::ALLOW` | dotfiles обслуживаются как обычные файлы |
| `StaticDotfiles::IGNORE` | как будто файл не существует (passthrough по `StaticOnMissing`) |

### setSymlinkPolicy

```php
public StaticHandler::setSymlinkPolicy(StaticSymlinks $policy): static
```

| | Поведение |
|---|---|
| `StaticSymlinks::REJECT` (дефолт) | 404 на любой symlink на пути. `O_NOFOLLOW` + per-segment `lstat` — symlink никогда не traverse'ится |
| `StaticSymlinks::FOLLOW` | symlinks следуются; post-`realpath()` target должен оставаться внутри root |
| `StaticSymlinks::OWNER_MATCH` | follow только если symlink и target принадлежат одному uid |

### hide

```php
public StaticHandler::hide(string ...$globs): static
```

Glob-patterns: matching paths возвращают 404 независимо от существования. Сравнение —
**относительно root**, разделитель `/`.

## Cache / headers

### setEtagEnabled

```php
public StaticHandler::setEtagEnabled(bool $enabled): static
```

Toggle weak ETag (дефолт `true`). При включении каждый 200 несёт `ETag: W/"…"` из
`(mtime_ns, size, ino)`; `If-None-Match` / `If-Modified-Since` дают 304.

### setCacheControl

```php
public StaticHandler::setCacheControl(string $value): static
```

Литеральный `Cache-Control`. Пустая строка — подавить emission.

### setOpenFileCache

```php
public StaticHandler::setOpenFileCache(int $maxEntries, int $ttlSeconds = 60): static
```

nginx-style open-file cache: хранит resolved path, fstat-метаданные, MIME, ETag и Last-Modified
для последних N запросов. В пределах `ttlSeconds` повторные запросы хитят кэш и пропускают
realpath/stat/MIME-walk.

Выключен по умолчанию. Выигрывает на cold-dentry / большой docroot / сетевой FS. На warm-dentry
локального диска syscalls и так под µs — оверхэд HashTable-lookup съест выигрыш.

`$maxEntries == 0` — выключить.

### disableOpenFileCache

```php
public StaticHandler::disableOpenFileCache(): static
```

Сахар для `setOpenFileCache(0)`.

### setHeader

```php
public StaticHandler::setHeader(string $name, string $value): static
```

Фиксированный заголовок, оцениваемый один раз на attach-time. Эмитится на каждом 200 и на 304 (кроме
`Content-*` заголовков по RFC 9110 §15.4.5).

## Directory listing

### setBrowseEnabled

```php
public StaticHandler::setBrowseEnabled(bool $enabled): static
```

Toggle HTML-listing при request'е на directory без index. Дефолт `false`.

> Зарезервировано под PR #6 — сейчас no-op, принимается на setter без эффекта.

## MIME

### setMimeType

```php
public StaticHandler::setMimeType(string $extension, string $contentType): static
```

Override `Content-Type` для файлов с указанным расширением. Extension — lowercased, без leading dot.

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

`true` после attach в server через `addStaticHandler()`. Locked-handler отвергает все сеттеры с
runtime-exception'ом.

## Enums

См. отдельные страницы:

- [`StaticOnMissing`](/ru/docs/reference/server/static-on-missing.html)
- [`StaticDotfiles`](/ru/docs/reference/server/static-dotfiles.html)
- [`StaticSymlinks`](/ru/docs/reference/server/static-symlinks.html)

(Все три — `enum: int` под namespace `TrueAsync`.)

## Пример

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

## См. также

- [Статика и sendFile](/ru/docs/server/static-files.html)
- [`HttpServer::addStaticHandler()`](/ru/docs/reference/server/http-server.html#addstatichandler)
- [`HttpResponse::sendFile()`](/ru/docs/reference/server/http-response.html#sendfile)
