---
layout: docs
lang: uk
path_key: "/docs/server/static-files.html"
nav_active: docs
permalink: /uk/docs/server/static-files.html
page_title: "TrueAsync Server: статика і sendFile"
description: "StaticHandler: вбудована роздача статики без PHP-обробника. sendFile(): надсилання файлу з обробника. Precompressed sidecars, ETag, Range, security policies."
---

# Статика і sendFile

(PHP 8.6+, true_async_server 0.6+)

У TrueAsync Server два незалежних механізми доставки файлів:

1. **`StaticHandler`** — окремий prefix-mount, обслуговується **повністю в C**, без спавна корутини
   і без заходу в PHP VM.
2. **`HttpResponse::sendFile()`** — handler-driven доставка. PHP-код прийняв рішення
   (auth, ACL, генерація імені), сервер забирає з диска і надсилає.

Обидва використовують ту саму FSM у рушії (MIME, ETag, IMF-date, Range, conditional GET,
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

Запити до `/static/...` обслуговує `StaticHandler` (жодного PHP-обробника не викликається).
Усе інше йде у звичайний `addHttpHandler`.

Множинні mount'и матчаться **в порядку реєстрації**. Після attach `StaticHandler` блокується;
будь-які сетери на ньому кидають `HttpServerRuntimeException`.

### Index і fallthrough

```php
$static
    ->setIndexFiles('index.html', 'index.htm')   // що віддавати на directory URL
    ->disableIndex()                              // або взагалі без index lookup
    ->setOnMissing(StaticOnMissing::NEXT);        // → віддати в PHP-handler
```

**`StaticOnMissing`** визначає, що робити, якщо файл не знайдено всередині root:

| Значення | Поведінка |
|----------|-----------|
| `NOT_FOUND` (дефолт) | 404 в C, запит не потрапляє в PHP VM |
| `NEXT` | Control передається диспетчеру, спавниться звичайна handler-корутина |

> Запит на directory URL без trailing slash, у якого всі index-файли 404'яться, повертає 404.
> 301 redirect, який роблять nginx/Apache, цей handler **не** емітує. Якщо ваш деплой покладається
> на catch-all на directory paths, вимкніть index lookup: `setIndexFiles([])` / `disableIndex()`.

### Precompressed sidecars

```php
$static->enablePrecompressed('br', 'gzip', 'zstd');
```

Коли клієнт шле `Accept-Encoding: br, gzip`, handler шукає `main.css.br` поряд з `main.css` і віддає
sidecar напряму, без CPU-витрат на encode. Підтримувані імена: `"br"`, `"gzip"`, `"zstd"`.
Невідоме ім'я кидає `InvalidArgumentException` на setter.

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

| | Поведінка |
|---|---|
| `DENY` (дефолт) | 404 на будь-який шлях, що містить segment, який починається з `.` (включно з `..`) |
| `ALLOW` | dotfiles обслуговуються як звичайні файли |
| `IGNORE` | ніби файл не існує (passthrough за `StaticOnMissing`) |

**`StaticSymlinks`**:

| | Поведінка |
|---|---|
| `REJECT` (дефолт) | 404 на будь-який symlink на шляху. `O_NOFOLLOW` + per-segment `lstat`, symlink ніколи не traverse'иться |
| `FOLLOW` | symlinks розкручуються; пост-`realpath()` target має лишатися всередині root |
| `OWNER_MATCH` | follow лише якщо symlink і target належать одному uid |

`hide($glob, ...)` задає glob-pattern для 404 незалежно від існування файлу. Порівняння
йде **відносно root**, розділювач `/`.

### Cache / headers

```php
$static
    ->setEtagEnabled(true)                                   // W/"…" з (mtime_ns, size, ino)
    ->setCacheControl('public, max-age=31536000, immutable')
    ->setHeader('Strict-Transport-Security', 'max-age=63072000')
    ->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

**Open-file cache** (nginx-style): зберігає resolved path, fstat-метадані, MIME, ETag, Last-Modified
для останніх N запитів. Усередині `ttlSeconds` повторні запити хітять кеш і пропускають
realpath/stat/MIME-walk.

Вимкнено за замовчуванням. Виграє на cold-dentry / великий docroot / мережева FS. На warm-dentry
локального диска syscalls і так під µs, тому оверхед HashTable-lookup з'їсть виграш.

### MIME override

```php
$static->setMimeType('webmanifest', 'application/manifest+json');
```

Extension без leading dot, lowercased.

### Продуктивність

З 0.4.0 у рушії:

- **Inline `open(2)`/`fstat(2)`** (issue #13): без futex-round-trip через libuv thread pool.
  Wins: H1 tiny 256B 19k → 35k req/s, H1 304 If-None-Match 24k → 123k req/s.
- **Small-file fast path** (≤ 64 KiB): файл слурпається в `zend_string` і віддається одним
  `writev(headers + body)`. Wins: H1 tiny → 103k req/s (×2.9), H2 tiny → 154k (×4.4).
- Файли > 64 KiB ідуть через sendfile.

## sendFile з обробника

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

`sendFile()` **записує** path + options на response і **відразу повертається**. Передача файлу
йде в dispose-фазі через ту саму FSM, що і `StaticHandler`. Compression middleware для sendFile
обходиться (своя delivery pipeline).

Після `sendFile()` response **запечатано**: `setHeader` / `setStatus*` / `write` / `send` / `setBody` /
`json` / `html` / `redirect` / `end` і повторний `sendFile()` кидають `HttpServerRuntimeException`.

Шлях вважається **довіреним**: handler сам прийняв рішення про доступ. Помилки open/fstat (`ENOENT`,
`EACCES`, oversize, non-regular) дають 500, бо заголовки ще не на дроті.

### SendFileOptions

`final readonly class` з named-args у конструкторі:

| Поле | Тип | Дефолт | Що робить |
|------|-----|--------|-----------|
| `contentType` | `?string` | `null` | override MIME; `null` означає авто з розширення |
| `disposition` | `SendFileDisposition` | `INLINE` | `INLINE` або `ATTACHMENT` |
| `downloadName` | `?string` | `null` | ім'я файлу для `Content-Disposition: attachment; filename=...` |
| `cacheControl` | `?string` | `null` | літерально в `Cache-Control` |
| `etag` | `bool` | `true` | емітувати weak ETag |
| `lastModified` | `bool` | `true` | емітувати `Last-Modified` |
| `acceptRanges` | `bool` | `true` | підтримка `Range:` |
| `precompressed` | `bool` | `true` | шукати `.br`/`.gz`/`.zst` sidecar |
| `conditional` | `bool` | `true` | If-Modified-Since / If-None-Match → 304 |
| `deleteAfterSend` | `bool` | `false` | unlink після успішного надсилання (для one-shot завантажень) |
| `status` | `?int` | `null` | override HTTP-статусу (наприклад, для CDN-respond з 200) |

> HTTP/3 path для `sendFile()` поки в роботі: dispose-хук віддає 500 на H3.

## Див. також

- [`TrueAsync\StaticHandler`](/uk/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/uk/docs/reference/server/send-file-options.html)
- [`HttpResponse::sendFile()`](/uk/docs/reference/server/http-response.html#sendfile)
- [Стиснення](/uk/docs/server/compression.html)
