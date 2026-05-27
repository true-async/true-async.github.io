---
layout: docs
lang: ru
path_key: "/docs/server/streaming.html"
nav_active: docs
permalink: /ru/docs/server/streaming.html
page_title: "TrueAsync Server: стриминг запроса и ответа"
description: "readBody(): pull-based стрим тела запроса. send()/sendable(): chunked стрим ответа с backpressure. Trailers HTTP/2."
---

# Стриминг запроса и ответа

(PHP 8.6+, true_async_server 0.6+)

## Стрим тела запроса: `readBody()`

По умолчанию обработчик получает уже полностью прочитанное тело (`HttpRequest::getBody()`).
С `HttpServerConfig::setBodyStreamingEnabled(true)` парсеры H1/H2 кладут DATA-чанки в per-request
FIFO, и обработчик читает их по одному через `HttpRequest::readBody()`.

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

- Один вызов `readBody()` возвращает **один** parser-supplied chunk:
  - H2 DATA-фрейм (по умолчанию до 16 KiB),
  - llhttp `on_body` slice (ограничен read-buffer'ом H1 = 8 KiB).
- При пустой очереди корутина паркуется на per-request trigger event.
- На EOF возвращается `null` (идемпотентно).
- При ошибке стрима (peer reset, превышение `max_body_size`) бросается `\Exception`.
- Параметр `$maxLen` сейчас зарезервирован для будущего coalesce и игнорируется. Сигнатура держится
  binary-compatible с грядущей доводкой (issue #26).

### Когда включать

- Большие uploads (логи, медиа, бэкапы)
- Стриминг-парсинг (NDJSON, MessagePack stream)
- Сервисы, где tail-latency деградирует от удержания тела в RAM
- Multipart **всегда** стрим, независимо от `setBodyStreamingEnabled()`

Когда **не** включать: REST-эндпоинты, где тело компактное и удобнее работать с `getBody()`/`getPost()`/
`getQuery()` целиком. Combined-mode (стрим только когда тело > X) не поддерживается;
`getBody()` в streaming-режиме бросает `LogicException` (запланировано в roadmap).

### Memory footprint

На 50 параллельных 20-MiB POST'ах (h2load, WSL2): peak RSS падает 1170 MiB → **197 MiB** (×6).
Пропускная способность растёт 36 req/s → **100 req/s** (×2.7), потому что dispatch обработчика больше
не ждёт полного тела.

## Стрим ответа: `send()` / `sendable()`

Простейший ответ через `setBody()` / `json()` / `html()` / `redirect()` отправляется одним куском.

Для стрим-ответа (chunked H1, DATA-фреймы H2) используется `send($chunk)`:

```php
$server->addHttpHandler(function ($req, $res) {
    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setNoCompression();   // SSE: события должны достигать клиента сразу

    // Первый send() коммитит статус + заголовки (изменить их уже нельзя)
    foreach (generateEvents() as $event) {
        $res->send("data: " . json_encode($event) . "\n\n");
    }
});
```

### Backpressure

`send()` блокирует handler-корутину **только** под backpressure: per-stream staging buffer заполнен.
В нормальном случае возвращается сразу.

HTTP/2: backpressure включается при заполнении ring-slot'ов **или** превышении
`HttpServerConfig::setStreamWriteBufferBytes()` (дефолт 256 KiB).
HTTP/1 chunked: использует kernel send-buffer.

### `sendable()`

Advisory non-blocking проверка: вернёт `true`, если `send()` примет чанк без suspend'а корутины.
`false` означает: `send()` заблокирует, либо response закрыт/sealed `sendFile()`'ом, либо это
не streaming-capable тип ответа.

```php
foreach ($events as $event) {
    if (!$res->sendable()) {
        // не хочется ждать медленного клиента, займёмся другим
        $event->save();   // дописать в БД
        continue;
    }
    $res->send($event->encode());
}
```

`send()` **всегда** безопасно вызывать, независимо от `sendable()`. Последний просто даёт handler'у
шанс заняться другой работой вместо блокировки на медленном peer'е.

## HTTP/2 trailers

HTTP/2 поддерживает HEADERS-фрейм после тела (trailers). Канонический потребитель — gRPC
(`grpc-status` в trailer).

```php
$res->setStatusCode(200);
$res->send($body);
$res->setTrailer('grpc-status', '0');
$res->setTrailer('grpc-message', 'OK');
```

Bulk-set:

```php
$res->setTrailers(['grpc-status' => '0', 'grpc-message' => 'OK']);
$res->resetTrailers();   // снять все
$res->getTrailers();
```

На HTTP/1.1 значение **молча игнорируется**: chunked-encoding trailer emission не в области
Step 5b.

> Имена trailers пишутся в lowercase (RFC 9113 §8.2.2); uppercase автоматически приводится.

## См. также

- [`HttpServerConfig::setBodyStreamingEnabled()`](/ru/docs/reference/server/http-server-config.html#setbodystreamingenabled)
- [`HttpServerConfig::setStreamWriteBufferBytes()`](/ru/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
- [`HttpRequest::readBody()`](/ru/docs/reference/server/http-request.html#readbody)
- [`HttpResponse::send()`](/ru/docs/reference/server/http-response.html#send)
- [`HttpResponse::sendable()`](/ru/docs/reference/server/http-response.html#sendable)
- [`HttpResponse::setTrailer()`](/ru/docs/reference/server/http-response.html#settrailer)
