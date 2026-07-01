---
layout: docs
lang: es
path_key: "/docs/reference/server/http-server-config.html"
nav_active: docs
permalink: /es/docs/reference/server/http-server-config.html
page_title: "TrueAsync\\HttpServerConfig"
description: "Referencia completa de HttpServerConfig: listeners, workers, TLS, timeouts, contrapresión, drain, compresión, knobs HTTP/3, body streaming, logging."
---

# TrueAsync\HttpServerConfig

(PHP 8.6+, true_async_server 0.6+)

Configuración del servidor. Todos los métodos son fluent (devuelven `static`). Tras pasar el
objeto a `new HttpServer($config)` el config queda **congelado**: cualquier setter lanza
`HttpServerRuntimeException`. Para comprobarlo: `isLocked()`.

Véase también [Configuración](/es/docs/server/configuration.html), guía paso a paso.

## Constructor

### __construct

```php
public HttpServerConfig::__construct(?string $host = null, int $port = 8080)
```

Parámetros opcionales: atajo para un único listener. Lo más habitual es usarlo sin argumentos y
con `addListener()`.

## Listeners

### addListener

```php
public HttpServerConfig::addListener(string $host, int $port, bool $tls = false): static
```

Listener TCP que acepta HTTP/1.1 y HTTP/2 (h2c por detección de preface en texto claro, h2 vía
ALPN sobre TLS).

### addHttp1Listener

```php
public HttpServerConfig::addHttp1Listener(string $host, int $port, bool $tls = false): static
```

Listener TCP solo HTTP/1.1. Una conexión con preface HTTP/2 se entrega a llhttp, que emite un
400 Bad Request conforme al RFC y cierra.

### addHttp2Listener

```php
public HttpServerConfig::addHttp2Listener(string $host, int $port, bool $tls = false): static
```

Listener solo HTTP/2.

- `$tls=false`: h2c (H2 en texto claro). El listener requiere el preface RFC 7540 §3.5; todo lo
  demás va a `BAD_CLIENT_MAGIC` de nghttp2 y recibe un `GOAWAY(PROTOCOL_ERROR)` conforme.
- `$tls=true`: el servidor anuncia mediante ALPN solo `h2`.

### addUnixListener

```php
public HttpServerConfig::addUnixListener(string $path): static
```

Listener de socket Unix (H1 + H2, estilo h2c).

### addHttp3Listener

```php
public HttpServerConfig::addHttp3Listener(string $host, int $port): static
```

HTTP/3 / QUIC sobre UDP. TLS 1.3 es obligatorio; se usa el certificado del servidor, no hay flag
`$tls` aparte. La extensión debe estar compilada con `--enable-http3`, en caso contrario
`start()` lanzará una excepción.

### getListeners

```php
public HttpServerConfig::getListeners(): array
```

Array con todos los listeners registrados.

## Límites de conexión

### setBacklog / getBacklog

```php
public HttpServerConfig::setBacklog(int $backlog): static
public HttpServerConfig::getBacklog(): int
```

Backlog del socket. Default 128.

### setWorkers / getWorkers

```php
public HttpServerConfig::setWorkers(int $workers): static
public HttpServerConfig::getWorkers(): int
```

Tamaño del pool de workers integrado (issue #11).

- `1` (default): single-threaded.
- `> 1`: `start()` spawnea un `Async\ThreadPool` del tamaño indicado, el config + handler-set se
  replican mediante `transfer_obj`, el padre espera a que terminen todos los workers. Cada worker
  hace re-bind de los listeners; el kernel balancea el accept mediante `SO_REUSEPORT` (Linux/BSD).

### setBootloader / getBootloader

```php
public HttpServerConfig::setBootloader(?\Closure $bootloader): static
public HttpServerConfig::getBootloader(): ?\Closure
```

Hook de arranque por worker. El pool deep-copia la closure una vez y la lanza en cada worker
antes del task-loop. Lugar ideal para autoload, calentamiento de pools de conexiones,
precompilación de opcache.

Solo se aplica con `setWorkers() > 1`. Una excepción en el bootloader hace fallar al pool entero.
Requiere TrueAsync ABI v0.15+.

### setMaxConnections / getMaxConnections

```php
public HttpServerConfig::setMaxConnections(int $maxConnections): static
public HttpServerConfig::getMaxConnections(): int
```

Límite estricto de conexiones concurrentes. `0`: sin límite.

### setMaxInflightRequests / getMaxInflightRequests

```php
public HttpServerConfig::setMaxInflightRequests(int $n): static
public HttpServerConfig::getMaxInflightRequests(): int
```

Control de admisión: al alcanzar el límite, las nuevas solicitudes reciben rechazo rápido — H1 →
503 + `Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM` (reintento seguro según RFC 7540
§8.1.4). `0` es disabled (default); si se queda en `0` al hacer `start()` el límite se deriva como
`max_connections × 10`.

## Timeouts

| Método | Qué cuenta el timeout |
|--------|-----------------------|
| `setReadTimeout(int)` / `getReadTimeout(): int` | recepción de la solicitud |
| `setWriteTimeout(int)` / `getWriteTimeout(): int` | envío de la respuesta |
| `setKeepAliveTimeout(int)` / `getKeepAliveTimeout(): int` | inactividad entre solicitudes; `0` desactiva keep-alive |
| `setShutdownTimeout(int)` / `getShutdownTimeout(): int` | cuánto esperar a las solicitudes activas en graceful shutdown |

Valores en segundos. `0` (donde aplique) significa desactivado.

## Contrapresión (CoDel)

### setBackpressureTargetMs / getBackpressureTargetMs

```php
public HttpServerConfig::setBackpressureTargetMs(int $ms): static
public HttpServerConfig::getBackpressureTargetMs(): int
```

Sojourn objetivo de CoDel. Cuando el queue-wait por solicitud se mantiene por encima del umbral
100 ms consecutivos, el socket de listen se pausa. Rango 0..10_000, default 5. `0` desactiva
CoDel.

Guía:
- handlers rápidos (<5 ms): default 5
- web típico: 10..20
- lentos (BD, IO): 50..100

## Graceful drain (Step 8)

### setMaxConnectionAgeMs / getMaxConnectionAgeMs

```php
public HttpServerConfig::setMaxConnectionAgeMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeMs(): int
```

Tras `(age ± 10% de jitter)` de vida, H1 manda la siguiente respuesta con `Connection: close`,
H2 envía `GOAWAY`. Equivalente a `MAX_CONNECTION_AGE` de gRPC. Default `0` (off); recomendación
en producción 600_000 (10 min) detrás de un LB L4. Debe ser `0` o ≥ 1000.

### setMaxConnectionAgeGraceMs / getMaxConnectionAgeGraceMs

```php
public HttpServerConfig::setMaxConnectionAgeGraceMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeGraceMs(): int
```

Hard-close tras `Connection: close`/`GOAWAY`. `0`: sin temporizador de force-close; valores
distintos de cero ≥ 1000.

### setDrainSpreadMs / getDrainSpreadMs

```php
public HttpServerConfig::setDrainSpreadMs(int $ms): static
public HttpServerConfig::getDrainSpreadMs(): int
```

Ventana de reparto uniforme del drain por conexión ante CoDel-trip / hard-cap (anti thundering
herd). Equivalente a `close-spread-time` de HAProxy. Default 5000, ≥ 100.

### setDrainCooldownMs / getDrainCooldownMs

```php
public HttpServerConfig::setDrainCooldownMs(int $ms): static
public HttpServerConfig::getDrainCooldownMs(): int
```

Gap mínimo entre disparos reactivos de drain. Los disparos dentro del cooldown incrementan un
contador de telemetría. Default 10_000, ≥ 1000.

## Streaming HTTP/2

### setStreamWriteBufferBytes / getStreamWriteBufferBytes

```php
public HttpServerConfig::setStreamWriteBufferBytes(int $bytes): static
public HttpServerConfig::getStreamWriteBufferBytes(): int
```

Tope de la chunk-queue por stream para la contrapresión de `HttpResponse::send()`. Solo HTTP/2;
HTTP/1 chunked usa el send-buffer del kernel.

Default 262_144 (256 KiB). Rango 4_096..67_108_864 (64 MiB).

Baseline del sector: gRPC-Go 64 KiB, Envoy 1 MiB, Node.js 16 KiB.

### setH2StaticBudgetMax / getH2StaticBudgetMax

```php
public HttpServerConfig::setH2StaticBudgetMax(int $bytes): static
public HttpServerConfig::getH2StaticBudgetMax(): int
```

Tope por worker para los buffers de cuerpo de archivos estáticos en HTTP/2 (read-ahead chunks +
ring queues). `0`: auto (`memory_limit / 8`). Cualquier valor explícito se acota para que el
static budget no supere `memory_limit` menos una pequeña reserva.

## Límites del body

### setMaxBodySize / getMaxBodySize

```php
public HttpServerConfig::setMaxBodySize(int $bytes): static
public HttpServerConfig::getMaxBodySize(): int
```

Máximo del cuerpo de solicitud (H1 y H2). H1: 413 + close; H2: `RST_STREAM(INTERNAL_ERROR)`
(la conexión sigue activa para otros streams).

Default 10_485_760 (10 MiB). Rango 1_024..17_179_869_184 (16 GiB).

## WebSocket {#websocket}

(true_async_server 0.9+). Guía: [WebSocket](/es/docs/server/websocket.html).

### setWsMaxMessageSize / getWsMaxMessageSize

```php
public HttpServerConfig::setWsMaxMessageSize(int $bytes): static
public HttpServerConfig::getWsMaxMessageSize(): int
```

Tamaño máximo de un mensaje WebSocket reensamblado. Un conjunto de frames cuyo payload combinado
supere el límite cierra la conexión con `1009 Message Too Big` de RFC 6455 §7.4.1.

Default 1_048_576 (1 MiB). Rango 128..268_435_456 (256 MiB).

### setWsMaxFrameSize / getWsMaxFrameSize

```php
public HttpServerConfig::setWsMaxFrameSize(int $bytes): static
public HttpServerConfig::getWsMaxFrameSize(): int
```

Payload máximo para un solo frame. Protege contra ataques de avalancha de fragmentos, donde el
cliente envía millones de fragmentos diminutos.

Default 1_048_576 (1 MiB). Mismo rango que `setWsMaxMessageSize`.

### setWsPingIntervalMs / getWsPingIntervalMs

```php
public HttpServerConfig::setWsPingIntervalMs(int $ms): static
public HttpServerConfig::getWsPingIntervalMs(): int
```

Cada cuánto el servidor hace ping a una conexión inactiva por lo demás. El peer debe responder
con PONG dentro de `WsPongTimeoutMs`, o la conexión se cierra con el código `1001 GoingAway`.

Default 30_000 (30 s). `0` desactiva el ping automático.

### setWsPongTimeoutMs / getWsPongTimeoutMs

```php
public HttpServerConfig::setWsPongTimeoutMs(int $ms): static
public HttpServerConfig::getWsPongTimeoutMs(): int
```

El deadline del PONG: cuánto espera el servidor tras un PING antes de declarar la conexión
muerta.

Default 60_000 (60 s). `0` desactiva el timeout.

### setWsPermessageDeflate / getWsPermessageDeflate

```php
public HttpServerConfig::setWsPermessageDeflate(bool $enabled): static
public HttpServerConfig::getWsPermessageDeflate(): bool
```

Activa permessage-deflate de RFC 7692 (compresión a nivel de mensaje). Desactivado por defecto:
es un opt-in, porque la compresión cuesta CPU y amplía la superficie de ataque de bombas de
descompresión. Se negocia solo cuando el cliente ofrece la extensión; el tope del mensaje
reensamblado se comprueba tanto antes como después de la descompresión. Requiere una build con
zlib (compresión HTTP).

## Knobs HTTP/3

### setHttp3IdleTimeoutMs / getHttp3IdleTimeoutMs

```php
public HttpServerConfig::setHttp3IdleTimeoutMs(int $ms): static
public HttpServerConfig::getHttp3IdleTimeoutMs(): int
```

`max_idle_timeout` de QUIC (RFC 9000 §10.1). Default 30_000 (30 s). Rango 0..UINT32_MAX
(~49 días); `0` anuncia "no idle timeout". La env legada `PHP_HTTP3_IDLE_TIMEOUT_MS` sigue
funcionando como escape hatch para ops.

### setHttp3StreamWindowBytes / getHttp3StreamWindowBytes

```php
public HttpServerConfig::setHttp3StreamWindowBytes(int $bytes): static
public HttpServerConfig::getHttp3StreamWindowBytes(): int
```

Ventana de control de flujo QUIC por stream. Establece los tres valores:
`initial_max_stream_data_bidi_local`, `_bidi_remote`, `_uni` (estilo `http3-input-window-size` de
h2o). El `initial_max_data` a nivel de conexión se deriva como
`window × max_concurrent_streams` (patrón de nginx).

Default 262_144 (256 KiB). Rango 1_024..1_073_741_824 (1 GiB).

### setHttp3MaxConcurrentStreams / getHttp3MaxConcurrentStreams

```php
public HttpServerConfig::setHttp3MaxConcurrentStreams(int $n): static
public HttpServerConfig::getHttp3MaxConcurrentStreams(): int
```

`initial_max_streams_bidi` de QUIC. Equivalente al `http3_max_concurrent_streams` de nginx.
Default 100, rango 1..1_000_000.

### setHttp3PeerConnectionBudget / getHttp3PeerConnectionBudget

```php
public HttpServerConfig::setHttp3PeerConnectionBudget(int $n): static
public HttpServerConfig::getHttp3PeerConnectionBudget(): int
```

Tope por IP origen de conexiones QUIC concurrentes. Protección frente a slow-loris de handshake y
amplificación. Default 16, rango 1..4_096. La env legada `PHP_HTTP3_PEER_BUDGET` sigue
sobrescribiendo al spawn del listener.

### setHttp3AltSvcEnabled / isHttp3AltSvcEnabled

```php
public HttpServerConfig::setHttp3AltSvcEnabled(bool $enable): static
public HttpServerConfig::isHttp3AltSvcEnabled(): bool
```

`Alt-Svc: h3=":<port>"; ma=86400` del RFC 7838 en respuestas H1/H2 cuando hay un listener H3
levantado. Default `true`. Desactívalo en un rollout escalonado de H3. La env legada
`PHP_HTTP3_DISABLE_ALT_SVC` se respeta en `start()`.

## Compresión

### setCompressionEnabled / isCompressionEnabled

```php
public HttpServerConfig::setCompressionEnabled(bool $enable): static
public HttpServerConfig::isCompressionEnabled(): bool
```

Master switch. Default `true`. Si la extensión está compilada sin `--enable-http-compression`,
solo acepta `false`; `true` lanza.

### setCompressionLevel / getCompressionLevel

```php
public HttpServerConfig::setCompressionLevel(int $level): static
public HttpServerConfig::getCompressionLevel(): int
```

Nivel de gzip. Semántica de zlib: 1 más rápido/débil, 9 lento/fuerte. Default 6.

### setBrotliLevel / getBrotliLevel

```php
public HttpServerConfig::setBrotliLevel(int $level): static
public HttpServerConfig::getBrotliLevel(): int
```

Quality de Brotli. Rango 0..11. Default 4 (típico en producción; quality 11 ≈ 50× más lento que
4 con ganancia marginal en ratio).

Sin efecto si la extensión está compilada sin `--enable-brotli`: la pipeline de respuesta nunca
elegirá Brotli sin `HAVE_HTTP_BROTLI`, se pase lo que se pase aquí.

### setZstdLevel / getZstdLevel

```php
public HttpServerConfig::setZstdLevel(int $level): static
public HttpServerConfig::getZstdLevel(): int
```

Nivel de zstd. Rango 1..22. Default 3, default del propio equipo de zstd para producción (mejor
ratio que gzip-6 y mayor throughput).

### setCompressionMinSize / getCompressionMinSize

```php
public HttpServerConfig::setCompressionMinSize(int $bytes): static
public HttpServerConfig::getCompressionMinSize(): int
```

Umbral de tamaño del body: por debajo no se comprime. Default 1024 (1 KiB). Rango 0..16 MiB.

### setCompressionMimeTypes / getCompressionMimeTypes

```php
public HttpServerConfig::setCompressionMimeTypes(array $types): static
public HttpServerConfig::getCompressionMimeTypes(): array
```

Whitelist MIME para compresión. **Reemplaza por completo** el default (semántica `gzip_types` de
nginx). Las entradas se normalizan en el setter: se eliminan parámetros (`; charset=...`), se
hace trim de espacios y se pasa todo a minúsculas.

Default: `["application/javascript", "application/json", "application/xml", "image/svg+xml",
"text/css", "text/html", "text/javascript", "text/plain", "text/xml"]`.

### setRequestMaxDecompressedSize / getRequestMaxDecompressedSize

```php
public HttpServerConfig::setRequestMaxDecompressedSize(int $bytes): static
public HttpServerConfig::getRequestMaxDecompressedSize(): int
```

Tope anti zip-bomb para cuerpos descomprimidos (`Content-Encoding: gzip/br/zstd` entrantes). Si se
supera, 413. `0` desactiva el tope (de forma explícita; no hay "ilimitado implícito"). Default
10_485_760 (10 MiB).

### getSupportedEncodings (static)

```php
public static HttpServerConfig::getSupportedEncodings(): array
```

Lista de codecs incluidos en esta build, en el orden de preferencia del servidor. Siempre
contiene `"identity"`; `"gzip"` si `--enable-http-compression` funcionó; `"br"` / `"zstd"` si
estaba la biblioteca correspondiente en configure-time.

## Buffers

### setWriteBufferSize / getWriteBufferSize

```php
public HttpServerConfig::setWriteBufferSize(int $size): static
public HttpServerConfig::getWriteBufferSize(): int
```

Tamaño del write-buffer.

## Opciones de protocolo

| Método | Propósito |
|--------|-----------|
| `enableHttp2(bool)` / `isHttp2Enabled(): bool` | toggle HTTP/2 (TODO) |
| `enableWebSocket(bool)` / `isWebSocketEnabled(): bool` | toggle WS (TODO) |
| `enableProtocolDetection(bool)` / `isProtocolDetectionEnabled(): bool` | autodetección de protocolo en el listener |

> `enableWebSocket()` es un interruptor aparte, todavía no implementado. WebSocket en sí ya
> funciona por completo mediante
> [`addWebSocketHandler()`](/es/docs/reference/server/http-server.html#addwebsockethandler) y la
> configuración de la [sección WebSocket](#websocket) de arriba; los dos flags no están
> relacionados.

## TLS

| Método | Propósito |
|--------|-----------|
| `enableTls(bool)` / `isTlsEnabled(): bool` | toggle TLS sobre el listener por defecto |
| `setCertificate(string)` / `getCertificate(): ?string` | ruta al certificado PEM |
| `setPrivateKey(string)` / `getPrivateKey(): ?string` | ruta a la clave PEM |

## Manejo del body

### setAutoAwaitBody / isAutoAwaitBodyEnabled

```php
public HttpServerConfig::setAutoAwaitBody(bool $enable): static
public HttpServerConfig::isAutoAwaitBodyEnabled(): bool
```

Con `true`, las solicitudes no-multipart esperan al cuerpo completo antes de invocar al
manejador. Multipart siempre es stream. Default `true`.

### setBodyStreamingEnabled / isBodyStreamingEnabled

```php
public HttpServerConfig::setBodyStreamingEnabled(bool $enabled): static
public HttpServerConfig::isBodyStreamingEnabled(): bool
```

Streaming del cuerpo de la solicitud en una cola per-request (issue #26), en vez de acumular en
`req->body`. Los manejadores deben leer mediante
[`HttpRequest::readBody()`](/es/docs/reference/server/http-request.html#readbody);
`getBody()` lanza.

## JSON

### setJsonEncodeFlags / getJsonEncodeFlags

```php
public HttpServerConfig::setJsonEncodeFlags(int $flags): static
public HttpServerConfig::getJsonEncodeFlags(): int
```

Flags `JSON_*` por defecto para
[`HttpResponse::json()`](/es/docs/reference/server/http-response.html#json) cuando el `$flags`
por llamada es `0` (u omitido).

Default: `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`.

`JSON_THROW_ON_ERROR` se elimina silenciosamente: un error de encode produce un 500 JSON de error
y la excepción no se propaga.

## Logging / telemetría

### setLogSeverity / getLogSeverity

```php
public HttpServerConfig::setLogSeverity(\TrueAsync\LogSeverity $level): static
public HttpServerConfig::getLogSeverity(): \TrueAsync\LogSeverity
```

Severity del logger. Default `OFF`. La severity queda fijada al arrancar; no se admiten cambios
en runtime (modelo single-threaded lock-free). Véase
[`LogSeverity`](/es/docs/reference/server/log-severity.html).

### setLogStream / getLogStream

```php
public HttpServerConfig::setLogStream(mixed $stream): static
public HttpServerConfig::getLogStream(): mixed
```

Sink del logger. Cualquier `php_stream` (fichero, `php://stderr`, `php://memory`, wrapper de
usuario). El logger está desactivado hasta que se hayan fijado **ambas cosas**: severity distinta
de OFF Y stream.

### setTelemetryEnabled / isTelemetryEnabled

```php
public HttpServerConfig::setTelemetryEnabled(bool $enabled): static
public HttpServerConfig::isTelemetryEnabled(): bool
```

Parsing de W3C Trace Context: los `traceparent` / `tracestate` entrantes se enganchan a la
solicitud y están disponibles mediante
[`HttpRequest::getTraceParent/getTraceId/...`](/es/docs/reference/server/http-request.html).

## Estado

### isLocked

```php
public HttpServerConfig::isLocked(): bool
```

`true` tras pasar el config a `new HttpServer()`. Un config bloqueado rechaza todos los setters
con `HttpServerRuntimeException`.

## Véase también

- [Configuración](/es/docs/server/configuration.html), guía paso a paso
- [`TrueAsync\HttpServer`](/es/docs/reference/server/http-server.html)
- [`TrueAsync\WebSocket`](/es/docs/reference/server/websocket.html)
- [`TrueAsync\LogSeverity`](/es/docs/reference/server/log-severity.html)
