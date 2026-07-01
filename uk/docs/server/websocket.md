---
layout: docs
lang: uk
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /uk/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): full-duplex з'єднання за RFC 6455, backpressure, keepalive, subprotocol negotiation, permessage-deflate."
---

# WebSocket

(PHP 8.6+, true_async_server 0.9+)

`HttpServer::addWebSocketHandler()` реєструє обробник full-duplex з'єднань за RFC 6455.

З'єднання починається як звичайний HTTP-запит, а потім клієнт просить сервер перемкнути його на
інший протокол прямо на цьому самому TCP-з'єднанні: це і називається Upgrade. Сервер відповідає
статусом `101 Switching Protocols`, і далі по тому самому з'єднанню йде вже не HTTP, а WebSocket.
Підтримується:

- Upgrade з HTTP/1.1 (класичний заголовок `Connection: Upgrade`).
- Upgrade з HTTP/2 (RFC 8441 Extended CONNECT).
- `wss://` (WebSocket поверх TLS).
- permessage-deflate (RFC 7692) — стиснення повідомлень на рівні протоколу.

> Реалізація перевірена набором тестів Autobahn|Testsuite і проходить усі 246 тестів категорії
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

Кожне з'єднання обслуговується власною корутиною: та сама модель, що і у звичайних HTTP-запитів.

## Життєвий цикл

З'єднання живе, поки не повернеться корутина-обробник. Якщо обробник просто завершився (наприклад,
`recv()`/`foreach` повернув `null` наприкінці циклу), сервер сам закриє з'єднання кодом `1000
Normal`. Явний `close()` до `return` потрібен лише тоді, коли треба інший код або свій текст
причини.

## Приймання повідомлень: `recv()` і `foreach`

```php
public WebSocket::recv(): ?WebSocketMessage
```

Призупиняє корутину доти, доки не прийде наступне повідомлення або з'єднання не закриється.
Повертає [`WebSocketMessage`](/uk/docs/reference/server/websocket.html#websocketmessage) або
`null`, якщо клієнт закрив з'єднання штатно (звичайний код закриття або розрив без явного CLOSE):

```php
while (($msg = $ws->recv()) !== null) {
    handle($msg->data, $msg->binary);
}
```

`WebSocket` реалізує `\Iterator`, тому той самий цикл можна записати коротше:
`foreach ($ws as $msg) { ... }`. Штатне закриття просто завершує `foreach`, а закриття з помилкою
кидає `WebSocketClosedException` прямо з циклу.

Читати повідомлення потрібно з одного місця: якщо викликати `recv()` з двох корутин паралельно на
тому самому з'єднанні, другий виклик отримає виняток `WebSocketConcurrentReadException`. Якщо
повідомлення потрібно роздати кільком обробникам, тримайте один `recv()`-цикл і розподіляйте
повідомлення з нього самі.

## Надсилання повідомлень: `send()`, `trySend()`

`send()` і `sendBinary()` можна безпечно викликати з будь-якої корутини, зокрема одночасно з
кількох: сервер сам стежить, щоб дані різних викликів не змішувалися на проводі.

```php
$ws->send('text frame');       // текст ПОВИНЕН бути валідним UTF-8
$ws->sendBinary($binaryData);  // бінарні дані, без обмеження на кодування
```

Зазвичай ці функції повертають керування одразу. Якщо клієнт читає повільно і буфер на відправку
заповнюється, корутина призупиняється і продовжить роботу, коли клієнт трохи розвантажить буфер.
Якщо очікування затягується довше `write_timeout_ms`, летить виняток
`WebSocketBackpressureException`, і обробник вирішує, що робити: відкинути повідомлення, закрити
з'єднання або повторити спробу.

Для розсилки одного повідомлення багатьом клієнтам, де один повільний клієнт не повинен затримувати
решту, є неблокувальні варіанти:

```php
if (!$ws->trySend($text)) {
    // буфер цього клієнта заповнений, повідомлення НЕ надіслано, клієнт відстає
}
```

`trySend()`/`trySendBinary()` ніколи не призупиняють корутину: вони одразу повертають `true`, якщо
повідомлення прийнято, і `false`, якщо буфер заповнений (тоді повідомлення просто не надсилається).
Розмір цього буфера задає
[`HttpServerConfig::setStreamWriteBufferBytes()`](/uk/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(`0` знімає обмеження: `trySend()` тоді завжди надсилає і повертає `true`).

## Закриття з'єднання: `close()`, `isClosed()`

```php
$ws->close(WebSocketCloseCode::NORMAL, 'bye');
```

Ініціює закриття з'єднання. Можна викликати багаторазово: повторні виклики нічого не роблять. Код
закриття задається значенням
[`WebSocketCloseCode`](/uk/docs/reference/server/websocket.html#websocketclosecode) або цілим
числом `4000..4999` (діапазон для власних, не стандартних кодів). `$reason` приймає текст причини в
UTF-8, до 123 байт.

`isClosed()` повертає `true` після `close()` або після того, як клієнт сам надіслав сигнал про
закриття.

## Ping і keepalive

```php
$ws->ping('optional payload');   // до 125 байт, RFC 6455 §5.5
```

Застосунку рідко потрібно кликати `ping()` вручну: сервер сам надсилає PING на з'єднаннях, де давно
не було активності, за таймером `HttpServerConfig::setWsPingIntervalMs()`. Якщо клієнт не відповість
вчасно (`setWsPongTimeoutMs()`), сервер сам закриє з'єднання. Подробиці конфігурації дивіться в
[Конфігурації](/uk/docs/server/configuration.html#websocket).

## Subprotocol і відмова у підключенні: `WebSocketUpgrade`

За замовчуванням обробник отримує тільки `WebSocket $ws`. Щоб самому вирішувати, чи приймати
підключення і який subprotocol вибрати, зареєструйте обробник із трьома параметрами: сервер сам
визначає їхню кількість і в цьому разі додає третій об'єкт `WebSocketUpgrade`:

```php
use TrueAsync\WebSocket;
use TrueAsync\HttpRequest;
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    $offered = $u->getOfferedSubprotocols();   // із заголовка Sec-WebSocket-Protocol

    if (!in_array('chat.v2', $offered, true)) {
        $u->reject(400, 'unsupported subprotocol');
        return;
    }

    $u->setSubprotocol('chat.v2');   // потрібно викликати до return або до reject()

    foreach ($ws as $msg) {
        // ...
    }
});
```

`WebSocketUpgrade` живе з моменту виклику обробника до `reject()` або до успішного `return` (тоді
сервер завершує підключення з вибраним subprotocol'ом). Після цього моменту будь-який виклик на
цьому об'єкті кидає виняток: змінити subprotocol уже не можна, відповідь клієнту вже надіслана.

`getOfferedExtensions()` повертає список розширень, які запропонував клієнт. permessage-deflate
(RFC 7692, стиснення повідомлень) сервер узгоджує сам через
`HttpServerConfig::setWsPermessageDeflate()`, решта значень зі списку суто інформаційні.

## Коди закриття і винятки

Перелік (enum) `WebSocketCloseCode` містить стандартні коди закриття за RFC 6455 (`NORMAL`,
`GOING_AWAY`, `PROTOCOL_ERROR`, `MESSAGE_TOO_BIG` та інші). Ієрархія винятків:

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // клієнт довго не читає
              └── WebSocketConcurrentReadException  // другий recv() паралельно
```

Штатне закриття клієнтом виражається через `null` з `recv()`, а не через виняток. Виняток летить
лише при протокольній помилці або закритті з явним кодом помилки; `$closeCode`/`$closeReason` несуть
причину. Подробиці дивіться в [довіднику](/uk/docs/reference/server/websocket.html).

## Конфігурація

| Метод | За замовчуванням | Призначення |
|-------|-------------------|-------------|
| `setWsMaxMessageSize($bytes)` | 1 MiB | максимум на пересібране повідомлення, інакше `1009` |
| `setWsMaxFrameSize($bytes)` | 1 MiB | максимум на один фрейм, захист від потоку крихітних фрагментів |
| `setWsPingIntervalMs($ms)` | 30000 | як часто сервер надсилає PING на простої, `0` вимикає |
| `setWsPongTimeoutMs($ms)` | 60000 | скільки чекати PONG перед розривом (`1001`) |
| `setWsPermessageDeflate($bool)` | `false` | RFC 7692, опційно через навантаження на CPU |

Детальніше дивіться в [Конфігурації](/uk/docs/server/configuration.html#websocket).

## Див. також

- [`TrueAsync\WebSocket` та пов'язані класи](/uk/docs/reference/server/websocket.html): повний
  довідник
- [`HttpServer::addWebSocketHandler()`](/uk/docs/reference/server/http-server.html#addwebsockethandler)
- [Конфігурація: WebSocket](/uk/docs/server/configuration.html#websocket)
