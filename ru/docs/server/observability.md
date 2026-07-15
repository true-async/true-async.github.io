---
layout: docs
lang: ru
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /ru/docs/server/observability.html
page_title: "TrueAsync Server: наблюдаемость"
description: "Cross-worker статистика запросов (getStats), multi-sink структурированное логирование (setLogSinks), OpenTelemetry access log и runtime-счётчики аллокатора."
---

# Наблюдаемость

(PHP 8.6+, true_async_server 0.10+)

Три вещи, которые сервер в production должен уметь показывать: **сколько запросов он обслужил и
с каким статусом**, **лог, который можно куда-то отгружать**, и **запись access на каждый запрос**.
Эта страница покрывает все три. Ничего из этого не включено по умолчанию — простаивающий сервер не
платит ни за что.

## Cross-worker статистика: `getStats()`

Включите через `setStatsEnabled(true)`, затем читайте агрегат через `HttpServer::getStats()`:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);          // должно быть задано до start()

$server = new HttpServer($config);
$server->addHttpHandler(fn ($req, $res) => $res->json(['ok' => true]));

spawn(function () use ($server) {
    while ($server->isRunning()) {
        Async\delay(10_000);
        $stats = $server->getStats();
        error_log("requests so far: " . $stats['totals']['total_requests']);
    }
});

$server->start();
```

`getStats()` бросает исключение, если статистика не была включена — при выключенной статистике slab
счётчиков вообще не аллоцируется. Форма:

```php
[
    'enabled'  => true,
    'workers'  => [ 0 => [ /* счётчики одного воркера */ ], 1 => [ … ], … ],
    'reactors' => [ /* запросы, обслуженные целиком на transport-реакторе */ ],
    'totals'   => [ /* свёрнуто по воркерам и реакторам */ ],
]
```

`totals` — это то, что нужно скрейперу:

| Счётчик | Значение |
|---------|----------|
| `total_requests` | каждый завершённый запрос |
| `responses_2xx_total` … `responses_5xx_total` | классифицируется по одному разу, так что все четыре в сумме дают `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | живые соединения по протоколу (gauge) |
| `log_records_dropped_total` | строки лога, отброшенные полным ring'ом (см. ниже) |

Каждый счётчик комбинируется так, как позволяет его смысл. Монотонные totals **суммируются и
переживают `reload()`** — totals уходящего воркера наследуются, так что скрейпер никогда не увидит,
как счётчик пошёл назад лишь потому, что пул ротировался. Активные gauge'и суммируются только по
живым воркерам, так что последнее число соединений мёртвого воркера не тянется вперёд призраком.
Чтения lock-free, так что агрегат может отставать максимум на один воркер в середине ротации.

> **Не захватывайте `$server` в обработчике запроса, чтобы вызывать `getStats()` изнутри него.**
> Под пулом воркеров это создаёт цикл ссылок `HttpServer ⇄ handler`, и передача обработчика в
> воркеры роняет процесс
> ([true-async/php-async#196](https://github.com/true-async/php-async/issues/196)). Читайте
> статистику из отдельной корутины, которая владеет `$server`, как выше — а не из обработчика.

## Структурированное логирование: `setLogSinks()`

Одна запись лога веером расходится сразу по нескольким **sink'ам**, у каждого свой пункт назначения,
формат и порог severity:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    // структурированный access log -> файл, как OpenTelemetry JSON
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    // человекочитаемая диагностика -> консоль, в цвете
    ['type' => 'stderr', 'format' => 'pretty',
     'category' => 'app', 'level' => LogSeverity::WARN],
]);
```

Это заменяет сахар `setLogSeverity()` / `setLogStream()` с одним потоком. До 8 sink'ов;
некорректная спецификация бросает исключение в момент `setLogSinks()`, а не при `start()`.

**Типы sink'ов** — `stream`, `file`, `stdout`, `stderr`, `syslog`. Под пулом воркеров используйте
`file` (или `stdout`/`stderr`), но не `stream`: PHP stream-ресурс, открытый родителем, не может
перейти в воркер-поток — sink остаётся на родителе и пропускается в воркерах с уведомлением при
старте. `file` работает, потому что каждый воркер сам переоткрывает путь (режим append).

**Форматы** — `plain`, `logfmt`, `json` (один объект OpenTelemetry-Logs на строку), `pretty`
(цветная консольная строка, цвет решается по целевому fd с учётом `NO_COLOR` / `CLICOLOR_FORCE`) и
`template` для собственной раскладки:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

`{ts}` (ISO-8601) или `{ts:PATTERN}` с подмножеством в стиле `date()` (`Y y m d H i s v`), плюс
`{level}`, `{msg}`, `{attrs}`, `{trace}`, `{span}`; всё остальное — литерал.

**`syslog`** выдаёт RFC 5424 — octet-framed (RFC 6587) поверх TCP, одна запись на датаграмму на
`udp` / `udg`:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### Access log: `'category' => 'access'`

`category` sink'а маршрутизирует виды записей: `app` (по умолчанию) получает диагностику сервера,
`access` получает ровно **одну структурированную запись на завершённый запрос**, а `all` получает
обе — так что JSON access log и pretty-консоль диагностики уживаются на одном сервере.

Access-записи используют стабильные семантические конвенции OpenTelemetry HTTP. Одна строка от
форматтера `json`, красиво отформатированная:

```json
{
    "Timestamp": "2026-07-15T07:03:37.740Z",
    "SeverityNumber": 9,
    "SeverityText": "INFO",
    "Body": "GET /x 200",
    "Attributes": {
        "http.request.method": "GET",
        "url.path": "/x",
        "http.response.status_code": 200,
        "network.protocol.version": "1.1",
        "http.response.body.size": 11,
        "http.server.request.duration": 9.266e-06,
        "client.address": "127.0.0.1",
        "client.port": 42336
    }
}
```

Выдаётся на каждом пути завершения — возврат обработчика, статический файл, `sendFile()`,
compression-reject, dispatch reactor-пула — на HTTP/1, HTTP/2 и HTTP/3, в том числе под пулом
воркеров. W3C trace context добавляется, когда запрос его нёс. Текстовые форматтеры экранируют
управляющие байты в значениях, так что поле, полученное из запроса, не может подделать строку лога.

### Ни один sink не вызывает PHP обратно

Записи выдаются из IO-колбэков libuv и из HTTP/3 reactor-потоков, у которых нет PHP-контекста, так
что путь логирования никогда не должен заходить обратно в VM — sink'а «вызвать PHP-callable» нет by
design. Чтобы экспортировать логи из userland, направьте sink на файл или сокет с
`'format' => 'json'` и дренируйте его из своей корутины. Это форма async-appender'а, и она к тому же
держит latency экспортёра вне пути запроса.

Ring sink'а ограничен — продюсер никогда не должен блокироваться — так что всплеск, обогнавший
писатель, стоит записей. Они считаются в `log_records_dropped_total` (см. `getStats()` выше), а не
теряются молча.

## Runtime-счётчики аллокатора: `getRuntimeStats()`

`HttpServer::getRuntimeStats()` сообщает о собственных внутренних аллокаторах сервера и
cross-worker трафике топиков — счётчики, которые позволяют отнести RSS к подсистеме, а не гадать:

- `conn_arena_live` / `conn_arena_slots` / `conn_arena_chunks` / `conn_arena_bytes` — slab
  соединений (один `http_connection_t` на живое TCP-соединение).
- `body_pool` — кэш больших тел запросов по size-class'ам, с `body_pool_total_bytes`.
- `ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped` — cross-worker доставка
  [WebSocket-топиков](/ru/docs/server/websocket.html#topics-publishsubscribe-across-every-worker):
  публикации, переданные другому воркеру, воркеры, которые interest-фильтр позволил публикатору
  пропустить, и публикации, отброшенные полным mailbox'ом (вот последнее — потеря данных).

В отличие от `getStats()`, этот вызов не требует opt-in.

## HTTP/3-счётчики: `getHttp3Stats()`

По одной записи на HTTP/3-listener, с per-listener QUIC-счётчиками (`quic_packets_sent`,
`quic_bytes_sent`, счётчики датаграмм, `poll_rearms`, …). Возвращает пустой массив на сборке без
`--enable-http3`. Каждый счётчик читается отдельной relaxed atomic-загрузкой, так что отчёт
внутренне согласован, даже пока reactor-поток продолжает писать.

## См. также

- [Multi-worker](/ru/docs/server/workers.html): логирование и shutdown под пулом
- [Конфигурация](/ru/docs/server/configuration.html)
- [`HttpServer::getStats()`](/ru/docs/reference/server/http-server.html)
