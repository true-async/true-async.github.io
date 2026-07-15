---
layout: docs
lang: es
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /es/docs/server/observability.html
page_title: "TrueAsync Server: observabilidad"
description: "Estadísticas de solicitudes con getStats(), un endpoint /metrics de Prometheus y Grafana, logging estructurado y un access log con setLogSinks(), y contadores en runtime."
---

# Observabilidad

(PHP 8.6+, true_async_server 0.10+)

El servidor puede informar estadísticas de solicitudes, escribir logs estructurados y emitir un
registro de access log por cada solicitud. Todo lo de esta página está desactivado por defecto.

## Estadísticas de solicitudes: `getStats()`

Activa las estadísticas con `setStatsEnabled(true)` y luego léelas con `getStats()`:

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

`getStats()` devuelve los contadores por worker y un total combinado. Lanza una excepción si las
estadísticas no estaban activadas.

```php
[
    'enabled' => true,
    'workers' => [ 0 => [ /* los contadores de un worker */ ], 1 => [ … ] ],
    'totals'  => [ /* sumados a través de los workers */ ],
]
```

`totals` contiene:

| Contador | Significado |
|----------|-------------|
| `total_requests` | solicitudes completadas |
| `responses_2xx_total` … `responses_5xx_total` | respuestas por clase de status; las cuatro suman `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | conexiones abiertas por protocolo |

Los totales siguen creciendo a través de un `reload()`; los contadores de conexiones solo reflejan
los workers vivos.

## Prometheus y Grafana

El servidor no expone por sí mismo un endpoint `/metrics`: `getStats()` te da un array PHP normal, y
tú lo conviertes en lo que espere tu stack de monitorización. Para Prometheus eso significa un
pequeño manejador que da formato al array como el [formato de exposición en
texto](https://prometheus.io/docs/instrumenting/exposition_formats/):

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

Apunta Prometheus al endpoint:

```yaml
scrape_configs:
  - job_name: 'true-async-server'
    static_configs:
      - targets: ['your-server:8080']
```

Los contadores viven en una única tabla a nivel de proceso que cada worker actualiza y que
`getStats()` lee, así que un solo scrape cubre todo el pool:

![Flujo de métricas de los workers a Grafana](/diagrams/en/server-observability/metrics-flow.svg)

A partir de ahí Grafana grafica la tasa de solicitudes, las clases de status y las conexiones
abiertas como cualquier otra fuente de Prometheus:

![Dashboard de Grafana sobre las métricas del servidor](/diagrams/en/server-observability/grafana-dashboard.png)

## Logging: `setLogSinks()`

`setLogSinks()` envía cada registro de log a uno o varios destinos, cada uno con su propio formato y
nivel mínimo:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::WARN],
]);
```

Hasta 8 destinos. Esto reemplaza el `setLogSeverity()` / `setLogStream()` de un solo stream.

**A dónde va un registro** — `type` es `file`, `stdout`, `stderr`, `syslog` o `stream`. Con un pool
de workers, usa `file` (o `stdout` / `stderr`): un recurso `stream` abierto por el padre no puede
compartirse con los hilos worker, así que solo se usa en el padre.

**Cómo se ve** — `format` es `plain`, `logfmt`, `json`, `pretty` (una línea de consola con color) o
`template`:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

Marcadores: `{ts}` o `{ts:PATTERN}` (estilo `date()`: `Y y m d H i s v`), `{level}`, `{msg}`,
`{attrs}`, `{trace}`, `{span}`. Cualquier otra cosa se imprime tal cual.

Un destino `syslog` habla RFC 5424 sobre TCP, UDP o un socket unix:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### Access log

Ajusta `category` para elegir qué recibe un destino: `app` (el valor por defecto) recibe el
diagnóstico del servidor, `access` recibe un registro por cada solicitud completada y `all` recibe
ambos. Así, un access log en JSON y una consola de diagnóstico legible pueden funcionar a la vez.

Los registros de acceso siguen las convenciones HTTP de OpenTelemetry. Un registro `json`:

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

Se escribe un registro por cada solicitud sobre HTTP/1, HTTP/2 y HTTP/3, incluido bajo un pool de
workers. Si la solicitud traía un trace context W3C, se incluye.

## Contadores en runtime: `getRuntimeStats()`

`getRuntimeStats()` informa los propios pools de memoria del servidor y el tráfico de topics
WebSocket entre workers, útil para atribuir el crecimiento de memoria a un subsistema. No hace falta
activarlo. Entre las claves están el arena de conexiones (`conn_arena_*`), el pool de cuerpos de
solicitud (`body_pool*`) y la entrega de topics (`ws_topic_posted` / `ws_topic_skipped` /
`ws_topic_dropped`).

## Contadores de HTTP/3: `getHttp3Stats()`

`getHttp3Stats()` devuelve una entrada por cada listener HTTP/3 con sus contadores QUIC
(`quic_packets_sent`, `quic_bytes_sent`, recuentos de datagramas, etc.). Devuelve un array vacío en
una build sin `--enable-http3`.

## Véase también

- [Multi-worker](/es/docs/server/workers.html): logging y shutdown bajo un pool
- [Configuración](/es/docs/server/configuration.html)
- [`HttpServer::getStats()`](/es/docs/reference/server/http-server.html)
