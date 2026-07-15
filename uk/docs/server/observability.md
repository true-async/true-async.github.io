---
layout: docs
lang: uk
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /uk/docs/server/observability.html
page_title: "TrueAsync Server: спостережуваність"
description: "Cross-worker статистика запитів (getStats), структуроване multi-sink логування (setLogSinks), OpenTelemetry access log і runtime-лічильники алокатора."
---

# Спостережуваність

(PHP 8.6+, true_async_server 0.10+)

Три речі, які сервер у production має вміти віддавати назовні: **скільки запитів він обслужив і
з яким статусом**, **лог, який можна кудись відвантажити**, і **запис доступу на кожен запит**.
Ця сторінка охоплює всі три. Жодна з них не ввімкнена за замовчуванням — простій сервер не
платить нічого.

## Cross-worker статистика: `getStats()`

Увімкніть через `setStatsEnabled(true)`, потім читайте агрегат через `HttpServer::getStats()`:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);          // має бути задано до start()

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

`getStats()` кидає виняток, якщо статистику не було ввімкнено — при вимкненій статистиці slab
під лічильники взагалі не алокується. Структура:

```php
[
    'enabled'  => true,
    'workers'  => [ 0 => [ /* лічильники одного воркера */ ], 1 => [ … ], … ],
    'reactors' => [ /* запити, обслужені повністю на transport-реакторі */ ],
    'totals'   => [ /* згорнуто по воркерах і реакторах */ ],
]
```

`totals` — це те, що потрібно скраперу:

| Лічильник | Значення |
|-----------|----------|
| `total_requests` | кожен завершений запит |
| `responses_2xx_total` … `responses_5xx_total` | класифікується рівно раз, тому всі чотири в сумі дають `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | живі з'єднання по протоколах (gauge) |
| `log_records_dropped_total` | рядки логу, які відкинув повний ring (див. нижче) |

Кожен лічильник комбінується так, як це дозволяє його зміст. Монотонні totals **сумуються і
переживають `reload()`** — totals воркера, що йде на вихід, успадковуються, тож скрапер ніколи не
побачить, як лічильник біжить назад лише через ротацію пулу. Активні gauge сумуються тільки по
живих воркерах, тож останнє число з'єднань мертвого воркера не тягнеться далі як фантом. Читання
lock-free, тож агрегат може відставати щонайбільше на один воркер посеред ротації.

> **Не замикайте `$server` в обробнику запиту, щоб викликати `getStats()` зсередини нього.**
> Під пулом воркерів це створює цикл посилань `HttpServer ⇄ handler`, а transfer обробника у
> воркери валить процес
> ([true-async/php-async#196](https://github.com/true-async/php-async/issues/196)). Читайте
> статистику з окремої корутини, що володіє `$server`, як вище — не з обробника.

## Структуроване логування: `setLogSinks()`

Один запис логу розходиться одразу на кілька **sink'ів**, у кожного своє призначення, формат і
поріг severity:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    // структурований access log -> файл, як OpenTelemetry JSON
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    // діагностика для людини -> консоль, з кольором
    ['type' => 'stderr', 'format' => 'pretty',
     'category' => 'app', 'level' => LogSeverity::WARN],
]);
```

Це заміщує single-stream цукор `setLogSeverity()` / `setLogStream()`. До 8 sink'ів; невалідна
специфікація кидає виняток на етапі `setLogSinks()`, а не при `start()`.

**Типи sink'ів** — `stream`, `file`, `stdout`, `stderr`, `syslog`. Під пулом воркерів
використовуйте `file` (або `stdout`/`stderr`), ніколи `stream`: PHP stream-ресурс, відкритий
батьком, не може перетнути межу воркер-потоку — sink лишається на батьку і пропускається у
воркерах із повідомленням при старті. `file` працює, бо кожен воркер сам переоткриває шлях
(режим append).

**Формати** — `plain`, `logfmt`, `json` (один OpenTelemetry-Logs об'єкт на рядок), `pretty`
(кольоровий консольний рядок, колір визначається з target fd з урахуванням `NO_COLOR` /
`CLICOLOR_FORCE`) і `template` для власного макета:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

`{ts}` (ISO-8601) або `{ts:PATTERN}` з підмножиною у стилі `date()` (`Y y m d H i s v`), плюс
`{level}`, `{msg}`, `{attrs}`, `{trace}`, `{span}`; усе інше йде літерально.

**`syslog`** видає RFC 5424 — octet-framed (RFC 6587) поверх TCP, один запис на датаграму на
`udp` / `udg`:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### Access log: `'category' => 'access'`

`category` у sink'а маршрутизує роди записів: `app` (за замовчуванням) отримує серверну
діагностику, `access` отримує рівно **один структурований запис на кожен завершений запит**, а
`all` отримує обидва — тож JSON access log і pretty-консоль з діагностикою уживаються на одному
сервері.

Access-записи використовують стабільні OpenTelemetry HTTP semantic conventions. Один рядок від
`json`-форматера, у pretty-вигляді:

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

Видається на кожному шляху завершення — return обробника, статичний файл, `sendFile()`,
compression-reject, reactor-pool dispatch — на HTTP/1, HTTP/2 і HTTP/3, зокрема під пулом
воркерів. W3C trace context додається, коли запит його ніс. Текстові форматери екранують
control-байти у значеннях, тож поле, похідне від запиту, не може підробити рядок логу.

### Жоден sink не викликає назад у PHP

Записи видаються з libuv IO-колбеків і з HTTP/3 reactor-потоків, у яких немає PHP-контексту, тож
шлях логу не має права повторно заходити у VM — sink'а типу «викликати PHP callable» немає, це
за задумом. Щоб експортувати логи з userland, направте sink у файл або сокет із
`'format' => 'json'` і дренуйте його з власної корутини. Це і є форма async-appender'а, і вона ж
тримає latency експортера поза шляхом запиту.

Ring у sink'а обмежений — продюсер не має права блокуватися — тож сплеск, який обганяє writer,
коштує записів. Вони рахуються в `log_records_dropped_total` (див. `getStats()` вище), а не
губляться мовчки.

## Runtime-лічильники алокатора: `getRuntimeStats()`

`HttpServer::getRuntimeStats()` повідомляє про власні внутрішні алокатори сервера і cross-worker
топік-трафік — лічильники, що дозволяють приписати RSS підсистемі замість здогадок:

- `conn_arena_live` / `conn_arena_slots` / `conn_arena_chunks` / `conn_arena_bytes` — slab
  з'єднань (один `http_connection_t` на кожне живе TCP-з'єднання).
- `body_pool` — per-size-class кеш великих тіл запитів, разом із `body_pool_total_bytes`.
- `ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped` — cross-worker доставка
  [WebSocket-топіків](/uk/docs/server/websocket.html#topics-publishsubscribe-across-every-worker):
  publish'і, передані іншому воркеру, воркери, які interest-фільтр дозволив publisher'у
  пропустити, і publish'і, відкинуті через повний mailbox (останнє — це втрата даних).

На відміну від `getStats()`, цей не потребує opt-in.

## HTTP/3 лічильники: `getHttp3Stats()`

Один запис на кожен HTTP/3 listener, з per-listener QUIC-лічильниками (`quic_packets_sent`,
`quic_bytes_sent`, лічильники датаграм, `poll_rearms`, …). Повертає порожній масив на збірці без
`--enable-http3`. Кожен лічильник читається окремим relaxed atomic load, тож звіт внутрішньо
консистентний навіть поки reactor-потік продовжує писати.

## Див. також

- [Multi-worker](/uk/docs/server/workers.html): логування і зупинка під пулом
- [Конфігурація](/uk/docs/server/configuration.html)
- [`HttpServer::getStats()`](/uk/docs/reference/server/http-server.html)
