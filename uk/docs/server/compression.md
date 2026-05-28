---
layout: docs
lang: uk
path_key: "/docs/server/compression.html"
nav_active: docs
permalink: /uk/docs/server/compression.html
page_title: "TrueAsync Server: HTTP-стиснення"
description: "gzip, Brotli і zstd у TrueAsync Server: переговори Accept-Encoding, MIME-фільтр, ліміти, BREACH-захист, декодинг вхідних тіл."
---

# HTTP-стиснення

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server підтримує три кодеки: **gzip**, **Brotli (br)** і **zstd**, однаково у всіх
протоколах: HTTP/1.1, HTTP/2 і HTTP/3.

## Backends

- **gzip** — `zlib-ng` (бажано, ~2–4× швидше на тому самому compression level) або системний
  `zlib` як fallback. Той самий код, перемикання через макрошар `zng_*` ↔ `*`.
- **Brotli** — `libbrotli`. Активний лише якщо `--enable-brotli` знайшов бібліотеку.
- **zstd** — `libzstd`. Активний лише якщо `--enable-zstd` знайшов бібліотеку.

Що вкомпільовано, дізнаємось у runtime:

```php
TrueAsync\HttpServerConfig::getSupportedEncodings();
// → ["zstd", "br", "gzip", "identity"]
```

Список завжди містить `"identity"`; `"gzip"` з'являється при успішному `--enable-http-compression`;
`"br"`/`"zstd"` з'являються за наявності відповідної бібліотеки на configure-time.

## Server-side preference

Порядок переваги сервера: **`zstd > gzip > brotli > identity`**.

> **Чому gzip попереду brotli?** Brotli-енкодер не вміє переуживати стан
> (`libbrotli` не має публічного reset API). Поки не приїде arena-аллокатор (TODO Step 4),
> gzip'овий `deflateReset` дає кращий default. Клієнти, що явно віддають перевагу brotli через q-values
> (`br;q=1.0, gzip;q=0.5`), як і раніше отримують brotli.

## Переговори (RFC 9110 §12.5.3)

Сервер парсить клієнтський `Accept-Encoding`: q-values, `identity;q=0`, `*;q=0`. Якщо заголовок
**відсутній**, відповідь іде без стиснення (identity-only). Це збігається з поведінкою nginx і
безпечніше за строге прочитання RFC.

Умови **пропуску** стиснення:

- статус `1xx`, `204`, `304`
- метод `HEAD`
- відповідь з `Range`
- обробник сам виставив `Content-Encoding`
- MIME поза whitelist
- тіло менше за поріг

## Конфігурація

```php
use TrueAsync\HttpServerConfig;

$config
    ->setCompressionEnabled(true)              // master switch (default: true)
    ->setCompressionLevel(6)                   // gzip 1..9, default 6
    ->setBrotliLevel(4)                        // 0..11, default 4
    ->setZstdLevel(3)                          // 1..22, default 3
    ->setCompressionMinSize(1024)              // не стискати тіла < 1 KiB
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

### Рівні стиснення

| Кодек | Діапазон | Дефолт | Зауваження |
|-------|---------:|-------:|------------|
| gzip | 1..9 | 6 | класична zlib-семантика |
| brotli | 0..11 | 4 | quality 11 ≈ 50× повільніше за quality 4 без істотного виграшу |
| zstd | 1..22 | 3 | дефолт самої команди zstd: краще співвідношення і швидше за gzip-6 |

### MIME-whitelist

`setCompressionMimeTypes()` **повністю замінює** список (nginx `gzip_types`-семантика).
Записи нормалізуються на setter-time: параметри (`; charset=...`) обрізаються, пробіли trim'ляться,
все в lowercase. Runtime-порівняння лишається точним і zero-allocation.

### Анти-zip-bomb

`setRequestMaxDecompressedSize($bytes)` задає ліміт на **розпакований** розмір вхідного тіла.
За замовчуванням 10 MiB. При перевищенні повертається 413. `0` вимикає ліміт, але виставляти його
потрібно явно: implicit-unlimited шляху немає.

## Per-response opt-out

`HttpResponse::setNoCompression()` перебиває все (Accept-Encoding, MIME, розмір). Застосовуйте на:

- ендпоїнтах, де секрети змішані з відображеним user-input (**BREACH mitigation**)
- payload'ах з уже виставленим `Content-Encoding` (handler сам поклав)
- будь-яких відповідях, які сервер не має обгортати

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/account') {
        // містить CSRF-токен + відображений пошуковий запит, BREACH-чутливо
        $res->setNoCompression();
    }
    $res->json($payload);
});
```

Метод ідемпотентний.

## Streaming

Коли обробник викликає `HttpResponse::send($chunk)`, стискаючий wrapper вмикається прозоро
на першому виклику (якщо negotiation дозволила) і видає **один downstream-чанк на кожен source-чанк**,
зберігаючи ефективність фреймінгу на chunked H1 і H2 DATA-фреймах.

## Вхідний декодинг

`Content-Encoding: gzip` / `br` / `zstd` (і legacy `x-gzip`) на запитах декодується прозоро.
`identity` означає no-op. Невідомий coding → 413/415 (див. нижче).

| Ситуація | Код |
|----------|----:|
| Невідомий coding | 415 |
| Перевищено anti-bomb cap | 413 |
| Биті inflate-дані | 400 |

В обробнику вже декодоване тіло видно через
[`HttpRequest::getBody()`](/uk/docs/reference/server/http-request.html#getbody).

## One-shot brotli

З 0.6.3 сервер використовує `BrotliEncoderCompress()` для тіл відомого розміру (size-hint
`BROTLI_PARAM_SIZE_HINT`): енкодер одразу обирає коректний розмір ring-buffer і хеш-таблиць
замість потокового streaming-режиму, розрахованого на довільну довжину. Streaming-шлях лишається
для chunked / unknown-length відповідей.

## Бенчмарки

C-side дефолти виставлені під production (gzip 6, brotli 4). Бенч-виклики у автора використовують
`setCompressionLevel(1)` / `setBrotliLevel(1)` для еквівалентності Swoole'ському
`BrotliEncoderCompress`-шляху.

## Див. також

- [`HttpServerConfig::setCompressionEnabled()`](/uk/docs/reference/server/http-server-config.html#setcompressionenabled)
- [`HttpResponse::setNoCompression()`](/uk/docs/reference/server/http-response.html#setnocompression)
- [Статичні файли](/uk/docs/server/static-files.html): precompressed sidecars (`.br`, `.gz`, `.zst`)
