---
layout: docs
lang: ru
path_key: "/docs/reference/server/http-request.html"
nav_active: docs
permalink: /ru/docs/reference/server/http-request.html
page_title: "TrueAsync\\HttpRequest"
description: "TrueAsync\\HttpRequest — read-only представление HTTP-запроса: метод, URI, заголовки, тело, query, multipart, W3C Trace Context, body streaming."
---

# TrueAsync\HttpRequest

(PHP 8.6+, true_async_server 0.6+)

Read-only объект, передаваемый первым параметром в обработчик. Создаётся сервером — не конструируется
пользователем.

```php
namespace TrueAsync;

final class HttpRequest
{
    // --- общие ---
    public function getMethod(): string;
    public function getUri(): string;
    public function getPath(): string;
    public function getHttpVersion(): string;
    public function isKeepAlive(): bool;

    // --- query ---
    public function getQuery(): array;
    public function getQueryParam(string $name, mixed $default = null): mixed;

    // --- headers ---
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function getContentType(): ?string;
    public function getContentLength(): ?int;

    // --- body ---
    public function getBody(): string;
    public function hasBody(): bool;
    public function awaitBody(): static;
    public function readBody(int $maxLen = 65536): ?string;

    // --- multipart / form ---
    public function getPost(): array;
    public function getFiles(): array;
    public function getFile(string $name): ?UploadedFile;

    // --- W3C Trace Context ---
    public function getTraceParent(): ?string;
    public function getTraceState(): ?string;
    public function getTraceId(): ?string;
    public function getSpanId(): ?string;
    public function getTraceFlags(): ?int;
}
```

## Общие

### getMethod

```php
public HttpRequest::getMethod(): string
```

`"GET"`, `"POST"`, `"PUT"`, `"DELETE"` и т. д.

### getUri

```php
public HttpRequest::getUri(): string
```

Полный URI запроса — путь + query string.

### getPath

```php
public HttpRequest::getPath(): string
```

Путь без query-string. Например, `/search` из `/search?q=hello`. Единообразно для HTTP/1.1, HTTP/2
(`:path` pseudo-header) и HTTP/3. Совместно с `getQuery()` использует один ленивый парс — URI
разбивается на path/query при первом обращении и кэшируется в request-struct.

### getHttpVersion

```php
public HttpRequest::getHttpVersion(): string
```

`"1.1"`, `"2"`, `"3"`.

### isKeepAlive

```php
public HttpRequest::isKeepAlive(): bool
```

## Query

### getQuery

```php
public HttpRequest::getQuery(): array
```

Все query-параметры как ассоциативный массив — эквивалент `$_GET`. Поддерживает percent-decoding,
`+`-as-space, PHP array notation (`foo[]`, `foo[bar]`). Парсинг делегируется в
`php_default_treat_data(PARSE_STRING, ...)` — та же функция, что наполняет `$_GET`.

### getQueryParam

```php
public HttpRequest::getQueryParam(string $name, mixed $default = null): mixed
```

Один параметр по имени или `$default` (по умолчанию `null`) если отсутствует.

## Заголовки

### hasHeader

```php
public HttpRequest::hasHeader(string $name): bool
```

Case-insensitive.

### getHeader

```php
public HttpRequest::getHeader(string $name): ?string
```

Одно значение, case-insensitive. `null` если нет.

### getHeaderLine

```php
public HttpRequest::getHeaderLine(string $name): string
```

Все значения, объединённые запятой. Пустая строка если нет.

### getHeaders

```php
public HttpRequest::getHeaders(): array
```

Все заголовки. Имена в **lowercase**.

### getContentType

```php
public HttpRequest::getContentType(): ?string
```

Значение `Content-Type`, или `null`.

### getContentLength

```php
public HttpRequest::getContentLength(): ?int
```

`Content-Length` или `null` (отсутствует или невалиден).

## Тело

### getBody

```php
public HttpRequest::getBody(): string
```

Тело запроса. Пустая строка если без body.

> В режиме streaming-body (`HttpServerConfig::setBodyStreamingEnabled(true)`) `getBody()` бросает —
> читайте через `readBody()`.

### hasBody

```php
public HttpRequest::hasBody(): bool
```

### awaitBody

```php
public HttpRequest::awaitBody(): static
```

Ждать полного тела. С Phase 6 Step 3+ обработчик может вызываться **сразу после parsed-headers**,
до приёма тела. `awaitBody()` приостанавливает корутину до message-complete.

Когда тело уже целиком в буфере (текущий дефолт) — возвращается сразу без suspend'а.

### readBody

```php
public HttpRequest::readBody(int $maxLen = 65536): ?string
```

Pull-based стрим тела (issue #26). Возвращает **один** parser-supplied чанк за вызов:

- H2 DATA-фрейм (≈ 16 KiB);
- llhttp `on_body` slice (ограничен read-buffer'ом H1 — 8 KiB).

Поведение:

- Пустая очередь → корутина паркуется на per-request trigger event.
- EOF → `null` (идемпотентно).
- Ошибка стрима (peer reset, превышение `max_body_size`) → `\Exception`.
- `$maxLen` зарезервирован для будущей coalesce-оптимизации, сейчас игнорируется. Сигнатура держится
  binary-compatible с грядущей доводкой.

Доступно **только** при `HttpServerConfig::setBodyStreamingEnabled(true)`.

См. [Streaming](/ru/docs/server/streaming.html).

## Multipart / form

### getPost

```php
public HttpRequest::getPost(): array
```

POST-данные из `multipart/form-data` или `application/x-www-form-urlencoded`. Поддерживает
PHP-style массивы: `name[]`, `user[name]`, `matrix[0][1]`.

### getFiles

```php
public HttpRequest::getFiles(): array
```

Все загруженные файлы. Несколько файлов с одним именем: `['photos' => [UploadedFile, UploadedFile, ...]]`.

### getFile

```php
public HttpRequest::getFile(string $name): ?UploadedFile
```

Один файл по имени. Для `photos[]` — первый из массива. `null` если нет.

См. [`UploadedFile`](/ru/docs/reference/server/uploaded-file.html).

## W3C Trace Context

Требует `HttpServerConfig::setTelemetryEnabled(true)`.

### getTraceParent

```php
public HttpRequest::getTraceParent(): ?string
```

Сырой `traceparent` как пришёл. `null` если отсутствует / malformed / telemetry выключена.

### getTraceState

```php
public HttpRequest::getTraceState(): ?string
```

Сырой `tracestate`. `null` если отсутствует / telemetry выключена.

### getTraceId

```php
public HttpRequest::getTraceId(): ?string
```

Декодированный 32-символьный lower-hex trace-id, или `null`.

### getSpanId

```php
public HttpRequest::getSpanId(): ?string
```

Декодированный 16-символьный lower-hex parent span-id, или `null`.

### getTraceFlags

```php
public HttpRequest::getTraceFlags(): ?int
```

Декодированный 8-битный flags-байт (например, `0x01` — sampled), или `null`.

## Пример

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    error_log(sprintf(
        "[%s] %s %s (HTTP/%s, body=%s, traceid=%s)",
        $req->getMethod(),
        $req->getPath(),
        $req->getQuery() ? json_encode($req->getQuery()) : '-',
        $req->getHttpVersion(),
        $req->getContentLength() ?? 'n/a',
        $req->getTraceId() ?? '-'
    ));

    if ($req->getMethod() === 'POST' && $req->getContentType() === 'application/json') {
        $body = json_decode($req->getBody(), true);
        // ...
    }

    $res->json(['ok' => true]);
});
```

## См. также

- [`TrueAsync\HttpResponse`](/ru/docs/reference/server/http-response.html)
- [`TrueAsync\UploadedFile`](/ru/docs/reference/server/uploaded-file.html)
- [Streaming](/ru/docs/server/streaming.html)
