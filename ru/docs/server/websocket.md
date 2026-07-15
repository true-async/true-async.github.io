---
layout: docs
lang: ru
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /ru/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): full-duplex соединения по RFC 6455, cross-worker pub/sub-топики, backpressure, keepalive, subprotocol negotiation, permessage-deflate."
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
- [Pub/sub-топики](#topics-publishsubscribe-across-every-worker), которые доходят до каждого воркера
  процесса, так что чату не нужен ни single-worker сервер, ни внешний брокер.

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

// Обязательно: без HTTP-обработчика сервер не стартует, и именно он отвечает
// на запросы, которые не являются upgrade'ом.
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(404)->end();
});

$server->start();
```

Регистрация обработчика и есть то, что включает WebSocket — отдельного переключателя нет.

> `HttpServerConfig::enableWebSocket()` выглядит как такой переключатель, но это
> нереализованная заглушка, которая бросает `HttpServerRuntimeException` при вызове с `true`, а
> `isWebSocketEnabled()` возвращает `false`, даже когда WebSocket уже обслуживает соединения. Не
> вызывайте ни то, ни другое ([server#134](https://github.com/true-async/server/issues/134)).

Каждое соединение обслуживается своей корутиной: та же модель, что и у обычных HTTP-запросов.
Исключение, брошенное обработчиком, не роняет с ним весь воркер: оно логируется, а клиенту
сообщается прямо в протоколе — HTTP-статусом, если бросок опередил upgrade, или `CLOSE 1011`,
если сессия уже была живой.

Обработчик всегда вызывается с тремя аргументами, а PHP отбрасывает те, что вы не объявили — так
что `function (WebSocket $ws)`, `function (WebSocket $ws, HttpRequest $req)` и форма с тремя
параметрами одинаково допустимы. Объявляйте только то, что используете.

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

## Топики: publish/subscribe по всем воркерам {#topics-publishsubscribe-across-every-worker}

Воркер — это поток со своим собственным PHP-контекстом. Поэтому очевидный способ построить чат —
держать массив соединений и бегать по нему в цикле — может дотянуться только до пиров *одного*
воркера, из-за чего такой чат приходилось запускать на `setWorkers(1)`.

Топики это исправляют. Они живут в сервере, а не в вашем обработчике: каждый воркер индексирует
соединения, которыми владеет, а `publish()` передаётся каждому воркеру, который затем доставляет
сообщение своим сокетам. Никакого Redis, никакого брокера сообщений, никакого single-worker
сервера.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = ltrim($req->getPath(), '/') ?: 'lobby';

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", $msg->data);   // доходит до подписчиков на ВСЕХ воркерах
    }
});
```

Топик адресуется **по имени, прямо в месте вызова**. Нет никакого объекта топика, который нужно
получать, хранить или передавать в обработчик.

### Фильтры следуют MQTT

Уровни разделяются `/`, `+` совпадает ровно с одним уровнем, а завершающий `#` совпадает со всем
остальным:

| Фильтр | Что получает |
|--------|--------------|
| `chat/general` | ровно этот топик |
| `chat/+/typing` | `chat/general/typing`, `chat/random/typing` — один уровень, любое значение |
| `user/42/#` | `user/42`, `user/42/presence`, `user/42/dm/7` — всё поддерево |

Wildcard'ы принадлежат *подпискам*. **Топик публикации должен быть конкретным**: у сообщения,
разосланного по шаблону, нет чётко определённого адресата, поэтому `publish('chat/+/typing', …)`
бросает `WebSocketException`. Глубина фильтров — до 128 уровней.

### API

```php
$ws->subscribe('chat/+/typing');            // идемпотентно
$ws->unsubscribe('chat/+/typing');          // идемпотентно
$ws->getTopics();                           // string[] — фильтры этого соединения

$ws->publish('chat/general', $text);        // текст, каждому воркеру
$ws->publishBinary('chat/general', $bytes); // бинарный аналог

$ws->subscriberCount('chat/general');       // по всем воркерам, включая wildcard'ы
```

`publish()` **никогда не приостанавливается**. Пир, чья очередь на отправку забита, теряет
сообщение, но не задерживает доставку остальной части топика — та же семантика, что и у
`trySend()`. Когда нужна гарантия доставки, используйте `send()` к одному соединению.
Подписчик, совпавший сразу по нескольким своим фильтрам, всё равно получит ровно одну копию.

`$excludeSelf` по умолчанию `true` — случай «все, кроме отправителя», который и нужен чату:

```php
$ws->publish('chat/general', $msg->data);                      // отправитель не получит его обратно
$ws->publish('chat/general', $msg->data, excludeSelf: false);  // отправитель получит тоже
```

Возвращаемое значение — число подписчиков, обслуженных **только на вызывающем воркере**. Доставка
на остальные воркеры асинхронна и не может быть посчитана в месте вызова, так что это локальное
число, а не общее по процессу. `subscriberCount()` — как раз общее по процессу, но, поскольку
каждый воркер отвечает своим счётчиком, а ответы суммируются, это снимок, а не живой счётчик, и
воркер, не ответивший вовремя, в него не попадает.

Закрывающееся соединение само отписывается ото всего.

### Лимиты

Оба выключены по умолчанию — так поставляется каждый self-hosted брокер (EMQX `max_subscriptions`
/ `messages_rate`, NATS `max_subs`): только приложение знает, сколько топиков ему нужно.

```php
$config
    ->setWsMaxSubscriptions(32)          // сколько разных фильтров может держать одно соединение
    ->setWsPublishRateLimit(50, burst: 100);
```

Задавайте `setWsMaxSubscriptions()`, как только клиентский ввод доходит до `subscribe()` — скажем,
`$ws->subscribe($msg->data)` — чтобы пир не мог бесконечно растить дерево топиков воркера. При
превышении лимита `subscribe()` бросает `WebSocketException`, а соединение остаётся живым.

`setWsPublishRateLimit()` — это per-connection token bucket. `publish()` — единственный вызов
WebSocket, который непривилегированный пир может превратить в работу на *каждом* воркере
процесса — `send()` и `trySend()` всегда трогают только его собственный сокет. Без метрики один
клиент, зациклившийся на ретранслируемом сообщении, забивает inbox каждого воркера, и следующие за
этим потери задевают трафик *других* топиков тоже. При превышении rate `publish()` бросает
`WebSocketBackpressureException`, а соединение остаётся живым: отправителю сообщают, вместо того
чтобы сообщение сгинуло в забитом mailbox'е, где его никто не увидит.

`$burst` — глубина bucket'а в сообщениях, то есть насколько обработчик может забежать вперёд
устойчивого rate. `0` означает объём в одну секунду.

```php
try {
    $ws->publish("chat/$room", $msg->data);
} catch (WebSocketBackpressureException) {
    $ws->send('you are sending too fast');
} catch (WebSocketException $e) {
    $ws->send('bad topic: ' . $e->getMessage());
}
```

### Чего это стоит

Каждый воркер суммирует свои подписки в counting Bloom filter из префиксов топиков, и публикующий
пропускает воркеры, которые заведомо не держат ни одного подписчика, вместо того чтобы будить их
все. Публикация в топик, который никто в процессе не слушает, стоит нуля cross-worker пробуждений.
`HttpServer::getRuntimeStats()` показывает результат — `ws_topic_posted`, `ws_topic_skipped`
(фильтр отрабатывает своё) и `ws_topic_dropped` (mailbox воркера был полон: вот это уже потеря
данных).

Топики работают на любом WebSocket-транспорте, не только на plaintext HTTP/1 — поверх TLS, поверх
HTTP/2 Extended CONNECT и с permessage-deflate, где один `publish()` обслуживает сжатого пира и
несжатого бок о бок, каждого с тем framing'ом, что он согласовал.

## Адрес клиента

```php
$ws->getRemoteAddress();   // "203.0.113.7" или "2001:db8::1" — голый IP, без порта
$ws->getRemotePort();      // 54321
```

`getRemoteAddress()` возвращает **голый IP**: без порта и без скобок вокруг IPv6-литерала — той же
формы, что и `$_SERVER['REMOTE_ADDR']`, так что он напрямую годится для
`filter_var(…, FILTER_VALIDATE_IP)`, ACL или rate-limiter'а. Оба возвращают `null` на
Unix-socket listener'е, у которого нет IP-пира.

Это пир TCP-соединения. Он **не** выводится из `X-Forwarded-For` — за прокси разбирайте этот
заголовок сами и только когда доверяете прокси, который его выставил.

> **Breaking change.** `getRemoteAddress()` раньше возвращал `"host:port"` (и `""`, когда IP-пира
> не было). Теперь он возвращает голый IP и `null`. Для порта используйте `getRemotePort()`.

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
        └── TrueAsync\WebSocketException            // также: неверный фильтр топика, лимит подписок
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // медленный читатель — или publish() сверх rate-лимита
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
| `setWsMaxSubscriptions($count)` | `0` (без лимита) | сколько разных фильтров может держать одно соединение |
| `setWsPublishRateLimit($perSecond, $burst)` | `0` (off) | per-connection token bucket над `publish()` |

Подробнее смотрите в [Конфигурации](/ru/docs/server/configuration.html#websocket).

## См. также

- [`TrueAsync\WebSocket` и связанные классы](/ru/docs/reference/server/websocket.html): полный
  справочник
- [`HttpServer::addWebSocketHandler()`](/ru/docs/reference/server/http-server.html#addwebsockethandler)
- [Конфигурация: WebSocket](/ru/docs/server/configuration.html#websocket)
