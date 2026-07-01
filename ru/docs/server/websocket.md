---
layout: docs
lang: ru
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /ru/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): full-duplex соединения по RFC 6455, backpressure, keepalive, subprotocol negotiation, permessage-deflate."
---

# WebSocket

(PHP 8.6+, true_async_server 0.9+)

`HttpServer::addWebSocketHandler()` регистрирует обработчик full-duplex соединений по RFC 6455.

Соединение начинается как обычный HTTP-запрос, а затем клиент просит сервер переключить его на
другой протокол прямо на этом же TCP-соединении: это и называется Upgrade. Сервер отвечает
статусом `101 Switching Protocols`, и дальше по тому же соединению идёт уже не HTTP, а WebSocket.
Поддерживается:

- Upgrade с HTTP/1.1 (классический заголовок `Connection: Upgrade`).
- Upgrade с HTTP/2 (RFC 8441 Extended CONNECT).
- `wss://` (WebSocket поверх TLS).
- permessage-deflate (RFC 7692) — сжатие сообщений на уровне протокола.

> Реализация проверена набором тестов Autobahn|Testsuite и проходит все 246 тестов категории
> `behavior`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\WebSocket;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
);

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});

$server->start();
```

Каждое соединение обслуживается своей корутиной: та же модель, что и у обычных HTTP-запросов.

## Жизненный цикл

Соединение живёт, пока не вернётся корутина-обработчик. Если обработчик просто завершился
(например, `recv()`/`foreach` вернул `null` в конце цикла), сервер сам закроет соединение кодом
`1000 Normal`. Явный `close()` до `return` нужен только тогда, когда требуется другой код или
свой текст причины.

## Приём сообщений: `recv()` и `foreach`

```php
public WebSocket::recv(): ?WebSocketMessage
```

Приостанавливает корутину до тех пор, пока не придёт следующее сообщение или соединение не
закроется. Возвращает
[`WebSocketMessage`](/ru/docs/reference/server/websocket.html#websocketmessage) или `null`, если
клиент закрыл соединение штатно (обычный код закрытия или разрыв без явного CLOSE):

```php
while (($msg = $ws->recv()) !== null) {
    handle($msg->data, $msg->binary);
}
```

`WebSocket` реализует `\Iterator`, поэтому тот же цикл можно записать короче:
`foreach ($ws as $msg) { ... }`. Штатное закрытие просто завершает `foreach`, а закрытие с
ошибкой бросает `WebSocketClosedException` прямо из цикла.

Читать сообщения нужно из одного места: если вызвать `recv()` из двух корутин параллельно на
одном и том же соединении, второй вызов получит исключение `WebSocketConcurrentReadException`.
Если сообщения нужно раздать нескольким обработчикам, держите один `recv()`-цикл и
распределяйте сообщения из него сами.

## Отправка сообщений: `send()`, `trySend()`

`send()` и `sendBinary()` можно безопасно вызывать из любой корутины, в том числе одновременно
из нескольких: сервер сам следит, чтобы данные разных вызовов не перемешались на проводе.

```php
$ws->send('text frame');       // текст ДОЛЖЕН быть валидный UTF-8
$ws->sendBinary($binaryData);  // бинарные данные, без ограничения на кодировку
```

Обычно эти функции возвращают управление сразу же. Если клиент читает медленно и буфер на
отправку заполняется, корутина приостанавливается и продолжит работу, когда клиент немного
разгрузит буфер. Если ожидание затягивается дольше `write_timeout_ms`, летит исключение
`WebSocketBackpressureException`, и обработчик решает, что делать: отбросить сообщение, закрыть
соединение или повторить попытку.

Для рассылки одного сообщения многим клиентам, где один медленный клиент не должен задерживать
остальных, есть неблокирующие варианты:

```php
if (!$ws->trySend($text)) {
    // буфер этого клиента заполнен, сообщение НЕ отправлено, клиент отстаёт
}
```

`trySend()`/`trySendBinary()` никогда не приостанавливают корутину: они сразу возвращают `true`,
если сообщение принято, и `false`, если буфер заполнен (тогда сообщение просто не отправляется).
Размер этого буфера задаёт
[`HttpServerConfig::setStreamWriteBufferBytes()`](/ru/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(`0` отключает лимит: `trySend()` тогда всегда отправляет и возвращает `true`).

## Закрытие соединения: `close()`, `isClosed()`

```php
$ws->close(WebSocketCloseCode::NORMAL, 'bye');
```

Инициирует закрытие соединения. Можно вызывать многократно: повторные вызовы ничего не делают.
Код закрытия задаётся значением
[`WebSocketCloseCode`](/ru/docs/reference/server/websocket.html#websocketclosecode) или целым
числом `4000..4999` (диапазон для собственных, не стандартных кодов). `$reason` принимает текст
причины в UTF-8, до 123 байт.

`isClosed()` возвращает `true` после `close()` или после того, как клиент сам прислал сигнал о
закрытии.

## Ping и keepalive

```php
$ws->ping('optional payload');   // до 125 байт, RFC 6455 §5.5
```

Приложению редко нужно звать `ping()` вручную: сервер сам шлёт PING на соединениях, где давно не
было активности, по таймеру `HttpServerConfig::setWsPingIntervalMs()`. Если клиент не ответит
вовремя (`setWsPongTimeoutMs()`), сервер сам закроет соединение. Подробности конфигурации
смотрите в [Конфигурации](/ru/docs/server/configuration.html#websocket).

## Subprotocol и отказ в подключении: `WebSocketUpgrade`

По умолчанию обработчик получает только `WebSocket $ws`. Чтобы самому решать, принимать ли
подключение и какой subprotocol выбрать, зарегистрируйте обработчик с тремя параметрами: сервер
сам определяет их количество и в этом случае добавляет третий объект `WebSocketUpgrade`:

```php
use TrueAsync\WebSocket;
use TrueAsync\HttpRequest;
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    $offered = $u->getOfferedSubprotocols();   // из заголовка Sec-WebSocket-Protocol

    if (!in_array('chat.v2', $offered, true)) {
        $u->reject(400, 'unsupported subprotocol');
        return;
    }

    $u->setSubprotocol('chat.v2');   // нужно вызвать до return или до reject()

    foreach ($ws as $msg) {
        // ...
    }
});
```

`WebSocketUpgrade` живёт с момента вызова обработчика до `reject()` или до успешного `return`
(тогда сервер завершает подключение с выбранным subprotocol'ом). После этого момента любой вызов
на этом объекте бросает исключение: изменить subprotocol уже нельзя, ответ клиенту уже отправлен.

`getOfferedExtensions()` возвращает список расширений, которые предложил клиент. permessage-deflate
(RFC 7692, сжатие сообщений) сервер согласовывает сам через
`HttpServerConfig::setWsPermessageDeflate()`, остальные значения из списка чисто информационные.

## Коды закрытия и исключения

Перечисление (enum) `WebSocketCloseCode` содержит стандартные коды закрытия по RFC 6455 (`NORMAL`, `GOING_AWAY`, `PROTOCOL_ERROR`, `MESSAGE_TOO_BIG` и другие). Иерархия исключений:

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // клиент долго не читает
              └── WebSocketConcurrentReadException  // второй recv() параллельно
```

Штатное закрытие клиентом выражается через `null` из `recv()`, а не через исключение. Исключение
летит только при протокольной ошибке или закрытии с явным кодом ошибки; `$closeCode`/
`$closeReason` несут причину. Подробности смотрите в
[справочнике](/ru/docs/reference/server/websocket.html).

## Конфигурация

| Метод | По умолчанию | Назначение |
|-------|--------------|------------|
| `setWsMaxMessageSize($bytes)` | 1 MiB | максимум на пересобранное сообщение, иначе `1009` |
| `setWsMaxFrameSize($bytes)` | 1 MiB | максимум на один фрейм, защита от потока крошечных фрагментов |
| `setWsPingIntervalMs($ms)` | 30000 | как часто сервер шлёт PING на простое, `0` выключает |
| `setWsPongTimeoutMs($ms)` | 60000 | сколько ждать PONG перед разрывом (`1001`) |
| `setWsPermessageDeflate($bool)` | `false` | RFC 7692, опционально из-за нагрузки на CPU |

Подробнее смотрите в [Конфигурации](/ru/docs/server/configuration.html#websocket).

## См. также

- [`TrueAsync\WebSocket` и связанные классы](/ru/docs/reference/server/websocket.html): полный
  справочник
- [`HttpServer::addWebSocketHandler()`](/ru/docs/reference/server/http-server.html#addwebsockethandler)
- [Конфигурация: WebSocket](/ru/docs/server/configuration.html#websocket)
