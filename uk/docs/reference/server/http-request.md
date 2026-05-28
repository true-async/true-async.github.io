---
layout: docs
lang: uk
path_key: "/docs/reference/server/http-request.html"
nav_active: docs
permalink: /uk/docs/reference/server/http-request.html
page_title: "TrueAsync\\HttpRequest"
description: "TrueAsync\\HttpRequest — read-only представлення HTTP-запиту: метод, URI, заголовки, тіло, query, multipart, W3C Trace Context, body streaming."
---

# TrueAsync\HttpRequest

(PHP 8.6+, true_async_server 0.6+)

Read-only об'єкт, що передається першим параметром в обробник. Створюється сервером — не конструюється
користувачем.

```php
namespace TrueAsync;

final class HttpRequest
{
    // --- загальні ---
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

## Загальні

### getMethod

```php
public HttpRequest::getMethod(): string
```

`"GET"`, `"POST"`, `"PUT"`, `"DELETE"` тощо.

### getUri

```php
public HttpRequest::getUri(): string
```

Повний URI запиту — шлях + query string.

### getPath

```php
public HttpRequest::getPath(): string
```

Шлях без query-string. Наприклад, `/search` з `/search?q=hello`. Однаково для HTTP/1.1, HTTP/2
(`:path` pseudo-header) і HTTP/3. Разом із `getQuery()` використовує один лінивий парс — URI
розбивається на path/query при першому зверненні і кешується в request-struct.

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

Усі query-параметри як асоціативний масив — еквівалент `$_GET`. Підтримує percent-decoding,
`+`-as-space, PHP array notation (`foo[]`, `foo[bar]`). Парсинг делегується в
`php_default_treat_data(PARSE_STRING, ...)` — та сама функція, що наповнює `$_GET`.

### getQueryParam

```php
public HttpRequest::getQueryParam(string $name, mixed $default = null): mixed
```

Один параметр за іменем або `$default` (за замовчуванням `null`), якщо відсутній.

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

Одне значення, case-insensitive. `null`, якщо немає.

### getHeaderLine

```php
public HttpRequest::getHeaderLine(string $name): string
```

Усі значення, об'єднані комою. Порожній рядок, якщо немає.

### getHeaders

```php
public HttpRequest::getHeaders(): array
```

Усі заголовки. Імена в **lowercase**.

### getContentType

```php
public HttpRequest::getContentType(): ?string
```

Значення `Content-Type` або `null`.

### getContentLength

```php
public HttpRequest::getContentLength(): ?int
```

`Content-Length` або `null` (відсутній або невалідний).

## Тіло

### getBody

```php
public HttpRequest::getBody(): string
```

Тіло запиту. Порожній рядок, якщо без body.

> У режимі streaming-body (`HttpServerConfig::setBodyStreamingEnabled(true)`) `getBody()` кидає —
> читайте через `readBody()`.

### hasBody

```php
public HttpRequest::hasBody(): bool
```

### awaitBody

```php
public HttpRequest::awaitBody(): static
```

Чекати повного тіла. З Phase 6 Step 3+ обробник може викликатися **відразу після parsed-headers**,
до приймання тіла. `awaitBody()` паркує корутину до message-complete.

Коли тіло вже цілком у буфері (поточний дефолт) — повертається одразу без suspend'а.

### readBody

```php
public HttpRequest::readBody(int $maxLen = 65536): ?string
```

Pull-based стрім тіла (issue #26). Повертає **один** parser-supplied чанк за виклик:

- H2 DATA-фрейм (≈ 16 KiB);
- llhttp `on_body` slice (обмежений read-buffer'ом H1 — 8 KiB).

Поведінка:

- Порожня черга → корутина паркується на per-request trigger event.
- EOF → `null` (ідемпотентно).
- Помилка стріма (peer reset, перевищення `max_body_size`) → `\Exception`.
- `$maxLen` зарезервовано для майбутньої coalesce-оптимізації, зараз ігнорується. Сигнатура тримається
  binary-compatible з прийдешнім допилом.

Доступно **лише** при `HttpServerConfig::setBodyStreamingEnabled(true)`.

Див. [Стрімінг](/uk/docs/server/streaming.html).

## Multipart / form

### getPost

```php
public HttpRequest::getPost(): array
```

POST-дані з `multipart/form-data` або `application/x-www-form-urlencoded`. Підтримує
PHP-style масиви: `name[]`, `user[name]`, `matrix[0][1]`.

### getFiles

```php
public HttpRequest::getFiles(): array
```

Усі завантажені файли. Декілька файлів з одним іменем: `['photos' => [UploadedFile, UploadedFile, ...]]`.

### getFile

```php
public HttpRequest::getFile(string $name): ?UploadedFile
```

Один файл за іменем. Для `photos[]` — перший з масиву. `null`, якщо немає.

Див. [`UploadedFile`](/uk/docs/reference/server/uploaded-file.html).

## W3C Trace Context

Потребує `HttpServerConfig::setTelemetryEnabled(true)`.

### getTraceParent

```php
public HttpRequest::getTraceParent(): ?string
```

Сирий `traceparent` як прийшов. `null`, якщо відсутній / malformed / telemetry вимкнено.

### getTraceState

```php
public HttpRequest::getTraceState(): ?string
```

Сирий `tracestate`. `null`, якщо відсутній / telemetry вимкнено.

### getTraceId

```php
public HttpRequest::getTraceId(): ?string
```

Декодований 32-символьний lower-hex trace-id або `null`.

### getSpanId

```php
public HttpRequest::getSpanId(): ?string
```

Декодований 16-символьний lower-hex parent span-id або `null`.

### getTraceFlags

```php
public HttpRequest::getTraceFlags(): ?int
```

Декодований 8-бітний flags-байт (наприклад, `0x01` — sampled) або `null`.

## Приклад

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

## Див. також

- [`TrueAsync\HttpResponse`](/uk/docs/reference/server/http-response.html)
- [`TrueAsync\UploadedFile`](/uk/docs/reference/server/uploaded-file.html)
- [Стрімінг](/uk/docs/server/streaming.html)
