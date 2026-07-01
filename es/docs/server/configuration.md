---
layout: docs
lang: es
path_key: "/docs/server/configuration.html"
nav_active: docs
permalink: /es/docs/server/configuration.html
page_title: "TrueAsync Server: configuración"
description: "HttpServerConfig: listeners, TLS, timeouts, contrapresión, límites de cuerpo, streaming del body, flags JSON, logging, HTTP/3."
---

# Configuración de TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

Toda la configuración del servidor se establece mediante el objeto
[`TrueAsync\HttpServerConfig`](/es/docs/reference/server/http-server-config.html) antes de la
llamada a `new HttpServer($config)`. Una vez creado el `HttpServer`, el config queda **congelado**:
cualquier setter sobre él lanzará `HttpServerRuntimeException`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->addListener('0.0.0.0', 8443, tls: true)
    ->addHttp3Listener('0.0.0.0', 8443)
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key')
    ->setWorkers(4)
    ->setKeepAliveTimeout(60)
    ->setMaxBodySize(50 * 1024 * 1024)
    ->setCompressionEnabled(true)
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);

$server = new HttpServer($config);
```

Los setters devuelven `static`, así que el config se construye en cadena.

## Listeners

El servidor puede escuchar simultáneamente en un número arbitrario de sockets TCP/Unix y de puertos
UDP (para HTTP/3).

| Método | Qué hace |
|--------|----------|
| `addListener($host, $port, $tls = false)` | TCP, HTTP/1.1 + HTTP/2 (h2c por preface en texto claro, h2 vía ALPN sobre TLS) |
| `addHttp1Listener($host, $port, $tls = false)` | TCP, solo HTTP/1.1. Un cliente con preface HTTP/2 recibirá 400 |
| `addHttp2Listener($host, $port, $tls = false)` | TCP, solo HTTP/2. Sin TLS es h2c con preface obligatorio |
| `addHttp3Listener($host, $port)` | UDP, HTTP/3 / QUIC. TLS 1.3 activado automáticamente, se usa el certificado del servidor |
| `addUnixListener($path)` | Socket Unix, HTTP/1.1 + HTTP/2 (estilo h2c) |

```php
$config
    ->addListener('0.0.0.0', 80)              // H1 + H2c
    ->addListener('0.0.0.0', 443, tls: true)  // H1 + H2 sobre TLS
    ->addHttp3Listener('0.0.0.0', 443);       // H3 / QUIC en el mismo puerto
```

Para un rollout escalonado de HTTP/3 se puede desactivar temporalmente el anuncio `Alt-Svc`:

```php
$config->setHttp3AltSvcEnabled(false);
```

## TLS

```php
$config
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key');
```

El certificado y la clave son comunes para todos los listeners TLS (incluido HTTP/3). TLS 1.2/1.3,
ALPN, cifrados débiles desactivados, stateless session tickets, renegociación segura desactivada.

## Workers y bootloader

`setWorkers(1)` (valor por defecto) activa el modo single-threaded: `start()` mantiene el event-loop
en el hilo llamante.

`setWorkers(N > 1)` levanta el pool integrado de N hilos mediante `Async\ThreadPool`. Cada worker
hace re-bind sobre los mismos listeners y el kernel (Linux/BSD) distribuye el accept mediante
`SO_REUSEPORT`. El `start()` padre espera a que terminen todos los workers.

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // se ejecuta una sola vez en cada worker antes del task-loop
        require __DIR__ . '/vendor/autoload.php';
        Database::warmupPool();
        OpcacheWarm::compile();
    });
```

Más detalles: [Multi-worker](/es/docs/server/workers.html).

## Timeouts

| Método | Por defecto | Qué cuenta el timeout |
|--------|-------------|-----------------------|
| `setReadTimeout($sec)` | — | recepción de la solicitud completa |
| `setWriteTimeout($sec)` | — | envío de la respuesta |
| `setKeepAliveTimeout($sec)` | — | inactividad entre solicitudes; `0` desactiva keep-alive |
| `setShutdownTimeout($sec)` | — | graceful shutdown: cuánto esperar a las solicitudes activas |

## Límites y contrapresión

```php
$config
    ->setBacklog(1024)
    ->setMaxConnections(50_000)
    ->setMaxInflightRequests(10_000)
    ->setMaxBodySize(10 * 1024 * 1024)
    ->setBackpressureTargetMs(10);
```

- **`setMaxConnections($n)`** es un límite estricto sobre el número de conexiones TCP. `0` elimina
  el límite.
- **`setMaxInflightRequests($n)`** controla la admisión: tras este número de manejadores activos
  las solicitudes nuevas reciben un rechazo rápido. H1 → 503 + `Retry-After: 1`,
  H2 → `RST_STREAM REFUSED_STREAM` (reintento seguro según RFC 7540 §8.1.4). En H2 un límite
  estricto sobre conexiones no ayuda, porque los nuevos streams llegan por la conexión ya aceptada.
  `0` toma el valor `max_connections × 10`.
- **`setMaxBodySize($bytes)`** es el máximo del cuerpo de solicitud. Por defecto 10 MiB, rango
  1 KiB..16 GiB. H1 devuelve 413 y cierra la conexión; H2 envía `RST_STREAM(INTERNAL_ERROR)`.
- **`setBackpressureTargetMs($ms)`** es el umbral de sojourn de CoDel para la contrapresión del
  lado accept. Cuando el queue-wait por solicitud se mantiene por encima del umbral 100 ms
  consecutivos, el socket de listen se pausa. `0` desactiva CoDel. Por defecto 5 ms; para web
  típico 10–20 ms; para handlers lentos (BD, IO) 50–100 ms.

### Graceful drain (Step 8)

Control de migración de carga detrás de un balanceador L4:

| Método | Valor por defecto | Propósito |
|--------|-------------------|-----------|
| `setMaxConnectionAgeMs($ms)` | 0 (off) | Tras ±10% de jitter del límite, la conexión recibe Connection: close (H1) o GOAWAY (H2). Equivalente a `MAX_CONNECTION_AGE` de gRPC. Producción: 600_000 (10 min). |
| `setMaxConnectionAgeGraceMs($ms)` | 0 | Hard-close tras `Connection: close`/GOAWAY. `0` desactiva el temporizador de force-close. |
| `setDrainSpreadMs($ms)` | 5000 | Ventana de reparto uniforme del drain por conexión ante un trip de CoDel / hard-cap (anti thundering herd). |
| `setDrainCooldownMs($ms)` | 10_000 | Gap mínimo entre disparos reactivos de drain. |

## Límites de streaming HTTP/2

```php
$config
    ->setStreamWriteBufferBytes(256 * 1024)  // 256 KiB por stream, 4 KiB .. 64 MiB
    ->setH2StaticBudgetMax(0);               // 0 = auto (memory_limit / 8)
```

`HttpResponse::send($chunk)` bloquea la corrutina del manejador **solo** ante contrapresión: cuando
el staging buffer por stream se llena. Por defecto 256 KiB (comparativa: gRPC-Go 64 KiB,
Envoy 1 MiB, Node.js 16 KiB).

## Knobs de producción de HTTP/3

```php
$config
    ->setHttp3IdleTimeoutMs(30_000)           // RFC 9000 §10.1
    ->setHttp3StreamWindowBytes(256 * 1024)   // control de flujo por stream
    ->setHttp3MaxConcurrentStreams(100)       // initial_max_streams_bidi
    ->setHttp3PeerConnectionBudget(16)        // tope por IP origen, protección slow-loris
    ->setHttp3AltSvcEnabled(true);            // anuncio Alt-Svc según RFC 7838
```

El `initial_max_data` a nivel de conexión se deriva como `window × max_concurrent_streams` (patrón
de nginx).

## WebSocket

```php
$config
    ->setWsMaxMessageSize(1024 * 1024)   // 1 MiB, 128 .. 256 MiB
    ->setWsMaxFrameSize(1024 * 1024)     // 1 MiB, mismo rango
    ->setWsPingIntervalMs(30_000)        // PING de keepalive en inactividad
    ->setWsPongTimeoutMs(60_000)         // deadline para la respuesta PONG
    ->setWsPermessageDeflate(false);     // RFC 7692, desactivado por defecto
```

- **`setWsMaxMessageSize($bytes)`** es el tamaño máximo para un mensaje reensamblado. Superarlo
  produce `1009 Message Too Big` y cierra la conexión (RFC 6455 §7.4.1).
- **`setWsMaxFrameSize($bytes)`** es el tamaño máximo para un solo frame. Protege contra una
  avalancha de fragmentos, donde el cliente envía millones de fragmentos diminutos.
- **`setWsPingIntervalMs($ms)`** define cada cuánto el servidor hace ping a las conexiones
  inactivas por su cuenta. `0` desactiva el ping automático.
- **`setWsPongTimeoutMs($ms)`** define cuánto esperar el PONG tras un PING antes de considerar
  la conexión muerta y cerrarla con el código `1001 GoingAway`. `0` desactiva el timeout.
- **`setWsPermessageDeflate($bool)`** activa RFC 7692, compresión a nivel de mensaje. Desactivado
  por defecto: es un opt-in deliberado, porque la compresión cuesta CPU y amplía la superficie de
  ataque de bombas de descompresión. Se negocia solo cuando el propio cliente ofrece esta
  extensión; requiere una build con zlib.

Véase la [guía de WebSocket](/es/docs/server/websocket.html) y la
[referencia](/es/docs/reference/server/websocket.html) para la API de conexión propiamente dicha.

## Streaming del cuerpo de la solicitud

Activa el stream pull-based del cuerpo de la solicitud (issue #26): los parsers H1/H2 ponen los
bloques en una cola y el manejador los lee mediante
[`HttpRequest::readBody()`](/es/docs/reference/server/http-request.html#readbody) sin retener todo
el cuerpo en RAM.

```php
$config->setBodyStreamingEnabled(true);

$server->addHttpHandler(function ($req, $res) {
    while (($chunk = $req->readBody()) !== null) {
        // procesar el bloque (p. ej. escritura por bloques a disco, parsing)
    }
    $res->setStatusCode(204);
});
```

Sin `setBodyStreamingEnabled(true)` el manejador recibe el cuerpo ya leído por completo mediante
`getBody()`; `readBody()` no está disponible en ese modo.

Comparativa con 50 POSTs paralelos de 20 MiB (h2load, WSL2): el RSS pico baja de 1170 MiB a
**197 MiB** (×6), el throughput sube de 36 req/s a **100 req/s** (×2.7), porque el dispatch del
manejador ya no espera al cuerpo completo.

Véase también [Streaming](/es/docs/server/streaming.html).

## Auto-await del body

```php
$config->setAutoAwaitBody(true);   // por defecto: true
```

Cuando está activado, las solicitudes no-multipart esperan al cuerpo completo antes de invocar el
manejador (multipart siempre es stream). Útil para el procesamiento clásico del cuerpo en bloque.

## JSON

```php
$config->setJsonEncodeFlags(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

Estos flags se aplican a [`HttpResponse::json()`](/es/docs/reference/server/http-response.html#json)
cuando el llamante no pasa `$flags` explícitamente. `JSON_THROW_ON_ERROR` se elimina silenciosamente:
un error de codificación produce un 500 con cuerpo JSON de error; la excepción no se propaga al
manejador.

## Logging

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);   // cualquier php_stream: fichero, php://stderr, php://memory, wrapper de usuario
```

El logger está desactivado por defecto (`LogSeverity::OFF`). La severity queda fijada al arrancar;
no se admiten cambios en runtime (modelo single-threaded lock-free).

Niveles (SeverityNumber de OpenTelemetry):

| Nivel | Qué entra |
|-------|-----------|
| `OFF` (0) | nada |
| `DEBUG` (5) | trazado de paquetes H3, etc. |
| `INFO` (9) | ciclo de vida del servidor (start/stop), reintentos de bind |
| `WARN` (13) | fallo de TLS handshake, peer reset, excepciones absorbidas |
| `ERROR` (17) | fallo de bind de listener, errores duros de protocolo |

Se ha omitido `FATAL` adrede: viaja a través de `zend_error_noreturn(E_ERROR)`, que ya aborta el
proceso.

## Telemetría (W3C Trace Context)

```php
$config->setTelemetryEnabled(true);
```

Cuando está activada, los `traceparent` / `tracestate` entrantes se analizan y se vinculan a la
solicitud. En el manejador están disponibles:

```php
$req->getTraceParent();   // raw header
$req->getTraceState();
$req->getTraceId();       // 32 caracteres hex en minúsculas
$req->getSpanId();        // 16 caracteres hex en minúsculas
$req->getTraceFlags();    // int (0x01 = sampled)
```

## Referencia completa

Véase [`TrueAsync\HttpServerConfig`](/es/docs/reference/server/http-server-config.html): los más
de 60 métodos con descripción detallada y rangos válidos.
