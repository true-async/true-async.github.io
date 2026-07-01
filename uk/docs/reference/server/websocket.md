---
layout: docs
lang: uk
path_key: "/docs/reference/server/websocket.html"
nav_active: docs
permalink: /uk/docs/reference/server/websocket.html
page_title: "TrueAsync\\WebSocket"
description: "TrueAsync\\WebSocket, WebSocketMessage, WebSocketUpgrade, WebSocketCloseCode та ієрархія винятків WebSocket."
---

# TrueAsync\WebSocket

(PHP 8.6+, true_async_server 0.9+)

Класи full-duplex з'єднання за RFC 6455. Керівництво з прикладами:
[WebSocket](/uk/docs/server/websocket.html).

## TrueAsync\WebSocket

Одне WebSocket-з'єднання. Створюється сервером одразу після коміту upgrade-handshake і
передається першим аргументом в обробник, зареєстрований через
[`HttpServer::addWebSocketHandler()`](/uk/docs/reference/server/http-server.html#addwebsockethandler).

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

Екземпляри конструюються лише сервером, `new WebSocket` недоступний користувацькому коду.

### Життєвий цикл

З'єднання прив'язане до корутини обробника. Коли обробник повертає керування з будь-якої причини,
зокрема через `return` із `recv()`-циклу на `null`, сервер закриває з'єднання кодом `1000 Normal`.
Явний `close()` до `return` потрібен лише тоді, коли треба інший код або текст причини закриття.

### Модель конкурентності

- `send()`, `sendBinary()` і `ping()` можна безпечно викликати з кількох корутин одночасно: сервер
  сам стежить за черговістю відправки, тому дані різних викликів не змішуються на проводі.
- У `recv()` може бути лише один викликач одночасно. Якщо викликати `recv()` з двох корутин
  паралельно, другий виклик одразу отримає виняток `WebSocketConcurrentReadException`. Читати
  повідомлення потрібно строго з одного місця коду, в одному циклі.
- `close()` можна викликати багаторазово і з будь-якої корутини: повторні виклики нічого не роблять.

### recv

```php
public WebSocket::recv(): ?WebSocketMessage
```

Приймає наступне текстове або бінарне повідомлення. Призупиняє викликаючу корутину до повного
повідомлення або закриття з'єднання.

Повертає [`WebSocketMessage`](#websocketmessage) або `null`, коли клієнт закрив з'єднання штатно:
нормальний код CLOSE (`1000`/`1001`/`1005`) або розрив без CLOSE-фрейму. Типовий цикл:
`while (($m = $ws->recv()) !== null) { ... }`.

Метод кидає винятки:

- `WebSocketClosedException` — при протокольній помилці або явному error-коду закриття;
  `$closeCode`/`$closeReason` несуть код і текст причини за RFC 6455.
- `WebSocketConcurrentReadException` — якщо інша корутина вже викликала `recv()` на тому самому
  з'єднанні і ще не отримала відповідь.

### send

```php
public WebSocket::send(string $text): void
```

Надсилає текстовий фрейм. `$text` **повинен** бути валідним UTF-8: невалідні дані відхиляються
одразу, щоб отримувач ніколи не побачив кадр, що порушує RFC 6455 §5.6.

У звичайній ситуації функція повертає керування одразу. Якщо буфер на відправку заповнений (клієнт
повільно читає), корутина призупиняється і продовжить роботу, коли буфер звільниться. Якщо
очікування затягується довше `write_timeout_ms`, метод кидає виняток
`WebSocketBackpressureException`, і обробник вирішує, що робити: відкинути повідомлення, закрити
з'єднання або повторити спробу пізніше.

Метод також кидає `WebSocketClosedException`, якщо з'єднання вже закрите.

### sendBinary

```php
public WebSocket::sendBinary(string $data): void
```

Надсилає бінарний фрейм. Бінарні дані не мають обмеження на UTF-8. Поведінка при переповненні
буфера відправки така сама, як у `send()`.

### trySend

```php
public WebSocket::trySend(string $text): bool
```

Неблокувальна відправка. Якщо буфер на відправку не заповнений, ставить текстовий фрейм у чергу і
повертає `true`. Якщо буфер уже заповнений, нічого не надсилає і повертає `false`: викликаючий код
сам вирішує, відкинути повідомлення, сповільнитися чи закрити з'єднання. На відміну від `send()`,
`trySend()` ніколи не призупиняє корутину, тому добре підходить для розсилки одного повідомлення
багатьом клієнтам, коли один повільний клієнт не повинен затримувати решту.

Наскільки великим може бути буфер на відправку, задає
[`HttpServerConfig::setStreamWriteBufferBytes()`](/uk/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(значення `0` знімає обмеження: `trySend()` тоді завжди ставить повідомлення в чергу і повертає
`true`).

Функція повертає `true`, якщо повідомлення прийнято в чергу, і `false`, якщо буфер відправки
переповнений і клієнт не встигає читати. Кидає `WebSocketClosedException`, якщо з'єднання вже
закрите.

### trySendBinary

```php
public WebSocket::trySendBinary(string $data): bool
```

Неблокувальна бінарна відправка. Поводиться так само, як `trySend()`.

### ping

```php
public WebSocket::ping(string $payload = ''): void
```

Надсилає PING-фрейм. За RFC 6455 §5.5.2 клієнт зобов'язаний відповісти PONG. Прикладному коду рідко
потрібно кликати це вручну: таймер keepalive сервера (`HttpServerConfig::setWsPingIntervalMs()`)
надсилає PING'и автоматично, якщо він налаштований.

`$payload` приймає до 125 байт (RFC 6455 §5.5).

### close

```php
public WebSocket::close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void
```

Ініціює закриття з'єднання. Можна викликати багаторазово: повторні виклики нічого не роблять.

- `$code` — значення `WebSocketCloseCode` або ціле число `4000..4999` (діапазон для власних, не
  стандартних кодів, за RFC 6455 §7.4.2).
- `$reason` — текст причини в UTF-8, до 123 байт.

### isClosed

```php
public WebSocket::isClosed(): bool
```

`true` після виклику `close()` або після того, як клієнт надіслав CLOSE-фрейм.

### getSubprotocol

```php
public WebSocket::getSubprotocol(): ?string
```

Subprotocol, узгоджений під час upgrade, або `null`, якщо жоден не вибрано.

### getRemoteAddress

```php
public WebSocket::getRemoteAddress(): string
```

Адреса клієнта у формі `host:port` (IPv4) або `[host]:port` (IPv6) для TCP-з'єднань. Порожній
рядок для з'єднань через Unix-сокет.

### Iterator

```php
public WebSocket::current(): ?WebSocketMessage
public WebSocket::key(): int
public WebSocket::next(): void
public WebSocket::rewind(): void
public WebSocket::valid(): bool
```

Дає змогу писати `foreach ($ws as $msg)` замість ручного `recv()`-циклу. На кожному кроці цикл
забирає наступне повідомлення; штатне закриття з'єднання просто завершує `foreach`, а закриття з
помилкою кидає `WebSocketClosedException` прямо з циклу.

## TrueAsync\WebSocketMessage {#websocketmessage}

```php
namespace TrueAsync;

final class WebSocketMessage
{
    public readonly string $data;
    public readonly bool $binary;
}
```

Одне повністю зібране повідомлення, яке віддає `WebSocket::recv()`. Текстові повідомлення вже
перевірені на валідність UTF-8, тому можна використовувати `$data` як є, без повторної перевірки.

- **`$data`** — вміст повідомлення. Для текстових повідомлень це валідний UTF-8 рядок.
- **`$binary`** — `true`, якщо повідомлення було надіслане як бінарне, `false` для текстового.

Екземпляри конструюються лише сервером. Отримати їх можна тільки через `WebSocket::recv()`,
створити `new WebSocketMessage` вручну не можна.

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

Об'єкт, що представляє upgrade у процесі узгодження. Існує з моменту виклику обробника до виклику
`reject()` або до успішного `return` (тоді сервер надсилає `101` з subprotocol'ом, вибраним через
`setSubprotocol()`).

Доступний лише обробникам, зареєстрованим із трьома параметрами:

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    // ...
});
```

Сервер сам визначає, скільки параметрів вказано в обробнику, і передає `WebSocketUpgrade` лише
якщо їх три. Обробник із двома параметрами цей об'єкт не отримує, і upgrade приймається з
налаштуваннями за замовчуванням.

Після того як handshake завершено, будь-який виклик на цьому об'єкті кидає виняток:
`Sec-WebSocket-Protocol` уже надіслано клієнту, subprotocol більше не можна змінити.

### reject

```php
public WebSocketUpgrade::reject(int $status, string $reason = ''): void
```

Відхиляє upgrade із заданим HTTP-статусом. `101` не надсилається; клієнт отримує вибраний статус, і
з'єднання закривається. Після `reject()` обробник повинен одразу завершити роботу: подальший обмін
даними не допускається.

- `$status` — HTTP-код (має бути 4xx або 5xx).
- `$reason` — необов'язкове тіло відповіді.

### setSubprotocol

```php
public WebSocketUpgrade::setSubprotocol(string $name): void
```

Вибирає subprotocol зі списку, запропонованого клієнтом. Вибране значення потрапить у заголовок
`Sec-WebSocket-Protocol` відповіді. Викликати потрібно до `return` з обробника і до `reject()`.
Сервер не перевіряє, що вибране значення справді входить у список із
`getOfferedSubprotocols()`, за це відповідає сам обробник.

### getOfferedSubprotocols

```php
public WebSocketUpgrade::getOfferedSubprotocols(): array
```

Повертає список subprotocol'ів (`string[]`), які клієнт надіслав у заголовку
`Sec-WebSocket-Protocol`, у порядку його переваги. Порожній масив, якщо клієнт нічого не
запропонував.

### getOfferedExtensions

```php
public WebSocketUpgrade::getOfferedExtensions(): array
```

Повертає список розширень (`string[]`) із заголовка `Sec-WebSocket-Extensions`, у порядку переваги
клієнта. permessage-deflate (RFC 7692, стиснення повідомлень) сервер узгоджує сам через
`HttpServerConfig::setWsPermessageDeflate()`, решта значень зі списку суто інформаційні. Порожній
масив, якщо клієнт нічого не запропонував.

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

Стандартні коди закриття з'єднання за RFC 6455 §7.4.1. Власні, не стандартні коди теж дозволені:
`WebSocket::close()` приймає як значення цього enum, так і ціле число в діапазоні `4000..4999`
(RFC 6455 §7.4.2).

## Винятки

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

Базовий виняток для всіх помилок WebSocket. Розширює спільний для сервера `HttpServerException`,
тож наявні catch-all обробники продовжують працювати.

### TrueAsync\WebSocketClosedException

```php
final class WebSocketClosedException extends WebSocketException
{
    public readonly int $closeCode;
    public readonly string $closeReason;
}
```

З'єднання закрите не штатним чином, а з іншої причини: протокольна помилка або явний error-код
від клієнта. `$closeCode` містить код закриття за RFC 6455 (або `1006 Abnormal Closure`, якщо
CLOSE-фрейм узагалі не прийшов, наприклад при обриві мережі). `$closeReason` містить текст причини
з CLOSE-фрейму клієнта в UTF-8, або порожній рядок, якщо тексту не було.

Штатне закриття клієнтом (код `1000`) винятку не кидає: `WebSocket::recv()` у цьому разі просто
повертає `null`.

### TrueAsync\WebSocketBackpressureException

```php
final class WebSocketBackpressureException extends WebSocketException {}
```

Кидається з `send()`/`sendBinary()`, коли буфер на відправку залишається заповненим довше, ніж
`write_timeout_ms`. Це сигнал застосунку, що клієнт читає занадто повільно: можна закрити з'єднання
або відкинути повідомлення і продовжити роботу.

### TrueAsync\WebSocketConcurrentReadException

```php
final class WebSocketConcurrentReadException extends WebSocketException {}
```

Помилка коду: друга корутина викликала `recv()`, поки перша вже чекала на відповідь від `recv()`
на тому самому `WebSocket`. Читати повідомлення з одного з'єднання можна лише в одному місці коду;
якщо повідомлення потрібно роздати кільком обробникам, будуйте один `recv()`-цикл і розподіляйте
повідомлення з нього самі.

## Див. також

- [Керівництво: WebSocket](/uk/docs/server/websocket.html)
- [`HttpServer::addWebSocketHandler()`](/uk/docs/reference/server/http-server.html#addwebsockethandler)
- [`HttpServerConfig`: WebSocket-параметри](/uk/docs/reference/server/http-server-config.html#websocket)
- [Винятки TrueAsync Server](/uk/docs/reference/server/exceptions.html)
