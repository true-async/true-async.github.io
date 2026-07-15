---
layout: docs
lang: es
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /es/docs/server/observability.html
page_title: "TrueAsync Server: observabilidad"
description: "Estadísticas de solicitudes entre workers (getStats), logging estructurado multi-sink (setLogSinks), un access log de OpenTelemetry y contadores de asignadores en runtime."
---

# Observabilidad

(PHP 8.6+, true_async_server 0.10+)

Tres cosas que un servidor en producción necesita exponer: **cuántas solicitudes atendió y
con qué status**, **un log que pueda enviar a algún sitio** y **un registro de acceso por
solicitud**. Esta página cubre las tres. Ninguna está activada por defecto: un servidor
inactivo no paga nada.

## Estadísticas entre workers: `getStats()`

Actívalo con `setStatsEnabled(true)` y luego lee el agregado con `HttpServer::getStats()`:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);          // debe fijarse antes de start()

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

`getStats()` lanza excepción salvo que las estadísticas estén activadas: con ellas apagadas
no se asigna ningún slab de contadores. La forma:

```php
[
    'enabled'  => true,
    'workers'  => [ 0 => [ /* los contadores de un worker */ ], 1 => [ … ], … ],
    'reactors' => [ /* solicitudes atendidas por completo en un reactor de transporte */ ],
    'totals'   => [ /* plegados a través de workers y reactors */ ],
]
```

`totals` es lo que quiere un scraper:

| Contador | Significado |
|----------|-------------|
| `total_requests` | cada solicitud completada |
| `responses_2xx_total` … `responses_5xx_total` | clasificadas una sola vez cada una, así que las cuatro suman `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | conexiones vivas por protocolo (un gauge) |
| `log_records_dropped_total` | líneas de log que un ring lleno descartó (véase más abajo) |

Cada contador se combina según lo que permite su significado. Los totales monótonos **suman y
sobreviven a un `reload()`**: los totales de un worker que se retira se heredan, así que un
scraper nunca ve un contador retroceder solo porque el pool rotó. Los gauges activos suman
únicamente a través de los workers vivos, así que el último recuento de conexiones de un
worker muerto no se arrastra como un fantasma. Las lecturas son lock-free, así que el agregado
puede quedar desactualizado como mucho en un worker a mitad de la rotación.

> **No captures `$server` en un manejador de solicitud para llamar a `getStats()` desde dentro.**
> Bajo un pool de workers eso crea un ciclo de referencias `HttpServer ⇄ handler`, y transferir
> el manejador a los workers cuelga el proceso
> ([true-async/php-async#196](https://github.com/true-async/php-async/issues/196)). Lee las
> estadísticas desde una corrutina aparte que sea dueña de `$server`, como arriba, no desde el
> manejador.

## Logging estructurado: `setLogSinks()`

Un mismo registro de log se reparte a la vez a varios **sinks**, cada uno con su propio
destino, formato y umbral de severity:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    // access log estructurado -> un fichero, como JSON de OpenTelemetry
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    // diagnóstico legible por humanos -> la consola, con color
    ['type' => 'stderr', 'format' => 'pretty',
     'category' => 'app', 'level' => LogSeverity::WARN],
]);
```

Esto reemplaza el azúcar de un solo stream `setLogSeverity()` / `setLogStream()`. Hasta 8 sinks;
una spec inválida lanza excepción en el momento de `setLogSinks()`, no en `start()`.

**Tipos de sink** — `stream`, `file`, `stdout`, `stderr`, `syslog`. Bajo un pool de workers usa
`file` (o `stdout`/`stderr`), nunca `stream`: un recurso de stream de PHP abierto por el padre no
puede cruzar a un hilo worker; el sink se queda en el padre y se omite en los workers con un aviso
al arrancar. `file` funciona porque cada worker reabre la ruta él mismo (modo append).

**Formatos** — `plain`, `logfmt`, `json` (un objeto OpenTelemetry-Logs por línea), `pretty`
(una línea de consola con color, decidido a partir del fd de destino respetando `NO_COLOR` /
`CLICOLOR_FORCE`), y `template` para un layout propio:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

`{ts}` (ISO-8601) o `{ts:PATTERN}` con un subconjunto estilo `date()` (`Y y m d H i s v`), más
`{level}`, `{msg}`, `{attrs}`, `{trace}`, `{span}`; cualquier otra cosa es literal.

**`syslog`** emite RFC 5424: octet-framed (RFC 6587) sobre TCP, un registro por datagrama en
`udp` / `udg`:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### El access log: `'category' => 'access'`

El `category` de un sink enruta los tipos de registro: `app` (el valor por defecto) recibe el
diagnóstico del servidor, `access` recibe exactamente **un registro estructurado por solicitud
completada** y `all` recibe ambos, de modo que un access log en JSON y una consola de diagnóstico
en pretty coexisten en un mismo servidor.

Los registros de acceso usan las convenciones semánticas HTTP estables de OpenTelemetry. Una
línea del formateador `json`, pretty-printed:

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

Se emite en cada ruta de completado —retorno del manejador, fichero estático, `sendFile()`,
rechazo de compresión, dispatch del reactor-pool— a través de HTTP/1, HTTP/2 y HTTP/3, incluido
bajo un pool de workers. El trace context W3C se añade cuando la solicitud traía uno. Los
formateadores de texto escapan los bytes de control en los valores, así que un campo derivado de
la solicitud no puede falsificar una línea de log.

### Ningún sink vuelve a llamar a PHP

Los registros se emiten desde callbacks IO de libuv y desde hilos de reactor HTTP/3 que no tienen
contexto PHP, así que la ruta de log nunca debe reentrar en la VM: no existe un sink de tipo
"llama a un callable de PHP", por diseño. Para exportar logs desde userland, apunta un sink a un
fichero o socket con `'format' => 'json'` y vacíalo desde tu propia corrutina. Esa es la forma
del async-appender, y además mantiene la latencia del exportador fuera de la ruta de la solicitud.

El ring de un sink está acotado —el productor nunca debe bloquear—, así que una ráfaga que supera
al escritor cuesta registros. Esos se cuentan en `log_records_dropped_total` (véase `getStats()`
arriba), no se pierden en silencio.

## Contadores de asignadores en runtime: `getRuntimeStats()`

`HttpServer::getRuntimeStats()` reporta los propios asignadores internos del servidor y el
tráfico de topics entre workers, los contadores que te permiten atribuir el RSS a un subsistema
en lugar de adivinar:

- `conn_arena_live` / `conn_arena_slots` / `conn_arena_chunks` / `conn_arena_bytes` — el slab
  de conexiones (un `http_connection_t` por cada conexión TCP viva).
- `body_pool` — caché por clase de tamaño de cuerpos de solicitud grandes, con
  `body_pool_total_bytes`.
- `ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped` — entrega de
  [topics WebSocket](/es/docs/server/websocket.html#topics-publishsubscribe-en-todos-los-workers)
  entre workers: publicaciones entregadas a otro worker, workers que el filtro de interés le
  permitió a un publisher saltarse, y publicaciones descartadas por un mailbox lleno (esta última
  es pérdida de datos).

A diferencia de `getStats()`, este no necesita opt-in.

## Contadores de HTTP/3: `getHttp3Stats()`

Una entrada por listener HTTP/3, con contadores QUIC por listener (`quic_packets_sent`,
`quic_bytes_sent`, recuentos de datagramas, `poll_rearms`, …). Devuelve un array vacío en una
build sin `--enable-http3`. Cada contador se lee con una carga atómica relaxed individual, así
que el reporte es internamente consistente incluso mientras el hilo del reactor sigue escribiendo.

## Véase también

- [Multi-worker](/es/docs/server/workers.html): logging y shutdown bajo un pool
- [Configuración](/es/docs/server/configuration.html)
- [`HttpServer::getStats()`](/es/docs/reference/server/http-server.html)
