---
layout: docs
lang: ru
path_key: "/docs/server/static-files.html"
nav_active: docs
permalink: /ru/docs/server/static-files.html
page_title: "TrueAsync Server: статика и sendFile"
description: "StaticHandler: встроенная раздача статики без PHP-обработчика. sendFile(): отправка файла из handler. Precompressed sidecars, ETag, Range, security policies."
---

# Статика и sendFile

(PHP 8.6+, true_async_server 0.6+)

В TrueAsync Server два независимых механизма доставки файлов:

1. **`StaticHandler`** — отдельный prefix-mount, обслуживается **полностью в C**, без спавна корутины
   и без захода в PHP VM.
2. **`HttpResponse::sendFile()`** — handler-driven доставка. PHP-код принял решение
   (auth, ACL, генерация имени), сервер забирает с диска и отправляет.

Оба используют одну и ту же FSM в движке (MIME, ETag, IMF-date, Range, conditional GET,
precompressed sidecars).

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

Запросы к `/static/...` обслуживает `StaticHandler` (никакого PHP-обработчика не вызывается).
Всё остальное идёт в обычный `addHttpHandler`.

Множественные mount'ы матчатся **в порядке регистрации**. После attach `StaticHandler` блокируется;
любые сеттеры на нём бросают `HttpServerRuntimeException`.

### Index и fallthrough

```php
$static
    ->setIndexFiles('index.html', 'index.htm')   // что отдавать на directory URL
    ->disableIndex()                              // или вообще без index lookup
    ->setOnMissing(StaticOnMissing::NEXT);        // → отдать в PHP-handler
```

**`StaticOnMissing`** определяет, что делать, если файл не найден внутри root:

| Значение | Поведение |
|----------|-----------|
| `NOT_FOUND` (дефолт) | 404 в C, запрос не попадает в PHP VM |
| `NEXT` | Control передаётся диспетчеру, спавнится обычный handler-корутина |

> Запрос на directory URL без trailing slash, у которого все index-файлы 404'ятся, возвращает 404.
> 301 redirect, который делают nginx/Apache, этот handler **не** эмитит. Если ваш деплой полагается
> на catch-all на directory paths, отключите index lookup: `setIndexFiles([])` / `disableIndex()`.

### Precompressed sidecars

```php
$static->enablePrecompressed('br', 'gzip', 'zstd');
```

Когда клиент шлёт `Accept-Encoding: br, gzip`, handler ищет `main.css.br` рядом с `main.css` и отдаёт
sidecar напрямую, без CPU-затрат на encode. Поддерживаемые имена: `"br"`, `"gzip"`, `"zstd"`.
Неизвестное имя бросает `InvalidArgumentException` на setter.

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

| | Поведение |
|---|---|
| `DENY` (дефолт) | 404 на любой путь, содержащий segment начинающийся с `.` (включая `..`) |
| `ALLOW` | dotfiles обслуживаются как обычные файлы |
| `IGNORE` | как если бы файл не существовал (passthrough по `StaticOnMissing`) |

**`StaticSymlinks`**:

| | Поведение |
|---|---|
| `REJECT` (дефолт) | 404 на любой symlink на пути. `O_NOFOLLOW` + per-segment `lstat`, symlink никогда не traverse'ится |
| `FOLLOW` | symlinks следуются; пост-`realpath()` target должен оставаться внутри root |
| `OWNER_MATCH` | follow только если symlink и target принадлежат одному uid |

`hide($glob, ...)` задаёт glob-pattern для 404'а независимо от существования файла. Сравнение
идёт **относительно root**, разделитель `/`.

### Cache / headers

```php
$static
    ->setEtagEnabled(true)                                   // W/"…" из (mtime_ns, size, ino)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

**Open-file cache** (nginx-style): хранит resolved path, fstat-метаданные, MIME, ETag, Last-Modified
для последних N запросов. Внутри `ttlSeconds` повторные запросы хитят кэш и пропускают
realpath/stat/MIME-walk.

Выключен по умолчанию. Выигрывает на cold-dentry / большой docroot / сетевой FS. На warm-dentry
локального диска syscalls и так под µs, поэтому оверхэд HashTable-lookup съест выигрыш.

### MIME override

```php
$static->setMimeType('webmanifest', 'application/manifest+json');
```

Extension без leading dot, lowercased.

### Производительность

С 0.4.0 в движке:

- **Inline `open(2)`/`fstat(2)`** (issue #13): без futex-round-trip через libuv thread pool.
  Wins: H1 tiny 256B 19k → 35k req/s, H1 304 If-None-Match 24k → 123k req/s.
- **Small-file fast path** (≤ 64 KiB): файл слурпается в `zend_string` и отдаётся одним
  `writev(headers + body)`. Wins: H1 tiny → 103k req/s (×2.9), H2 tiny → 154k (×4.4).
- Файлы > 64 KiB идут через sendfile.

## sendFile из handler

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

`sendFile()` **записывает** path + options на response и **сразу возвращается**. Передача файла
идёт в dispose-фазе через ту же FSM, что и `StaticHandler`. Compression middleware для sendFile
обходится (своя delivery pipeline).

После `sendFile()` response **запечатан**: `setHeader` / `setStatus*` / `write` / `send` / `setBody` /
`json` / `html` / `redirect` / `end` и повторный `sendFile()` бросают `HttpServerRuntimeException`.

Путь считается **доверенным**: handler сам принял решение о доступе. Ошибки open/fstat (`ENOENT`,
`EACCES`, oversize, non-regular) дают 500, потому что заголовки ещё не на проводе.

### SendFileOptions

`final readonly class` с named-args в конструкторе:

| Поле | Тип | Дефолт | Что делает |
|------|-----|--------|------------|
| `contentType` | `?string` | `null` | override MIME; `null` означает авто из расширения |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` или `ATTACHMENT` |
| `downloadName` | `?string` | `null` | имя файла для `Content-Disposition: attachment; filename=...` |
| `cacheControl` | `?string` | `null` | литерально в `Cache-Control` |
| `etag` | `bool` | `true` | эмитить weak ETag |
| `lastModified` | `bool` | `true` | эмитить `Last-Modified` |
| `acceptRanges` | `bool` | `true` | поддержка `Range:` |
| `precompressed` | `bool` | `true` | искать `.br`/`.gz`/`.zst` sidecar |
| `conditional` | `bool` | `true` | If-Modified-Since / If-None-Match → 304 |
| `deleteAfterSend` | `bool` | `false` | unlink после успешной отправки (для one-shot скачиваний) |
| `status` | `?int` | `null` | override HTTP-статуса (например, для CDN-respond с 200) |

> HTTP/3 path для `sendFile()` пока в работе: dispose-хук отдаёт 500 на H3.

## См. также

- [`TrueAsync\StaticHandler`](/ru/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/ru/docs/reference/server/send-file-options.html)
- [`HttpResponse::sendFile()`](/ru/docs/reference/server/http-response.html#sendfile)
- [Компрессия](/ru/docs/server/compression.html)
