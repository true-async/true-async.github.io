---
layout: docs
lang: ru
path_key: "/docs/server/compression.html"
nav_active: docs
permalink: /ru/docs/server/compression.html
page_title: "TrueAsync Server: HTTP-компрессия"
description: "gzip, Brotli и zstd в TrueAsync Server: переговоры Accept-Encoding, MIME-фильтр, лимиты, BREACH-защита, декодинг входящих тел."
---

# HTTP-компрессия

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server поддерживает три кодека: **gzip**, **Brotli (br)** и **zstd**, единообразно во всех
протоколах: HTTP/1.1, HTTP/2 и HTTP/3.

## Backends

- **gzip** — `zlib-ng` (предпочтительно, ~2–4× быстрее на той же compression level) или системный
  `zlib` как fallback. Один и тот же код, переключение через макрослой `zng_*` ↔ `*`.
- **Brotli** — `libbrotli`. Активен только если `--enable-brotli` нашёл библиотеку.
- **zstd** — `libzstd`. Активен только если `--enable-zstd` нашёл библиотеку.

Что вкомпилировано, узнаётся в рантайме:

```php
TrueAsync\HttpServerConfig::getSupportedEncodings();
// → ["zstd", "br", "gzip", "identity"]
```

Список всегда содержит `"identity"`; `"gzip"` появляется при успешном `--enable-http-compression`;
`"br"`/`"zstd"` появляются при наличии соответствующей библиотеки на configure-time.

## Server-side preference

Порядок предпочтения сервера: **`zstd > gzip > brotli > identity`**.

> **Почему gzip впереди brotli?** Brotli-енкодер не умеет переиспользовать состояние
> (`libbrotli` не имеет публичного reset API). Пока не приедет arena-аллокатор (TODO Step 4),
> gzip-овский `deflateReset` даёт лучший default. Клиенты, явно предпочитающие brotli через q-values
> (`br;q=1.0, gzip;q=0.5`), по-прежнему получают brotli.

## Переговоры (RFC 9110 §12.5.3)

Сервер парсит клиентский `Accept-Encoding`: q-values, `identity;q=0`, `*;q=0`. Если заголовок
**отсутствует**, ответ уходит без сжатия (identity-only). Это совпадает с поведением nginx и
безопаснее строгого прочтения RFC.

Условия **пропуска** сжатия:

- статус `1xx`, `204`, `304`
- метод `HEAD`
- ответ с `Range`
- обработчик сам выставил `Content-Encoding`
- MIME вне whitelist
- тело меньше порога

## Конфигурация

```php
use TrueAsync\HttpServerConfig;

$config
    ->setCompressionEnabled(true)              // master switch (default: true)
    ->setCompressionLevel(6)                   // gzip 1..9, default 6
    ->setBrotliLevel(4)                        // 0..11, default 4
    ->setZstdLevel(3)                          // 1..22, default 3
    ->setCompressionMinSize(1024)              // не сжимать тела < 1 KiB
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

### Уровни сжатия

| Кодек | Диапазон | Дефолт | Замечания |
|-------|---------:|-------:|-----------|
| gzip | 1..9 | 6 | классическая zlib-семантика |
| brotli | 0..11 | 4 | quality 11 ≈ 50× медленнее quality 4 без существенного выигрыша |
| zstd | 1..22 | 3 | дефолт самой команды zstd: лучшее отношение и быстрее gzip-6 |

### MIME-whitelist

`setCompressionMimeTypes()` **полностью заменяет** список (nginx `gzip_types`-семантика).
Записи нормализуются на setter-time: параметры (`; charset=...`) обрезаются, пробелы trim'ятся,
всё в lowercase. Runtime-сравнение остаётся точным и zero-allocation.

### Анти-zip-bomb

`setRequestMaxDecompressedSize($bytes)` задаёт лимит на **раздекодированный** размер входящего тела.
По умолчанию 10 MiB. При превышении возвращается 413. `0` отключает лимит, но выставлять его нужно
явно: implicit-unlimited пути нет.

## Per-response opt-out

`HttpResponse::setNoCompression()` перебивает всё (Accept-Encoding, MIME, размер). Применяйте на:

- эндпоинтах, где секреты смешаны с отражённым user-input (**BREACH mitigation**)
- payload'ах с уже выставленным `Content-Encoding` (handler сам положил)
- любых ответах, которые сервер не должен оборачивать

```php
$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/account') {
        // содержит CSRF-токен + отражённый поисковый запрос, BREACH-чувствительно
        $res->setNoCompression();
    }
    $res->json($payload);
});
```

Метод идемпотентен.

## Streaming

Когда обработчик вызывает `HttpResponse::send($chunk)`, компрессирующий wrapper включается прозрачно
на первом вызове (если negotiation позволила) и выдаёт **один downstream-чанк на каждый source-чанк**,
сохраняя эффективность фрейминга на chunked H1 и H2 DATA-фреймах.

## Входящий декодинг

`Content-Encoding: gzip` / `br` / `zstd` (и legacy `x-gzip`) на запросах декодируется прозрачно.
`identity` означает no-op. Неизвестный coding → 413/415 (см. ниже).

| Ситуация | Код |
|----------|----:|
| Неизвестный coding | 415 |
| Превышен anti-bomb cap | 413 |
| Битый inflate | 400 |

В обработчике уже декодированное тело видно через
[`HttpRequest::getBody()`](/ru/docs/reference/server/http-request.html#getbody).

## One-shot brotli

С 0.6.3 сервер использует `BrotliEncoderCompress()` для тел известного размера (size-hint
`BROTLI_PARAM_SIZE_HINT`): энкодер сразу выбирает корректный размер ring-buffer и хэш-таблиц
вместо потокового streaming-режима, рассчитанного на произвольную длину. Streaming-путь остаётся
для chunked / unknown-length ответов.

## Бенчмарки

C-side дефолты выставлены под production (gzip 6, brotli 4). Бенч-вызовы у автора используют
`setCompressionLevel(1)` / `setBrotliLevel(1)` для эквивалентности Swoole-овскому `BrotliEncoderCompress`-пути.

## См. также

- [`HttpServerConfig::setCompressionEnabled()`](/ru/docs/reference/server/http-server-config.html#setcompressionenabled)
- [`HttpResponse::setNoCompression()`](/ru/docs/reference/server/http-response.html#setnocompression)
- [Static files](/ru/docs/server/static-files.html): precompressed sidecars (`.br`, `.gz`, `.zst`)
