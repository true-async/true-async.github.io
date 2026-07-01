---
layout: docs
lang: ru
path_key: "/docs/reference/server/http-response.html"
nav_active: docs
permalink: /ru/docs/reference/server/http-response.html
page_title: "TrueAsync\\HttpResponse"
description: "TrueAsync\\HttpResponse — статус, заголовки, тело, стрим через send()/sendable(), trailers HTTP/2, sendFile(), json(), html(), redirect()."
---

# TrueAsync\HttpResponse

(PHP 8.6+, true_async_server 0.6+)

Объект ответа с fluent-интерфейсом. Передаётся вторым параметром в обработчик. Создаётся сервером —
не конструируется пользователем.

```php
namespace TrueAsync;

final class HttpResponse
{
    // status
    public function setStatusCode(int $code): static;
    public function getStatusCode(): int;
    public function setReasonPhrase(string $phrase): static;
    public function getReasonPhrase(): string;

    // headers
    public function setHeader(string $name, string|array $value): static;
    public function addHeader(string $name, string|array $value): static;
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function resetHeaders(): static;

    // trailers (HTTP/2)
    public function setTrailer(string $name, string $value): static;
    public function setTrailers(array $trailers): static;
    public function resetTrailers(): static;
    public function getTrailers(): array;

    // protocol introspection
    public function getProtocolName(): string;
    public function getProtocolVersion(): string;

    // body
    public function write(string $data): static;
    public function send(string $chunk): static;
    public function sendable(): bool;
    public function setNoCompression(): static;
    public function getBody(): string;
    public function setBody(string $body): static;
    public function getBodyStream(): mixed;       // TODO
    public function setBodyStream(mixed $stream): static;  // TODO

    // helpers
    public function json(array|string|object|null|int|float|bool $data, int $status = 200, int $flags = 0): static;
    public function html(string $html): static;
    public function redirect(string $url, int $status = 302): static;

    // send / state
    public function end(?string $data = null): void;
    public function sendFile(string $path, ?SendFileOptions $options = null): void;

    // Server-Sent Events (text/event-stream)
    public function sseStart(): static;
    public function sseEvent(?string $data = null, ?string $event = null, ?string $id = null, ?int $retry = null): static;
    public function sseComment(string $text = ""): static;
    public function sseRetry(int $milliseconds): static;

    public function isHeadersSent(): bool;
    public function isClosed(): bool;
}
```

## Статус

### setStatusCode

```php
public HttpResponse::setStatusCode(int $code): static
```

HTTP-код 100..599.

### getStatusCode

```php
public HttpResponse::getStatusCode(): int
```

### setReasonPhrase / getReasonPhrase

```php
public HttpResponse::setReasonPhrase(string $phrase): static
public HttpResponse::getReasonPhrase(): string
```

`"OK"`, `"Not Found"` и т.д.

## Заголовки

### setHeader

```php
public HttpResponse::setHeader(string $name, string|array $value): static
```

Установить заголовок, заменяя предыдущие значения.

### addHeader

```php
public HttpResponse::addHeader(string $name, string|array $value): static
```

Добавить значение к существующим (e.g. `Set-Cookie`).

### hasHeader / getHeader / getHeaderLine / getHeaders

```php
public HttpResponse::hasHeader(string $name): bool
public HttpResponse::getHeader(string $name): ?string
public HttpResponse::getHeaderLine(string $name): string
public HttpResponse::getHeaders(): array
```

Case-insensitive чтение того, что установил handler.

### resetHeaders

```php
public HttpResponse::resetHeaders(): static
```

Снять все заголовки.

## Trailers (HTTP/2)

HEADERS-фрейм, который шлётся после тела. Канонический потребитель — gRPC (`grpc-status`).
**На HTTP/1.1 значение молча игнорируется** — chunked-encoding trailer emission не в скоупе Step 5b.

### setTrailer

```php
public HttpResponse::setTrailer(string $name, string $value): static
```

Имя — lowercase (RFC 9113 §8.2.2); uppercase автоматически приводится.

### setTrailers

```php
public HttpResponse::setTrailers(array $trailers): static
```

Bulk-set. Существующие trailers сохраняются — для clean slate вызывайте `resetTrailers()` сначала.

### resetTrailers

```php
public HttpResponse::resetTrailers(): static
```

### getTrailers

```php
public HttpResponse::getTrailers(): array
```

## Протокол

### getProtocolName / getProtocolVersion

```php
public HttpResponse::getProtocolName(): string     // всегда "HTTP"
public HttpResponse::getProtocolVersion(): string  // "1.1", "2", "3"
```

## Тело

### write

```php
public HttpResponse::write(string $data): static
```

Append во внутренний body-буфер. Отправка — на `end()` / автоматически при возврате из handler'а.

### send

```php
public HttpResponse::send(string $chunk): static
```

Отправить чанк клиенту (streaming).

- **Первый** `send()` коммитит статус + заголовки — изменить их уже нельзя.
- Последующие — append DATA-фреймов (HTTP/2) или chunked-segments (HTTP/1).
- Блокирует handler-корутину **только** под backpressure (per-stream staging buffer заполнен).
  Дефолт backpressure-порога: `setStreamWriteBufferBytes()` — 256 KiB.
- В нормальном случае возвращается сразу.

### sendable

```php
public HttpResponse::sendable(): bool
```

Advisory non-blocking проверка:

- `true` — `send()` примет чанк без suspend'а корутины.
- `false` — `send()` заблокирует на backpressure, или response уже sealed `sendFile()`'ом / закрыт,
  или это не streaming-capable тип ответа.

`send()` **всегда** безопасно вызывать — `sendable()` лишь даёт handler'у возможность заняться
другой работой вместо блокировки на медленном peer'е.

### setNoCompression

```php
public HttpResponse::setNoCompression(): static
```

Запрет компрессии для этого ответа — перебивает Accept-Encoding, MIME-whitelist и size threshold.
Применяйте на: BREACH-чувствительных endpoints (секреты + reflected user input), payload'ах с
уже выставленным `Content-Encoding`, телах, которые сервер не должен оборачивать. Идемпотентно.

### getBody / setBody

```php
public HttpResponse::getBody(): string
public HttpResponse::setBody(string $body): static
```

Get/set текущего содержимого буфера.

## Helpers

### json

```php
public HttpResponse::json(
    array|string|object|null|int|float|bool $data,
    int $status = 200,
    int $flags  = 0
): static
```

JSON-сериализация через `php_json_encode_ex` (тот же путь, что у `json_encode()`):

- `array` / `object` / scalar `$data` → encoded.
- `string` `$data` → шлётся **как есть** (cached JSON, pre-built bytes). Skip re-encoding.

`Content-Type: application/json` ставится, **только** если handler не выставил свой — chain
`setHeader('Content-Type', 'application/problem+json')->json($payload)` для другого media-type.

`$flags` — `JSON_*` bitmask. `0` — дефолты сервера из
[`HttpServerConfig::setJsonEncodeFlags()`](/ru/docs/reference/server/http-server-config.html#setjsonencodeflags-getjsonencodeflags)
(`JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES` из коробки).

`JSON_THROW_ON_ERROR` молча стрипается: ошибка encode даёт `500` JSON-ошибки, исключение не
пробрасывается. Handler никогда не должен оборачивать `json()` в try/catch.

### html

```php
public HttpResponse::html(string $html): static
```

Ставит `Content-Type: text/html`.

### redirect

```php
public HttpResponse::redirect(string $url, int $status = 302): static
```

## Отправка

### end

```php
public HttpResponse::end(?string $data = null): void
```

Завершить ответ и отправить клиенту. После `end()` ничего больше писать нельзя.

### sendFile

```php
public HttpResponse::sendFile(string $path, ?SendFileOptions $options = null): void
```

Handler-driven доставка файла. Записывает path + options на response и **сразу возвращается** —
передача идёт в dispose-фазе через ту же FSM, что и `StaticHandler` (MIME, ETag, IMF-date, Range,
conditional GET, precompressed sidecars).

**После `sendFile()` response sealed**: `setHeader` / `setStatus*` / `write` / `send` / `setBody` /
`json` / `html` / `redirect` / `end` / повторный `sendFile()` бросают `HttpServerRuntimeException`.

Путь — **доверенный** (handler принял решение о доступе). Ошибки open/fstat (`ENOENT`, `EACCES`,
oversize, non-regular) — 500, потому что заголовки ещё не на проводе.

Compression middleware bypasses для sendFile-тел (своя delivery pipeline).

> HTTP/3 path для `sendFile()` — в работе; пока H3 dispose-хук отвергает с 500.

См. [`SendFileOptions`](/ru/docs/reference/server/send-file-options.html).

## Server-Sent Events (text/event-stream)

(true_async_server 0.8+). Руководство с примерами: [SSE](/ru/docs/server/sse.html).

### sseStart

```php
public HttpResponse::sseStart(): static
```

Переводит ответ в режим SSE и фиксирует заголовки: `Content-Type: text/event-stream`,
`Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, а также помечает ответ как
несжимаемый. Ответ входит в потоковый режим так же, как первый `send()`: статус и заголовки
коммитятся и больше не могут меняться, но сам событийный payload ещё не уходит на провод.

Вызов необязателен: первый `sseEvent()`/`sseComment()` стартует стрим сам. `sseStart()` сам по
себе **не** флашит статус-строку и заголовки: коммит ленивый и происходит на первом
`sseEvent()`/`sseComment()`/`sseRetry()` (если ни один так и не будет вызван, при завершении
ответа уйдёт пустой `200 text/event-stream`). Чтобы открыть стрим сразу, например разбудить
`onopen` браузера раньше первого реального события, отправьте начальный `sseComment()`.

Бросает `HttpServerInvalidArgumentException`, если обработчик уже выставил `Content-Type`,
отличный от `text/event-stream`, и `HttpServerRuntimeException`, если ответ уже стримит, закрыт
или занят под `sendFile()`.

### sseEvent

```php
public HttpResponse::sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null
): static
```

Форматирует и отправляет одно SSE-событие, при необходимости стартуя стрим. Многострочный
`$data` бьётся по `\n`/`\r\n`/`\r` и уходит как несколько полей `data:` (WHATWG §9.2). `$event`,
`$id` и `$retry` попадают в запись только когда не `null`. Запись завершается пустой строкой, так
что браузер диспатчит событие немедленно.

`$event` и `$id` не должны содержать `\r`/`\n` (иначе парсер прочтёт их как разделитель
поля/записи), а `$id` не должен содержать NUL: такие нарушения бросают
`HttpServerInvalidArgumentException`. `$retry` должен быть неотрицательным.

Значение `$data === ""` тоже валидно, оно диспатчит пустой `MessageEvent`. Все четыре аргумента,
равные `null`, дают no-op: `EventSource`-парсер пропускает событие без `data` и без `retry`.

### sseComment

```php
public HttpResponse::sseComment(string $text = ""): static
```

Отправляет строку-комментарий (запись, начинающаяся с `:`). Браузеры их игнорируют, но они
держат соединение живым сквозь idle-таймауты промежуточных прокси (например, nginx
`proxy_read_timeout`, по умолчанию 60с). Канонический payload: пустая строка (`:\n\n` на
проводе). `$text` не должен содержать `\r`/`\n`. Стартует стрим, если он ещё не запущен.

### sseRetry

```php
public HttpResponse::sseRetry(int $milliseconds): static
```

Отправляет директиву `retry:`, задающую, сколько миллисекунд ждать перед переподключением после
обрыва стрима. Сахар для `sseEvent(retry: $milliseconds)` без payload. Стартует стрим, если он
ещё не запущен.

## Состояние

### isHeadersSent

```php
public HttpResponse::isHeadersSent(): bool
```

### isClosed

```php
public HttpResponse::isClosed(): bool
```

## Пример

```php
use TrueAsync\HttpResponse;
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, HttpResponse $res) {
    // SSE
    if ($req->getPath() === '/events') {
        foreach (loadEvents() as $event) {
            $res->sseEvent(json_encode($event));
        }
        $res->end();
        return;
    }

    // sendFile
    if ($req->getPath() === '/report.pdf') {
        $res->sendFile('/var/reports/q1.pdf', new SendFileOptions(
            disposition:  SendFileDisposition::ATTACHMENT,
            downloadName: 'Q1-Report.pdf',
        ));
        return;
    }

    // JSON
    $res->json(['ok' => true]);
});
```

## См. также

- [`TrueAsync\HttpRequest`](/ru/docs/reference/server/http-request.html)
- [`TrueAsync\SendFileOptions`](/ru/docs/reference/server/send-file-options.html)
- [Streaming](/ru/docs/server/streaming.html)
- [SSE](/ru/docs/server/sse.html)
- [Компрессия](/ru/docs/server/compression.html)
