---
layout: docs
lang: uk
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /uk/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): full-duplex з'єднання за RFC 6455, cross-worker pub/sub топіки, backpressure, keepalive, subprotocol negotiation, permessage-deflate."
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
- [Pub/sub топіки](#topics-publishsubscribe-across-every-worker), що доходять до кожного воркера
  процесу, тож чату не потрібен single-worker сервер чи зовнішній брокер.

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

// Обов'язково: сервер не стартує без HTTP-обробника, і саме він відповідає
// на запити, що не є upgrade'ами.
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(404)->end();
});

$server->start();
```

Реєстрація обробника — це і є те, що вмикає WebSocket; окремого перемикача немає, так само як у HTTP/2 з `addHttp2Handler()`.

> `HttpServerConfig::enableWebSocket()` — це застарілий перемикач, а не той самий. При передачі йому `true` кидає `HttpServerRuntimeException`, який вказує на `addWebSocketHandler()` — реєструйте обробник замість цього.

Кожне з'єднання обслуговується власною корутиною: та сама модель, що і у звичайних HTTP-запитів.
Обробник, що кидає виняток, не роняє воркер разом із собою: виняток логується, а peer'а
повідомляють у самому протоколі — HTTP-статусом, якщо throw випередив upgrade, або `CLOSE 1011`,
щойно сесія стала живою.

Обробник завжди викликається з трьома аргументами, а PHP відкидає ті, що ви не оголосили — тож
`function (WebSocket $ws)`, `function (WebSocket $ws, HttpRequest $req)` і форма з трьома
параметрами усі валідні. Оголошуйте лише те, що використовуєте.

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

## Топіки: publish/subscribe через кожен воркер {#topics-publishsubscribe-across-every-worker}

Воркер — це потік із власним PHP-контекстом. Тож очевидний спосіб побудувати чат — тримати масив
з'єднань і крутити його в циклі — здатен дотягтися лише до peer'ів *одного* воркера, і саме тому
такий чат доводилося запускати на `setWorkers(1)`.

Топіки це виправляють. Вони живуть у сервері, а не у вашому обробнику: кожен воркер індексує
з'єднання, якими володіє, а `publish()` передається кожному воркеру, який потім доставляє на власні
сокети. Жодного Redis, жодного message-брокера, жодного single-worker сервера.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = ltrim($req->getPath(), '/') ?: 'lobby';

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", $msg->data);   // доходить до підписників на ВСІХ воркерах
    }
});
```

Топік адресується **іменем, у місці виклику**. Немає жодного топік-об'єкта, який треба отримати,
тримати чи передавати в обробник.

### Фільтри за MQTT

Рівні розділяються `/`, `+` збігається рівно з одним рівнем, а завершальний `#` збігається з
рештою:

| Фільтр | Отримує |
|--------|---------|
| `chat/general` | рівно цей топік |
| `chat/+/typing` | `chat/general/typing`, `chat/random/typing` — один рівень, будь-яке значення |
| `user/42/#` | `user/42`, `user/42/presence`, `user/42/dm/7` — усе піддерево |

Wildcard'и належать *підпискам*. **Топік для publish має бути конкретним**: у повідомлення,
розкиданого по патерну, немає чітко визначеного призначення, тож `publish('chat/+/typing', …)`
кидає `WebSocketException`. Фільтри можуть бути до 128 рівнів завглибшки.

### API

```php
$ws->subscribe('chat/+/typing');            // ідемпотентно
$ws->unsubscribe('chat/+/typing');          // ідемпотентно
$ws->getTopics();                           // string[] — фільтри цього з'єднання

$ws->publish('chat/general', $text);        // текст, кожному воркеру
$ws->publishBinary('chat/general', $bytes); // бінарний відповідник

$ws->subscriberCount('chat/general');       // по всіх воркерах, з урахуванням wildcard'ів
```

`publish()` **ніколи не призупиняється**. Peer, чия вихідна черга забита, відкидає повідомлення, а
не стопорить доставку решті топіка — та сама семантика, що й у `trySend()`. Коли потрібна гарантія
доставки, робіть `send()` до конкретного з'єднання. Підписник, якому відповідають кілька його ж
власних фільтрів, усе одно отримує рівно одну копію.

`$excludeSelf` за замовчуванням `true` — випадок «усім, крім відправника», якого хоче чат:

```php
$ws->publish('chat/general', $msg->data);                      // відправник не отримує назад
$ws->publish('chat/general', $msg->data, excludeSelf: false);  // відправник отримує теж
```

Повернене значення — кількість підписників, обслужених **лише на воркері, що викликав**. Доставка
на інші воркери асинхронна і не піддається підрахунку в місці виклику, тож це локальне число, а не
загальнопроцесне. Загальнопроцесне дає `subscriberCount()` — але оскільки кожен воркер відповідає
власним числом, а відповіді сумуються, це знімок, а не живий лічильник, і воркер, що не встиг
відповісти вчасно, лишається поза підрахунком.

З'єднання, що закривається, само відписується від усього.

### Ліміти

Обидва вимкнені за замовчуванням — так постачається кожен self-hosted брокер (EMQX
`max_subscriptions` / `messages_rate`, NATS `max_subs`): лише застосунок знає, скільки топіків
йому потрібно.

```php
$config
    ->setWsMaxSubscriptions(32)          // окремих фільтрів на одне з'єднання
    ->setWsPublishRateLimit(50, burst: 100);
```

Задавайте `setWsMaxSubscriptions()` щоразу, коли клієнтський ввід доходить до `subscribe()` —
скажімо, `$ws->subscribe($msg->data)` — щоб peer не міг нескінченно нарощувати топік-дерево
воркера. Понад ліміт `subscribe()` кидає `WebSocketException`, а з'єднання лишається живим.

`setWsPublishRateLimit()` — це per-connection token bucket. `publish()` — єдиний WebSocket-виклик,
який непривілейований peer може перетворити на роботу на *кожному* воркері процесу: `send()` і
`trySend()` завжди зачіпають лише власний сокет. Без обліку один клієнт, що зациклився на
ретрансльованому повідомленні, забиває inbox кожного воркера, і drop'и, що за цим ідуть, зносять
трафік *інших* топіків теж. Понад ліміт `publish()` кидає `WebSocketBackpressureException`, а
з'єднання лишається живим: відправнику повідомляють, замість того щоб повідомлення зникло у
повному mailbox'і, де його ніхто не побачить.

`$burst` — глибина bucket'а у повідомленнях, тобто наскільки обробник може забігти вперед від
sustained-rate. `0` означає обсяг однієї секунди.

```php
try {
    $ws->publish("chat/$room", $msg->data);
} catch (WebSocketBackpressureException) {
    $ws->send('you are sending too fast');
} catch (WebSocketException $e) {
    $ws->send('bad topic: ' . $e->getMessage());
}
```

### Скільки це коштує

Кожен воркер підсумовує свої підписки у counting Bloom filter префіксів топіків, а publisher
пропускає воркери, які завідомо не тримають жодного підписника, замість того щоб будити всіх. Publish
у топік, який у процесі ніхто не слухає, коштує нуль cross-worker пробуджень.
`HttpServer::getRuntimeStats()` повідомляє результат — `ws_topic_posted`, `ws_topic_skipped`
(фільтр відпрацьовує) і `ws_topic_dropped` (mailbox воркера був повний: це втрата даних).

Топіки працюють на кожному WebSocket-транспорті, не лише на plaintext HTTP/1 — поверх TLS, поверх
HTTP/2 Extended CONNECT і з permessage-deflate, де один `publish()` обслуговує стиснутого peer'а і
звичайного пліч-о-пліч, кожного з тим framing'ом, який він узгодив.

## Адреса клієнта

```php
$ws->getRemoteAddress();   // "203.0.113.7" або "2001:db8::1" — голий IP, без порту
$ws->getRemotePort();      // 54321
```

`getRemoteAddress()` повертає **голий IP**: без порту і без дужок навколо IPv6-літерала — та сама
форма, що й `$_SERVER['REMOTE_ADDR']`, тож він одразу годиться для
`filter_var(…, FILTER_VALIDATE_IP)`, ACL або rate-limiter'а. Обидва повертають `null` на
Unix-socket listener'і, у якого немає IP-peer'а.

Це peer саме TCP-з'єднання. Він **не** виводиться з `X-Forwarded-For` — за проксі парсіть цей
заголовок самі, і лише коли довіряєте проксі, що його виставив.

> **Breaking change.** `getRemoteAddress()` раніше повертав `"host:port"` (і `""`, коли
> IP-peer'а не було). Тепер він повертає голий IP і `null`. Порт беріть через `getRemotePort()`.

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
        └── TrueAsync\WebSocketException            // також: битий топік-фільтр, ліміт підписок
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // повільний читач — або publish() понад свій rate-limit
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
| `setWsMaxSubscriptions($count)` | `0` (без ліміту) | окремих топік-фільтрів на одне з'єднання |
| `setWsPublishRateLimit($perSecond, $burst)` | `0` (off) | per-connection token bucket над `publish()` |

Детальніше дивіться в [Конфігурації](/uk/docs/server/configuration.html#websocket).

## Див. також

- [`TrueAsync\WebSocket` та пов'язані класи](/uk/docs/reference/server/websocket.html): повний
  довідник
- [`HttpServer::addWebSocketHandler()`](/uk/docs/reference/server/http-server.html#addwebsockethandler)
- [Конфігурація: WebSocket](/uk/docs/server/configuration.html#websocket)
