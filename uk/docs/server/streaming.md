---
layout: docs
lang: uk
path_key: "/docs/server/streaming.html"
nav_active: docs
permalink: /uk/docs/server/streaming.html
page_title: "TrueAsync Server: стрімінг запиту і відповіді"
description: "readBody(): pull-based стрім тіла запиту. send()/sendable(): chunked стрім відповіді з backpressure. Trailers HTTP/2."
---

# Стрімінг запиту і відповіді

(PHP 8.6+, true_async_server 0.6+)

## Стрім тіла запиту: `readBody()`

За замовчуванням обробник отримує вже повністю прочитане тіло (`HttpRequest::getBody()`).
З `HttpServerConfig::setBodyStreamingEnabled(true)` парсери H1/H2 кладуть DATA-чанки у per-request
FIFO, і обробник читає їх по одному через `HttpRequest::readBody()`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setBodyStreamingEnabled(true)
);

$server->addHttpHandler(function ($req, $res) {
    $fp = fopen('/tmp/upload-' . bin2hex(random_bytes(8)), 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($fp, $chunk);
        $total += strlen($chunk);
    }
    fclose($fp);

    $res->json(['received' => $total]);
});

$server->start();
```

### Семантика

- Один виклик `readBody()` повертає **один** parser-supplied chunk:
  - H2 DATA-фрейм (за замовчуванням до 16 KiB),
  - llhttp `on_body` slice (обмежений read-buffer'ом H1 = 8 KiB).
- За порожньої черги корутина паркується на per-request trigger event.
- На EOF повертається `null` (ідемпотентно).
- При помилці стріма (peer reset, перевищення `max_body_size`) кидається `\Exception`.
- Параметр `$maxLen` зараз зарезервовано для майбутнього coalesce і ігнорується. Сигнатура тримається
  binary-compatible з прийдешнім допилом (issue #26).

### Коли вмикати

- Великі uploads (логи, медіа, бекапи)
- Стрімінг-парсинг (NDJSON, MessagePack stream)
- Сервіси, де tail-latency деградує від утримання тіла в RAM
- Multipart **завжди** стрім, незалежно від `setBodyStreamingEnabled()`

Коли **не** вмикати: REST-ендпоїнти, де тіло компактне і зручніше працювати з `getBody()`/`getPost()`/
`getQuery()` цілком. Combined-mode (стрім лише коли тіло > X) не підтримується;
`getBody()` у streaming-режимі кидає `LogicException` (заплановано в roadmap).

### Memory footprint

На 50 паралельних 20-MiB POST'ах (h2load, WSL2): peak RSS падає 1170 MiB → **197 MiB** (×6).
Пропускна спроможність зростає 36 req/s → **100 req/s** (×2.7), бо dispatch обробника більше
не чекає повного тіла.

## Стрім відповіді: `send()` / `sendable()`

Найпростіша відповідь через `setBody()` / `json()` / `html()` / `redirect()` надсилається одним шматком.

Для стрім-відповіді (chunked H1, DATA-фрейми H2) використовується `send($chunk)`:

```php
$server->addHttpHandler(function ($req, $res) {
    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setNoCompression();   // SSE: події мають досягати клієнта одразу

    // Перший send() комітить статус + заголовки (змінити їх уже не можна)
    foreach (generateEvents() as $event) {
        $res->send("data: " . json_encode($event) . "\n\n");
    }
});
```

### Backpressure

`send()` блокує handler-корутину **лише** під backpressure: per-stream staging buffer заповнено.
У звичайному випадку повертається одразу.

HTTP/2: backpressure вмикається при заповненні ring-slot'ів **або** перевищенні
`HttpServerConfig::setStreamWriteBufferBytes()` (дефолт 256 KiB).
HTTP/1 chunked: використовує kernel send-buffer.

### `sendable()`

Advisory non-blocking перевірка: поверне `true`, якщо `send()` прийме чанк без suspend'а корутини.
`false` означає: `send()` заблокує, або response закритий/sealed `sendFile()`'ом, або це
не streaming-capable тип відповіді.

```php
foreach ($events as $event) {
    if (!$res->sendable()) {
        // не хочеться чекати повільного клієнта, займемось іншим
        $event->save();   // дописати в БД
        continue;
    }
    $res->send($event->encode());
}
```

`send()` **завжди** безпечно викликати, незалежно від `sendable()`. Останній просто дає handler'у
шанс зайнятись іншою роботою замість блокування на повільному peer'і.

## HTTP/2 trailers

HTTP/2 підтримує HEADERS-фрейм після тіла (trailers). Канонічний споживач — gRPC
(`grpc-status` у trailer).

```php
$res->setStatusCode(200);
$res->send($body);
$res->setTrailer('grpc-status', '0');
$res->setTrailer('grpc-message', 'OK');
```

Bulk-set:

```php
$res->setTrailers(['grpc-status' => '0', 'grpc-message' => 'OK']);
$res->resetTrailers();   // зняти всі
$res->getTrailers();
```

На HTTP/1.1 значення **мовчки ігнорується**: chunked-encoding trailer emission не в межах
Step 5b.

> Імена trailers пишуться в lowercase (RFC 9113 §8.2.2); uppercase автоматично приводиться.

## Див. також

- [`HttpServerConfig::setBodyStreamingEnabled()`](/uk/docs/reference/server/http-server-config.html#setbodystreamingenabled)
- [`HttpServerConfig::setStreamWriteBufferBytes()`](/uk/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
- [`HttpRequest::readBody()`](/uk/docs/reference/server/http-request.html#readbody)
- [`HttpResponse::send()`](/uk/docs/reference/server/http-response.html#send)
- [`HttpResponse::sendable()`](/uk/docs/reference/server/http-response.html#sendable)
- [`HttpResponse::setTrailer()`](/uk/docs/reference/server/http-response.html#settrailer)
