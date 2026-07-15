---
layout: docs
lang: de
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /de/docs/server/observability.html
page_title: "TrueAsync Server: Observability"
description: "Request-Statistiken mit getStats(), ein Prometheus-/metrics-Endpoint und Grafana, strukturiertes Logging und ein Access-Log mit setLogSinks(), sowie Runtime-Counter."
---

# Observability

(PHP 8.6+, true_async_server 0.10+)

Der Server kann Request-Statistiken melden, strukturierte Logs schreiben und pro Anfrage einen
Access-Log-Record ausgeben. Alles hier ist standardmäßig aus.

## Request-Statistiken: `getStats()`

Statistiken mit `setStatsEnabled(true)` einschalten, dann mit `getStats()` auslesen:

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

`getStats()` liefert Counter pro Worker und eine kombinierte Summe. Es wirft, wenn die Statistiken
nicht aktiviert wurden.

```php
[
    'enabled' => true,
    'workers' => [ 0 => [ /* Counter eines Workers */ ], 1 => [ … ] ],
    'totals'  => [ /* über Worker summiert */ ],
]
```

`totals` enthält:

| Counter | Bedeutung |
|---------|-----------|
| `total_requests` | abgeschlossene Anfragen |
| `responses_2xx_total` … `responses_5xx_total` | Antworten pro Statusklasse; die vier ergeben zusammen `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | offene Verbindungen pro Protokoll |

Totals wachsen über ein `reload()` hinweg weiter; die Verbindungs-Counter erfassen nur lebende
Worker.

## Prometheus und Grafana

Der Server stellt selbst keinen `/metrics`-Endpoint bereit — `getStats()` gibt Ihnen ein einfaches
PHP-Array, und Sie formen es in das um, was Ihr Monitoring-Stack erwartet. Für Prometheus heißt
das: ein kleiner Handler, der das Array als [Text Exposition
Format](https://prometheus.io/docs/instrumenting/exposition_formats/) formatiert:

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

Prometheus auf den Endpoint richten:

```yaml
scrape_configs:
  - job_name: 'true-async-server'
    static_configs:
      - targets: ['your-server:8080']
```

Die Counter liegen in einer prozessweiten Tabelle, die jeder Worker aktualisiert und `getStats()`
liest, sodass ein einzelner Scrape den gesamten Pool abdeckt:

![Metrics-Fluss von den Workern zu Grafana](/diagrams/en/server-observability/metrics-flow.svg)

Von dort zeichnet Grafana die Request-Rate, Statusklassen und offenen Verbindungen wie jede andere
Prometheus-Quelle:

![Grafana-Dashboard über die Metriken des Servers](/diagrams/en/server-observability/grafana-dashboard.png)

## Logging: `setLogSinks()`

`setLogSinks()` schickt jeden Log-Record an ein oder mehrere Ziele, jedes mit eigenem Format und
eigenem Mindest-Level:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::WARN],
]);
```

Bis zu 8 Ziele. Das ersetzt die Single-Stream-Varianten `setLogSeverity()` / `setLogStream()`.

**Wohin ein Record geht** — `type` ist `file`, `stdout`, `stderr`, `syslog` oder `stream`. Unter
einem Worker-Pool `file` (oder `stdout` / `stderr`) nutzen: eine vom Parent geöffnete
`stream`-Ressource lässt sich nicht mit Worker-Threads teilen, sie wird also nur auf dem Parent
verwendet.

**Wie es aussieht** — `format` ist `plain`, `logfmt`, `json`, `pretty` (eine farbige Konsolenzeile)
oder `template`:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

Platzhalter: `{ts}` oder `{ts:PATTERN}` (`date()`-Stil `Y y m d H i s v`), `{level}`, `{msg}`,
`{attrs}`, `{trace}`, `{span}`. Alles andere wird so ausgegeben, wie es dasteht.

Ein `syslog`-Ziel spricht RFC 5424 über TCP, UDP oder einen Unix-Socket:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### Access-Log

Mit `category` wählen Sie, was ein Ziel erhält: `app` (der Default) bekommt Server-Diagnostik,
`access` bekommt einen Record pro abgeschlossener Anfrage, `all` bekommt beides. So laufen ein
JSON-Access-Log und eine lesbare Diagnostik-Konsole nebeneinander.

Access-Records folgen den OpenTelemetry-HTTP-Conventions. Ein `json`-Record:

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

Für jede Anfrage über HTTP/1, HTTP/2 und HTTP/3 wird ein Record geschrieben, auch unter einem
Worker-Pool. Trug die Anfrage einen W3C-Trace-Context, wird er aufgenommen.

## Runtime-Counter: `getRuntimeStats()`

`getRuntimeStats()` meldet die server-eigenen Memory-Pools und den Cross-Worker-WebSocket-Topic-
Traffic — nützlich, um Speicherwachstum einem Subsystem zuzuschreiben. Kein Opt-in nötig. Zu den
Keys gehören die Connection-Arena (`conn_arena_*`), der Request-Body-Pool (`body_pool*`) und die
Topic-Zustellung (`ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped`).

## HTTP/3-Counter: `getHttp3Stats()`

`getHttp3Stats()` liefert einen Eintrag pro HTTP/3-Listener mit dessen QUIC-Countern
(`quic_packets_sent`, `quic_bytes_sent`, Datagramm-Counts und so weiter). Auf einem Build ohne
`--enable-http3` liefert es ein leeres Array.

## Siehe auch

- [Multi-Worker](/de/docs/server/workers.html): Logging und Shutdown unter einem Pool
- [Konfiguration](/de/docs/server/configuration.html)
- [`HttpServer::getStats()`](/de/docs/reference/server/http-server.html)
