---
layout: docs
lang: ru
path_key: "/docs/reference/server/websocket.html"
nav_active: docs
permalink: /ru/docs/reference/server/websocket.html
page_title: "TrueAsync\\WebSocket"
description: "TrueAsync\\WebSocket, WebSocketMessage, WebSocketUpgrade, WebSocketCloseCode и иерархия исключений WebSocket."
---

# TrueAsync\WebSocket

(PHP 8.6+, true_async_server 0.9+)

Классы full-duplex соединения по RFC 6455. Руководство с примерами:
[WebSocket](/ru/docs/server/websocket.html).

## TrueAsync\WebSocket

Одно WebSocket-соединение. Создаётся сервером сразу после коммита upgrade-handshake и
передаётся первым аргументом в обработчик, зарегистрированный через
[`HttpServer::addWebSocketHandler()`](/ru/docs/reference/server/http-server.html#addwebsockethandler).

```php
namespace TrueAsync;

final class WebSocket implements \Iterator
{
    public function recv(): ?WebSocketMessage;

    public function send(string $text): void;
    public function sendBinary(string $data): void;
    public function trySend(string $text): bool;
    public function trySendBinary(string $data): bool;

    public function ping(string $payload = ''): void;
    public function close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void;

    public function isClosed(): bool;
    public function getSubprotocol(): ?string;
    public function getRemoteAddress(): string;

    // Iterator
    public function current(): ?WebSocketMessage;
    public function key(): int;
    public function next(): void;
    public function rewind(): void;
    public function valid(): bool;
}
```

Экземпляры конструируются только сервером, `new WebSocket` недоступен пользовательскому коду.

### Жизненный цикл

Соединение привязано к корутине обработчика. Когда обработчик возвращает управление по любой
причине, включая `return` из `recv()`-цикла на `null`, сервер закрывает соединение кодом
`1000 Normal`. Явный `close()` до `return` нужен только тогда, когда требуется другой код или
текст причины закрытия.

### Модель конкурентности

- `send()`, `sendBinary()` и `ping()` можно безопасно вызывать из нескольких корутин
  одновременно: сервер сам следит за очередностью отправки, поэтому данные разных вызовов не
  перемешаются на проводе.
- У `recv()` может быть только один вызывающий одновременно. Если вызвать `recv()` из двух
  корутин параллельно, второй вызов сразу получит исключение `WebSocketConcurrentReadException`.
  Читать сообщения нужно строго из одного места кода, в одном цикле.
- `close()` можно вызывать многократно и из любой корутины: повторные вызовы ничего не делают.

### recv

```php
public WebSocket::recv(): ?WebSocketMessage
```

Принимает следующее текстовое или бинарное сообщение. Приостанавливает вызывающую корутину до
полного сообщения или закрытия соединения.

Возвращает [`WebSocketMessage`](#websocketmessage) или `null`, когда клиент закрыл соединение
штатно: нормальный код CLOSE (`1000`/`1001`/`1005`) или разрыв без CLOSE-фрейма. Типичный цикл:
`while (($m = $ws->recv()) !== null) { ... }`.

Метод выбрасывает исключения:

- `WebSocketClosedException` — при протокольной ошибке или явном error-коде закрытия;
  `$closeCode`/`$closeReason` несут код и текст причины по RFC 6455.
- `WebSocketConcurrentReadException` — если другая корутина уже вызвала `recv()` на этом же
  соединении и ещё не получила ответ.

### send

```php
public WebSocket::send(string $text): void
```

Отправляет текстовый фрейм. `$text` **должен** быть валидным UTF-8: невалидные данные
отклоняются сразу, чтобы получатель никогда не увидел кадр, нарушающий RFC 6455 §5.6.

В обычной ситуации функция возвращает управление сразу же. Если буфер на отправку заполнен
(клиент медленно читает), корутина приостанавливается и продолжится, когда буфер освободится.
Если ожидание затягивается дольше `write_timeout_ms`, метод бросает исключение
`WebSocketBackpressureException`, и обработчик решает, что делать: отбросить сообщение, закрыть
соединение или повторить попытку позже.

Метод также бросает `WebSocketClosedException`, если соединение уже закрыто.

### sendBinary

```php
public WebSocket::sendBinary(string $data): void
```

Отправляет бинарный фрейм. Бинарные данные не имеют ограничения на UTF-8. Поведение при
переполнении буфера отправки такое же, как у `send()`.

### trySend

```php
public WebSocket::trySend(string $text): bool
```

Неблокирующая отправка. Если буфер на отправку не заполнен, ставит текстовый фрейм в очередь и
возвращает `true`. Если буфер уже заполнен, ничего не отправляет и возвращает `false`: вызывающий
код сам решает, отбросить сообщение, замедлиться или закрыть соединение. В отличие от `send()`,
`trySend()` никогда не приостанавливает корутину, поэтому хорошо подходит для рассылки одного
сообщения многим клиентам, когда один медленный клиент не должен задерживать остальных.

Насколько большим может быть буфер на отправку, задаёт
[`HttpServerConfig::setStreamWriteBufferBytes()`](/ru/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(значение `0` отключает лимит: `trySend()` тогда всегда ставит сообщение в очередь и возвращает
`true`).

Функция возвращает `true`, если сообщение принято в очередь, и `false`, если буфер отправки
переполнен и клиент не успевает читать. Бросает `WebSocketClosedException`, если соединение уже
закрыто.

### trySendBinary

```php
public WebSocket::trySendBinary(string $data): bool
```

Неблокирующая бинарная отправка. Ведёт себя так же, как `trySend()`.

### ping

```php
public WebSocket::ping(string $payload = ''): void
```

Отправляет PING-фрейм. По RFC 6455 §5.5.2 клиент обязан ответить PONG. Прикладному коду редко
нужно звать это вручную: таймер keepalive сервера (`HttpServerConfig::setWsPingIntervalMs()`)
шлёт PING'и автоматически, если он сконфигурирован.

`$payload` принимает до 125 байт (RFC 6455 §5.5).

### close

```php
public WebSocket::close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void
```

Инициирует закрытие соединения. Можно вызывать многократно: повторные вызовы ничего не делают.

- `$code` — значение `WebSocketCloseCode` или целое число `4000..4999` (диапазон для
  собственных, не стандартных кодов, по RFC 6455 §7.4.2).
- `$reason` — текст причины в UTF-8, до 123 байт.

### isClosed

```php
public WebSocket::isClosed(): bool
```

`true` после вызова `close()` или после того, как клиент прислал CLOSE-фрейм.

### getSubprotocol

```php
public WebSocket::getSubprotocol(): ?string
```

Subprotocol, согласованный во время upgrade, или `null`, если ни один не выбран.

### getRemoteAddress

```php
public WebSocket::getRemoteAddress(): string
```

Адрес клиента в форме `host:port` (IPv4) или `[host]:port` (IPv6) для TCP-соединений. Пустая
строка для соединений через Unix-сокет.

### Iterator

```php
public WebSocket::current(): ?WebSocketMessage
public WebSocket::key(): int
public WebSocket::next(): void
public WebSocket::rewind(): void
public WebSocket::valid(): bool
```

Позволяет писать `foreach ($ws as $msg)` вместо ручного `recv()`-цикла. На каждом шаге цикл
забирает следующее сообщение; штатное закрытие соединения просто завершает `foreach`, а закрытие
с ошибкой бросает `WebSocketClosedException` прямо из цикла.

## TrueAsync\WebSocketMessage {#websocketmessage}

```php
namespace TrueAsync;

final class WebSocketMessage
{
    public readonly string $data;
    public readonly bool $binary;
}
```

Одно полностью собранное сообщение, которое отдаёт `WebSocket::recv()`. Текстовые сообщения уже
проверены на валидность UTF-8, поэтому можно использовать `$data` как есть, без повторной
проверки.

- **`$data`** — содержимое сообщения. Для текстовых сообщений это валидная UTF-8 строка.
- **`$binary`** — `true`, если сообщение было отправлено как бинарное, `false` для текстового.

Экземпляры конструируются только сервером. Получить их можно только через `WebSocket::recv()`,
создать `new WebSocketMessage` вручную нельзя.

## TrueAsync\WebSocketUpgrade

```php
namespace TrueAsync;

final class WebSocketUpgrade
{
    public function reject(int $status, string $reason = ''): void;
    public function setSubprotocol(string $name): void;
    public function getOfferedSubprotocols(): array;
    public function getOfferedExtensions(): array;
}
```

Объект, представляющий upgrade в процессе согласования. Существует с момента вызова обработчика
до вызова `reject()` либо до успешного `return` (тогда сервер отправляет `101` с subprotocol'ом,
выбранным через `setSubprotocol()`).

Доступен только обработчикам, зарегистрированным с тремя параметрами:

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    // ...
});
```

Сервер сам определяет, сколько параметров указано в обработчике, и передаёт `WebSocketUpgrade`
только если их три. Обработчик с двумя параметрами этот объект не получает и upgrade принимается
с настройками по умолчанию.

После того как handshake завершён, любой вызов на этом объекте бросает исключение:
`Sec-WebSocket-Protocol` уже отправлен клиенту, subprotocol больше нельзя поменять.

### reject

```php
public WebSocketUpgrade::reject(int $status, string $reason = ''): void
```

Отклоняет upgrade с заданным HTTP-статусом. `101` не отправляется; клиент получает выбранный
статус, и соединение закрывается. После `reject()` обработчик должен сразу завершить работу:
дальнейший обмен данными не допускается.

- `$status` — HTTP-код (должен быть 4xx или 5xx).
- `$reason` — необязательное тело ответа.

### setSubprotocol

```php
public WebSocketUpgrade::setSubprotocol(string $name): void
```

Выбирает subprotocol из списка, предложенного клиентом. Выбранное значение попадёт в заголовок
`Sec-WebSocket-Protocol` ответа. Вызывать нужно до `return` из обработчика и до `reject()`.
Сервер не проверяет, что выбранное значение действительно входит в список из
`getOfferedSubprotocols()`, за это отвечает сам обработчик.

### getOfferedSubprotocols

```php
public WebSocketUpgrade::getOfferedSubprotocols(): array
```

Возвращает список subprotocol'ов (`string[]`), которые клиент прислал в заголовке
`Sec-WebSocket-Protocol`, в порядке его предпочтения. Пустой массив, если клиент ничего не
предложил.

### getOfferedExtensions

```php
public WebSocketUpgrade::getOfferedExtensions(): array
```

Возвращает список расширений (`string[]`) из заголовка `Sec-WebSocket-Extensions`, в порядке
предпочтения клиента. permessage-deflate (RFC 7692, сжатие сообщений) сервер согласовывает сам
через `HttpServerConfig::setWsPermessageDeflate()`, остальные значения из списка чисто
информационные. Пустой массив, если клиент ничего не предложил.

## TrueAsync\WebSocketCloseCode

```php
namespace TrueAsync;

enum WebSocketCloseCode: int
{
    case NORMAL                = 1000;
    case GOING_AWAY            = 1001;
    case PROTOCOL_ERROR        = 1002;
    case UNSUPPORTED_DATA      = 1003;
    case NO_STATUS             = 1005;  // RESERVED
    case ABNORMAL_CLOSURE      = 1006;  // RESERVED
    case INVALID_FRAME_PAYLOAD = 1007;
    case POLICY_VIOLATION      = 1008;
    case MESSAGE_TOO_BIG       = 1009;
    case MANDATORY_EXTENSION   = 1010;
    case INTERNAL_SERVER_ERROR = 1011;
    case TLS_HANDSHAKE         = 1015;  // RESERVED
}
```

Стандартные коды закрытия соединения по RFC 6455 §7.4.1. Свои, не стандартные коды тоже
разрешены: `WebSocket::close()` принимает как значение этого enum, так и целое число в диапазоне
`4000..4999` (RFC 6455 §7.4.2).

## Исключения

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // final
              ├── WebSocketBackpressureException    // final
              └── WebSocketConcurrentReadException  // final
```

### TrueAsync\WebSocketException

```php
class WebSocketException extends HttpServerException {}
```

Базовое исключение для всех ошибок WebSocket. Расширяет общий для сервера
`HttpServerException`, так что существующие catch-all обработчики продолжают работать.

### TrueAsync\WebSocketClosedException

```php
final class WebSocketClosedException extends WebSocketException
{
    public readonly int $closeCode;
    public readonly string $closeReason;
}
```

Соединение закрыто не штатным образом, а по другой причине: протокольная ошибка или явный
error-код от клиента. `$closeCode` содержит код закрытия по RFC 6455 (либо `1006 Abnormal
Closure`, если CLOSE-фрейм вообще не пришёл, например при обрыве сети). `$closeReason` содержит
текст причины из CLOSE-фрейма клиента в UTF-8, или пустую строку, если текста не было.

Штатное закрытие клиентом (код `1000`) исключения не бросает: `WebSocket::recv()` в этом случае
просто возвращает `null`.

### TrueAsync\WebSocketBackpressureException

```php
final class WebSocketBackpressureException extends WebSocketException {}
```

Бросается из `send()`/`sendBinary()`, когда буфер на отправку остаётся заполненным дольше, чем
`write_timeout_ms`. Это сигнал приложению, что клиент читает слишком медленно: можно закрыть
соединение или отбросить сообщение и продолжить работу.

### TrueAsync\WebSocketConcurrentReadException

```php
final class WebSocketConcurrentReadException extends WebSocketException {}
```

Программная ошибка: вторая корутина вызвала `recv()`, пока первая уже ждала ответа от `recv()`
на том же `WebSocket`. Читать сообщения из одного соединения можно только в одном месте кода;
если сообщения нужно раздать нескольким обработчикам, стройте один `recv()`-цикл и
распределяйте сообщения из него сами.

## См. также

- [Руководство: WebSocket](/ru/docs/server/websocket.html)
- [`HttpServer::addWebSocketHandler()`](/ru/docs/reference/server/http-server.html#addwebsockethandler)
- [`HttpServerConfig`: WebSocket-параметры](/ru/docs/reference/server/http-server-config.html#websocket)
- [Исключения TrueAsync Server](/ru/docs/reference/server/exceptions.html)
