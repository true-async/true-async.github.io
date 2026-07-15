---
layout: docs
lang: uk
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /uk/docs/server/observability.html
page_title: "TrueAsync Server: спостережуваність"
description: "Статистика запитів через getStats(), endpoint /metrics для Prometheus і Grafana, структуроване логування та access log через setLogSinks() і runtime-лічильники."
---

# Спостережуваність

(PHP 8.6+, true_async_server 0.10+)

Сервер може віддавати статистику запитів, писати структуровані логи і видавати один запис
access-log на кожен запит. Усе це вимкнено за замовчуванням.

## Статистика запитів: `getStats()`

Увімкніть статистику через `setStatsEnabled(true)`, потім читайте її через `getStats()`:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);

$server = new HttpServer($config);
$server->addHttpHandler(fn ($req, $res) => $res->json(['ok' => true]));

$server->start();
```

`getStats()` повертає лічильники по кожному воркеру і спільний підсумок. Кидає виняток, якщо
статистику не було ввімкнено.

```php
[
    'enabled' => true,
    'workers' => [ 0 => [ /* лічильники одного воркера */ ], 1 => [ … ] ],
    'totals'  => [ /* згорнуто по воркерах */ ],
]
```

`totals` містить:

| Лічильник | Значення |
|-----------|----------|
| `total_requests` | завершені запити |
| `responses_2xx_total` … `responses_5xx_total` | відповіді за класом статусу; чотири в сумі дають `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | відкриті з'єднання за протоколом |

Підсумки продовжують рости через `reload()`; лічильники з'єднань стежать лише за живими
воркерами.

## Prometheus і Grafana

Сервер сам не віддає endpoint `/metrics` — `getStats()` дає вам звичайний PHP-масив, а ви
перетворюєте його на те, що очікує ваш стек моніторингу. Для Prometheus це один невеликий
обробник, який форматує масив як [text exposition
format](https://prometheus.io/docs/instrumenting/exposition_formats/):

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) use ($server) {
    if ($req->getPath() === '/metrics') {
        $t = $server->getStats()['totals'];

        $body  = "# HELP http_requests_total Requests completed.\n";
        $body .= "# TYPE http_requests_total counter\n";
        $body .= "http_requests_total {$t['total_requests']}\n";

        $body .= "# HELP http_responses_total Responses by status class.\n";
        $body .= "# TYPE http_responses_total counter\n";
        foreach (['2xx', '3xx', '4xx', '5xx'] as $class) {
            $body .= "http_responses_total{class=\"{$class}\"} {$t["responses_{$class}_total"]}\n";
        }

        $body .= "# HELP http_connections_active Open connections by protocol.\n";
        $body .= "# TYPE http_connections_active gauge\n";
        foreach (['h1', 'h2', 'h3'] as $proto) {
            $body .= "http_connections_active{protocol=\"{$proto}\"} {$t["conns_active_{$proto}"]}\n";
        }

        $res->setHeader('Content-Type', 'text/plain; version=0.0.4')->end($body);
        return;
    }

    $res->json(['ok' => true]);
});

$server->start();
```

Наведіть Prometheus на цей endpoint:

```yaml
scrape_configs:
  - job_name: 'true-async-server'
    static_configs:
      - targets: ['your-server:8080']
```

Лічильники живуть в одній таблиці на весь процес, яку оновлює кожен воркер і читає `getStats()`,
тож один scrape охоплює весь пул:

![Потік метрик від воркерів до Grafana](/diagrams/en/server-observability/metrics-flow.svg)

Далі Grafana малює графіки частоти запитів, класів статусу і відкритих з'єднань — як для
будь-якого іншого джерела Prometheus:

![Grafana-дашборд поверх метрик сервера](/diagrams/en/server-observability/grafana-dashboard.png)

## Логування: `setLogSinks()`

`setLogSinks()` відправляє кожен запис логу в одне або кілька призначень, у кожного свій формат
і мінімальний рівень:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::WARN],
]);
```

До 8 призначень. Це заміщує single-stream `setLogSeverity()` / `setLogStream()`.

**Куди йде запис** — `type` це `file`, `stdout`, `stderr`, `syslog` або `stream`. Під пулом
воркерів використовуйте `file` (або `stdout` / `stderr`): ресурс `stream`, відкритий батьком, не
можна поділити з воркер-потоками, тож він використовується лише на батьку.

**Як це виглядає** — `format` це `plain`, `logfmt`, `json`, `pretty` (кольоровий консольний
рядок) або `template`:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

Плейсхолдери: `{ts}` або `{ts:PATTERN}` (у стилі `date()`: `Y y m d H i s v`), `{level}`,
`{msg}`, `{attrs}`, `{trace}`, `{span}`. Усе інше друкується як є.

Призначення `syslog` говорить RFC 5424 поверх TCP, UDP або unix-сокета:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### Access log

Задайте `category`, щоб вибрати, що отримує призначення: `app` (за замовчуванням) отримує
серверну діагностику, `access` отримує один запис на кожен завершений запит, `all` отримує
обидва. Тож JSON access log і читабельна консоль з діагностикою можуть працювати поруч.

Access-записи дотримуються OpenTelemetry HTTP conventions. Один `json`-запис:

```json
{
    "Timestamp": "2026-07-15T07:03:37.740Z",
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

Запис пишеться для кожного запиту через HTTP/1, HTTP/2 і HTTP/3, зокрема під пулом воркерів.
Якщо запит ніс W3C trace context, він теж включається.

## Runtime-лічильники: `getRuntimeStats()`

`getRuntimeStats()` повідомляє про власні пули пам'яті сервера і cross-worker трафік
WebSocket-топіків — корисно, щоб приписати зростання пам'яті конкретній підсистемі. Opt-in не
потрібен. Ключі включають арену з'єднань (`conn_arena_*`), пул тіл запитів (`body_pool*`) і
доставку топіків (`ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped`).

## HTTP/3 лічильники: `getHttp3Stats()`

`getHttp3Stats()` повертає один запис на кожен HTTP/3-listener з його QUIC-лічильниками
(`quic_packets_sent`, `quic_bytes_sent`, лічильники датаграм тощо). Повертає порожній масив на
збірці без `--enable-http3`.

## Див. також

- [Multi-worker](/uk/docs/server/workers.html): логування і зупинка під пулом
- [Конфігурація](/uk/docs/server/configuration.html)
- [`HttpServer::getStats()`](/uk/docs/reference/server/http-server.html)
