---
layout: docs
lang: ru
path_key: "/docs/server/streaming.html"
nav_active: docs
permalink: /ru/docs/server/streaming.html
page_title: "TrueAsync Server: потоковая передача запроса и ответа"
description: "readBody(): чтение тела запроса блоками. send()/sendable(): отправка ответа блоками с обратным давлением. HTTP/2 trailers."
---

# Потоковая передача запроса и ответа

(PHP 8.6+, true_async_server 0.6+)

## Чтение тела запроса блоками: `readBody()`

По умолчанию обработчик получает уже полностью прочитанное тело (`HttpRequest::getBody()`).
С `HttpServerConfig::setBodyStreamingEnabled(true)` парсеры H1/H2 кладут DATA-блоки в очередь
FIFO, привязанную к запросу, а обработчик забирает их по одному через `HttpRequest::readBody()`.

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

- Один вызов `readBody()` возвращает **один** блок, полученный от парсера:
  - DATA-фрейм H2 (по умолчанию до 16 KiB);
  - срез из `on_body` llhttp (ограничен буфером чтения H1 = 8 KiB).
- Когда очередь пуста, корутина приостанавливается на событии-триггере запроса.
- По достижении конца потока возвращается `null` (идемпотентно).
- При ошибке потока (peer reset, превышение `max_body_size`) бросается `\Exception`.
- Параметр `$maxLen` сейчас зарезервирован для будущей склейки блоков и игнорируется. Сигнатура
  держится бинарно-совместимой с предстоящей доводкой (issue #26).

### Когда включать

- Большие загрузки файлов (логи, медиа, бэкапы).
- Потоковый парсинг (NDJSON, MessagePack stream).
- Сервисы, у которых хвостовая задержка (p99) ухудшается от удержания тела в памяти.
- Multipart **всегда** идёт потоком, независимо от `setBodyStreamingEnabled()`.

Когда **не** включать: REST-эндпоинты, где тело компактное и удобнее работать с `getBody()`/`getPost()`/
`getQuery()` целиком. Комбинированный режим (поток только когда тело > X) не поддерживается;
`getBody()` в потоковом режиме бросает `LogicException` (запланировано в дорожной карте).

### Потребление памяти

На 50 параллельных POST-запросах по 20 MiB (h2load, WSL2): пиковый RSS падает с 1170 MiB до
**197 MiB** (в 6 раз). Пропускная способность растёт с 36 req/s до **100 req/s** (×2.7), потому что
вызов обработчика больше не ждёт полного тела.

## Отправка ответа блоками: `send()` / `sendable()`

Простейший ответ через `setBody()` / `json()` / `html()` / `redirect()` уходит одним куском.

Для потоковой отправки (chunked-передача в H1, DATA-фреймы в H2) используется `send($chunk)`:

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

### Обратное давление (backpressure)

`send()` приостанавливает корутину обработчика **только** при обратном давлении: когда промежуточный
буфер потока заполнен. В обычной ситуации функция возвращает управление сразу.

HTTP/2: давление включается при заполнении слотов кольцевого буфера **либо** при превышении
`HttpServerConfig::setStreamWriteBufferBytes()` (по умолчанию 256 KiB).
HTTP/1 chunked использует системный буфер отправки ядра.

### `sendable()`

Рекомендательная неблокирующая проверка: вернёт `true`, если `send()` примет блок без приостановки
корутины. `false` означает одно из трёх: `send()` приостановится, ответ закрыт или запечатан вызовом
`sendFile()`, либо это не тот тип ответа, который поддерживает потоковую передачу.

```php
foreach ($events as $event) {
    if (!$res->sendable()) {
        // не хочется ждать медленного клиента — займёмся другим
        $event->save();   // дописать в БД
        continue;
    }
    $res->send($event->encode());
}
```

`send()` **всегда** безопасно вызывать, независимо от `sendable()`. Последний просто даёт обработчику
шанс заняться другой работой вместо ожидания на медленном клиенте.

## HTTP/2 trailers

HTTP/2 поддерживает HEADERS-фрейм после тела (trailers). Канонический потребитель — gRPC
(`grpc-status` в trailer).

```php
$res->setStatusCode(200);
$res->send($body);
$res->setTrailer('grpc-status', '0');
$res->setTrailer('grpc-message', 'OK');
```

Массовая установка:

```php
$res->setTrailers(['grpc-status' => '0', 'grpc-message' => 'OK']);
$res->resetTrailers();   // снять все
$res->getTrailers();
```

На HTTP/1.1 значение **молча игнорируется**: отправка trailer-ов в chunked-кодировании пока не
реализована (Step 5b).

> Имена trailer-ов пишутся в нижнем регистре (RFC 9113 §8.2.2); верхний регистр приводится автоматически.

## См. также

- [`HttpServerConfig::setBodyStreamingEnabled()`](/ru/docs/reference/server/http-server-config.html#setbodystreamingenabled)
- [`HttpServerConfig::setStreamWriteBufferBytes()`](/ru/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
- [`HttpRequest::readBody()`](/ru/docs/reference/server/http-request.html#readbody)
- [`HttpResponse::send()`](/ru/docs/reference/server/http-response.html#send)
- [`HttpResponse::sendable()`](/ru/docs/reference/server/http-response.html#sendable)
- [`HttpResponse::setTrailer()`](/ru/docs/reference/server/http-response.html#settrailer)
