---
layout: docs
lang: uk
path_key: "/docs/reference/server/http-response.html"
nav_active: docs
permalink: /uk/docs/reference/server/http-response.html
page_title: "TrueAsync\\HttpResponse"
description: "TrueAsync\\HttpResponse — статус, заголовки, тіло, стрім через send()/sendable(), trailers HTTP/2, sendFile(), json(), html(), redirect()."
---

# TrueAsync\HttpResponse

(PHP 8.6+, true_async_server 0.6+)

Об'єкт відповіді з fluent-інтерфейсом. Передається другим параметром в обробник. Створюється сервером —
не конструюється користувачем.

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

`"OK"`, `"Not Found"` тощо.

## Заголовки

### setHeader

```php
public HttpResponse::setHeader(string $name, string|array $value): static
```

Встановити заголовок, замінюючи попередні значення.

### addHeader

```php
public HttpResponse::addHeader(string $name, string|array $value): static
```

Додати значення до наявних (наприклад, `Set-Cookie`).

### hasHeader / getHeader / getHeaderLine / getHeaders

```php
public HttpResponse::hasHeader(string $name): bool
public HttpResponse::getHeader(string $name): ?string
public HttpResponse::getHeaderLine(string $name): string
public HttpResponse::getHeaders(): array
```

Case-insensitive читання того, що встановив handler.

### resetHeaders

```php
public HttpResponse::resetHeaders(): static
```

Зняти всі заголовки.

## Trailers (HTTP/2)

HEADERS-фрейм, що шлеться після тіла. Канонічний споживач — gRPC (`grpc-status`).
**На HTTP/1.1 значення мовчки ігнорується** — chunked-encoding trailer emission не в межах Step 5b.

### setTrailer

```php
public HttpResponse::setTrailer(string $name, string $value): static
```

Ім'я — lowercase (RFC 9113 §8.2.2); uppercase автоматично приводиться.

### setTrailers

```php
public HttpResponse::setTrailers(array $trailers): static
```

Bulk-set. Наявні trailers зберігаються — для clean slate викликайте `resetTrailers()` спочатку.

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
public HttpResponse::getProtocolName(): string     // завжди "HTTP"
public HttpResponse::getProtocolVersion(): string  // "1.1", "2", "3"
```

## Тіло

### write

```php
public HttpResponse::write(string $data): static
```

Append у внутрішній body-буфер. Надсилання — на `end()` / автоматично при поверненні з handler'а.

### send

```php
public HttpResponse::send(string $chunk): static
```

Надіслати чанк клієнту (streaming).

- **Перший** `send()` комітить статус + заголовки — змінити їх уже не можна.
- Наступні — append DATA-фреймів (HTTP/2) або chunked-segments (HTTP/1).
- Блокує handler-корутину **лише** під backpressure (per-stream staging buffer заповнено).
  Дефолт backpressure-порогу: `setStreamWriteBufferBytes()` — 256 KiB.
- У звичайному випадку повертається одразу.

### sendable

```php
public HttpResponse::sendable(): bool
```

Advisory non-blocking перевірка:

- `true` — `send()` прийме чанк без suspend'а корутини.
- `false` — `send()` заблокує на backpressure, або response уже sealed `sendFile()`'ом / закритий,
  або це не streaming-capable тип відповіді.

`send()` **завжди** безпечно викликати — `sendable()` лише дає handler'у можливість зайнятись
іншою роботою замість блокування на повільному peer'і.

### setNoCompression

```php
public HttpResponse::setNoCompression(): static
```

Заборона стиснення для цієї відповіді — перебиває Accept-Encoding, MIME-whitelist і size threshold.
Застосовуйте на: BREACH-чутливих endpoints (секрети + reflected user input), payload'ах з
уже виставленим `Content-Encoding`, тілах, які сервер не має обгортати. Ідемпотентно.

### getBody / setBody

```php
public HttpResponse::getBody(): string
public HttpResponse::setBody(string $body): static
```

Get/set поточного вмісту буфера.

## Helpers

### json

```php
public HttpResponse::json(
    array|string|object|null|int|float|bool $data,
    int $status = 200,
    int $flags  = 0
): static
```

JSON-серіалізація через `php_json_encode_ex` (той самий шлях, що у `json_encode()`):

- `array` / `object` / scalar `$data` → encoded.
- `string` `$data` → шлеться **як є** (cached JSON, pre-built bytes). Skip re-encoding.

`Content-Type: application/json` ставиться **лише** якщо handler не виставив свій — chain
`setHeader('Content-Type', 'application/problem+json')->json($payload)` для іншого media-type.

`$flags` — `JSON_*` bitmask. `0` — дефолти сервера з
[`HttpServerConfig::setJsonEncodeFlags()`](/uk/docs/reference/server/http-server-config.html#setjsonencodeflags-getjsonencodeflags)
(`JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES` з коробки).

`JSON_THROW_ON_ERROR` мовчки стрипається: помилка encode дає `500` JSON-помилки, виняток не
пробрасується. Handler ніколи не має обгортати `json()` у try/catch.

### html

```php
public HttpResponse::html(string $html): static
```

Ставить `Content-Type: text/html`.

### redirect

```php
public HttpResponse::redirect(string $url, int $status = 302): static
```

## Надсилання

### end

```php
public HttpResponse::end(?string $data = null): void
```

Завершити відповідь і надіслати клієнту. Після `end()` нічого більше писати не можна.

### sendFile

```php
public HttpResponse::sendFile(string $path, ?SendFileOptions $options = null): void
```

Handler-driven доставка файлу. Записує path + options на response і **відразу повертається** —
передача йде в dispose-фазі через ту саму FSM, що і `StaticHandler` (MIME, ETag, IMF-date, Range,
conditional GET, precompressed sidecars).

**Після `sendFile()` response sealed**: `setHeader` / `setStatus*` / `write` / `send` / `setBody` /
`json` / `html` / `redirect` / `end` / повторний `sendFile()` кидають `HttpServerRuntimeException`.

Шлях — **довірений** (handler прийняв рішення про доступ). Помилки open/fstat (`ENOENT`, `EACCES`,
oversize, non-regular) — 500, бо заголовки ще не на дроті.

Compression middleware bypasses для sendFile-тіл (своя delivery pipeline).

> HTTP/3 path для `sendFile()` — у роботі; поки H3 dispose-хук відкидає з 500.

Див. [`SendFileOptions`](/uk/docs/reference/server/send-file-options.html).

## Server-Sent Events (text/event-stream)

(true_async_server 0.8+). Керівництво з прикладами: [SSE](/uk/docs/server/sse.html).

### sseStart

```php
public HttpResponse::sseStart(): static
```

Переводить відповідь у режим SSE і фіксує заголовки: `Content-Type: text/event-stream`,
`Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, а також позначає відповідь як
нестисливу. Відповідь входить у потоковий режим так само, як перший `send()`: статус і заголовки
комітяться і більше не можуть змінюватися, але сам подієвий payload ще не йде на провід.

Виклик необов'язковий: перший `sseEvent()`/`sseComment()` стартує стрім сам. `sseStart()` сам по
собі **не** флашить статус-рядок і заголовки: коміт лінивий і відбувається на першому
`sseEvent()`/`sseComment()`/`sseRetry()` (якщо жоден так і не буде викликаний, при завершенні
відповіді піде порожній `200 text/event-stream`). Щоб відкрити стрім одразу, наприклад розбудити
`onopen` браузера раніше першої реальної події, надішліть початковий `sseComment()`.

Кидає `HttpServerInvalidArgumentException`, якщо обробник уже виставив `Content-Type`, відмінний
від `text/event-stream`, і `HttpServerRuntimeException`, якщо відповідь уже стрімить, закрита або
зайнята під `sendFile()`.

### sseEvent

```php
public HttpResponse::sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null
): static
```

Форматує і надсилає одну SSE-подію, за потреби стартуючи стрім. Багаторядковий `$data`
розбивається за `\n`/`\r\n`/`\r` і йде як кілька полів `data:` (WHATWG §9.2). `$event`, `$id` і
`$retry` потрапляють у запис лише коли не `null`. Запис завершується порожнім рядком, щоб браузер
диспетчеризував подію негайно.

`$event` і `$id` не повинні містити `\r`/`\n` (інакше парсер прочитає їх як роздільник
поля/запису), а `$id` не повинен містити NUL: такі порушення кидають
`HttpServerInvalidArgumentException`. `$retry` має бути невід'ємним.

Значення `$data === ""` теж валідне, воно диспетчеризує порожній `MessageEvent`. Усі чотири
аргументи, що дорівнюють `null`, дають no-op: парсер `EventSource` пропускає подію без `data` і
без `retry`.

### sseComment

```php
public HttpResponse::sseComment(string $text = ""): static
```

Надсилає рядок-коментар (запис, що починається з `:`). Браузери їх ігнорують, але вони тримають
з'єднання живим крізь idle-таймаути проміжних проксі (наприклад, nginx `proxy_read_timeout`, за
замовчуванням 60с). Канонічний payload: порожній рядок (`:\n\n` на проводі). `$text` не повинен
містити `\r`/`\n`. Стартує стрім, якщо він ще не запущений.

### sseRetry

```php
public HttpResponse::sseRetry(int $milliseconds): static
```

Надсилає директиву `retry:`, що задає, скільки мілісекунд чекати перед перепідключенням після
обриву стріму. Цукор для `sseEvent(retry: $milliseconds)` без payload. Стартує стрім, якщо він ще
не запущений.

## Стан

### isHeadersSent

```php
public HttpResponse::isHeadersSent(): bool
```

### isClosed

```php
public HttpResponse::isClosed(): bool
```

## Приклад

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

## Див. також

- [`TrueAsync\HttpRequest`](/uk/docs/reference/server/http-request.html)
- [`TrueAsync\SendFileOptions`](/uk/docs/reference/server/send-file-options.html)
- [Стрімінг](/uk/docs/server/streaming.html)
- [SSE](/uk/docs/server/sse.html)
- [Стиснення](/uk/docs/server/compression.html)
