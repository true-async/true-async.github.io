---
layout: docs
lang: ru
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /ru/docs/server/observability.html
page_title: "TrueAsync Server: наблюдаемость"
description: "Статистика запросов через getStats(), эндпоинт /metrics для Prometheus и Grafana, структурированное логирование и access log через setLogSinks(), а также runtime-счётчики."
---

# Наблюдаемость

(PHP 8.6+, true_async_server 0.10+)

Сервер умеет показывать статистику запросов, писать структурированные логи и выдавать по одной
записи access log на каждый запрос. Всё это по умолчанию выключено.

## Статистика запросов: `getStats()`

Включите статистику через `setStatsEnabled(true)`, затем читайте её через `getStats()`:

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

`getStats()` возвращает счётчики по каждому воркеру и общий итог. Он бросает исключение, если
статистика не была включена.

```php
[
    'enabled' => true,
    'workers' => [ 0 => [ /* счётчики одного воркера */ ], 1 => [ … ] ],
    'totals'  => [ /* сумма по всем воркерам */ ],
]
```

В `totals` лежит:

| Счётчик | Значение |
|---------|----------|
| `total_requests` | завершённые запросы |
| `responses_2xx_total` … `responses_5xx_total` | ответы по классам статусов; четыре в сумме дают `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | открытые соединения по протоколу |

Итоги продолжают расти через `reload()`; счётчики соединений отражают только живые воркеры.

## Prometheus и Grafana

Сам сервер не отдаёт эндпоинт `/metrics` — `getStats()` возвращает обычный PHP-массив, а вы
превращаете его в то, что ждёт ваш стек мониторинга. Для Prometheus это один небольшой обработчик,
который форматирует массив в [text exposition
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

Нацельте Prometheus на этот эндпоинт:

```yaml
scrape_configs:
  - job_name: 'true-async-server'
    static_configs:
      - targets: ['your-server:8080']
```

Счётчики живут в одной общей на процесс таблице, которую обновляет каждый воркер и читает
`getStats()`, поэтому один скрейп покрывает весь пул:

![Поток метрик от воркеров к Grafana](/diagrams/en/server-observability/metrics-flow.svg)

Дальше Grafana строит графики частоты запросов, классов статусов и открытых соединений — как для
любого другого источника Prometheus:

![Дашборд Grafana по метрикам сервера](/diagrams/en/server-observability/grafana-dashboard.png)

## Логирование: `setLogSinks()`

`setLogSinks()` отправляет каждую запись лога в один или несколько пунктов назначения, у каждого
свой формат и минимальный уровень:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::WARN],
]);
```

До 8 пунктов назначения. Это заменяет однопоточные `setLogSeverity()` / `setLogStream()`.

**Куда попадает запись** — `type` может быть `file`, `stdout`, `stderr`, `syslog` или `stream`.
При пуле воркеров используйте `file` (или `stdout` / `stderr`): stream-ресурс, открытый родителем,
нельзя разделить с потоками-воркерами, поэтому он работает только на родителе.

**Как она выглядит** — `format` может быть `plain`, `logfmt`, `json`, `pretty` (цветная консольная
строка) или `template`:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

Подстановки: `{ts}` или `{ts:PATTERN}` (в стиле `date()`: `Y y m d H i s v`), `{level}`, `{msg}`,
`{attrs}`, `{trace}`, `{span}`. Всё остальное выводится как есть.

Назначение типа `syslog` говорит по RFC 5424 поверх TCP, UDP или unix-сокета:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### Access log

Задайте `category`, чтобы выбрать, что получает пункт назначения: `app` (по умолчанию) получает
диагностику сервера, `access` получает по одной записи на каждый завершённый запрос, `all` получает
и то и другое. Так JSON access log и читаемая консоль диагностики могут работать параллельно.

Записи access следуют конвенциям OpenTelemetry для HTTP. Одна запись `json`:

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

Запись пишется для каждого запроса по HTTP/1, HTTP/2 и HTTP/3, в том числе под пулом воркеров. Если
запрос нёс W3C trace context, он тоже включается.

## Runtime-счётчики: `getRuntimeStats()`

`getRuntimeStats()` сообщает о собственных пулах памяти сервера и cross-worker трафике
WebSocket-топиков — полезно, чтобы отнести рост памяти к конкретной подсистеме. Включать ничего не
нужно. Среди ключей — арена соединений (`conn_arena_*`), пул тел запросов (`body_pool*`) и доставка
топиков (`ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped`).

## HTTP/3-счётчики: `getHttp3Stats()`

`getHttp3Stats()` возвращает по одной записи на каждый HTTP/3-listener с его QUIC-счётчиками
(`quic_packets_sent`, `quic_bytes_sent`, счётчики датаграмм и так далее). На сборке без
`--enable-http3` возвращает пустой массив.

## См. также

- [Multi-worker](/ru/docs/server/workers.html): логирование и shutdown под пулом
- [Конфигурация](/ru/docs/server/configuration.html)
- [`HttpServer::getStats()`](/ru/docs/reference/server/http-server.html)
