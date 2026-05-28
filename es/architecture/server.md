---
layout: architecture
lang: es
path_key: "/architecture/server.html"
nav_active: architecture
permalink: /es/architecture/server.html
page_title: "Arquitectura de TrueAsync Server"
description: "Por dentro de TrueAsync Server: event loop single-threaded, zero-copy, CoDel, bailout firewall, multi-worker mediante SO_REUSEPORT."
---

# Arquitectura de TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server es una extensión PHP nativa (en C) que ejecuta un servidor HTTP directamente en
el espacio de direcciones del proceso PHP. Arquitectónicamente es un **event loop single-threaded**
con un **worker pool replicado** opcional para escalado horizontal dentro de un mismo proceso.

## Visión de conjunto

```
            ┌────────────────────────────────────────────────────────────┐
            │                       Proceso PHP                          │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │              Hilo event-loop #0                      │ │
            │   │                                                      │ │
            │   │   libuv ──► accept ──► parse ──► dispatch ──► send   │ │
            │   │     ▲                                ▼                │ │
            │   │     │     ┌──── Manejador PHP (corrutina) ──┐         │ │
            │   │     │     │ código de usuario, BD, HTTP, … │         │ │
            │   │     │     └─────────────┬───────────────────┘         │ │
            │   │     └──────── yield ────┘                            │ │
            │   └──────────────────────────────────────────────────────┘ │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │            Hilo event-loop #1 … N-1                  │ │
            │   │   (con setWorkers(N>1), SO_REUSEPORT)                │ │
            │   └──────────────────────────────────────────────────────┘ │
            └────────────────────────────────────────────────────────────┘
```

Un único hilo posee la conexión y la solicitud desde accept hasta el send final. No hay
accept→worker handoff, no hay fork/cleanup por solicitud, no hay bloqueos globales. Cuando el
manejador necesita esperar E/S (BD, HTTP, archivo), la corrutina cede el control al event-loop,
que toma de inmediato el siguiente evento listo.

## Capas

### 1. Reactor: libuv

Capa base de E/S: libuv a través del [TrueAsync ABI](/es/architecture/zend-async-api.html).
Los accepts TCP, recvmmsg UDP, operaciones de filesystem, timers, sigwait, todo va por la misma
interfaz `zend_async_event_t`. El reactor sabe de epoll/kqueue/IOCP; el servidor no.

API crítica de la extensión:

- `zend_async_io_*`: lectura/escritura no bloqueante de sockets y archivos.
- `zend_async_io_sendfile_t`: `uv_fs_sendfile` (`sendfile` en Linux/BSD, `TransmitFile` en
  Windows).
- `zend_async_fs_open_t`: `open(2)` async mediante el thread-pool de libuv.
- `udp_bind` para HTTP/3 / QUIC.

### 2. Analizadores de protocolo

- **HTTP/1.1**: [`llhttp`](https://github.com/nodejs/llhttp) 9.3.0 vendored (el mismo parser que
  Node.js).
- **HTTP/2**: `libnghttp2` ≥ 1.57 (mínimo por CVE-2023-44487 rapid-reset).
- **HTTP/3 / QUIC**: `libngtcp2` + `libnghttp3`, API QUIC TLS de OpenSSL 3.5 (backend
  `libngtcp2_crypto_ossl`).

Detección de protocolo sobre un mismo socket TCP:

- texto claro: preface `PRI * HTTP/2.0\r\n...\r\n` → HTTP/2 (h2c), si no → llhttp.
- TLS: negociación ALPN en el handshake.

`HttpServer::addListener()` levanta un listener multi-protocolo. Para puertos restringidos por
protocolo usa `addHttp1Listener` / `addHttp2Listener` / `addHttp3Listener`.

### 3. Connection arena

`http_connection_t`: estado por conexión (768 B). Se guarda en un slab-pool: chunks de
`CONN_ARENA_CHUNK_SLOTS` (256) unidades. Live/free se rastrea mediante bitmap; los chunks nunca
se reducen, lo que garantiza arena-hit caliente sin asignaciones.

Se ve mediante
[`HttpServer::getRuntimeStats()`](/es/docs/reference/server/http-server.html#getruntimestats):
`conn_arena_live`, `conn_arena_slots`, `conn_arena_chunks`, `conn_arena_bytes`.

### 4. Body pool

LIFO por hilo para buffers grandes de cuerpo de solicitud (≥ 1 MB). Los bodies de esa clase se
asignan mediante `zend_mm`, pero al **devolver** no van al allocator sino a un LIFO por clase de
tamaño. La siguiente solicitud de la misma clase reutiliza el slot, sin tráfico de
`mmap`/`munmap` ni contención de `mmap_lock`, que limaba el escalado multi-worker en cargas
intensivas de upload.

Bench (W=8, c=128, 2 MiB POST body): 1500 RPS / 370% CPU → **3300 RPS / 720% CPU** (×2.2 de
throughput; la CPU ya escala de verdad con los workers).

Se drena en `HttpServer::stop()` y en RSHUTDOWN. En build debug, el detector de leaks de zend_mm
ve clean slate al descargar el módulo.

### 5. Integración con corrutinas

Cada solicitud aceptada origina una nueva corrutina mediante `ZEND_ASYNC_NEW_COROUTINE`. La
corrutina se ejecuta en un **scope por solicitud**, hijo del scope del servidor. Esto da dos
efectos:

- `Async\request_context()` resuelve a un contexto común para todo el sub-árbol de corrutinas de
  la solicitud.
- `Async\current_context()` sigue siendo per-coroutine.

Una cancelación de la solicitud (handler-coroutine cancelado → 4xx por límite del parser, peer
reset en el stream, timeout de drain) se propaga por la cadena `AsyncCancellation` normal.
`TrueAsync\HttpException extends AsyncCancellation` lleva el status HTTP para que el dispatcher
sepa qué responder al cliente.

### 6. Multi-worker (opcional)

`HttpServerConfig::setWorkers(N > 1)`:

1. El padre spawnea un `Async\ThreadPool` de tamaño N.
2. El config + el handler set se copian a cada worker mediante `transfer_obj` (deep copy de todo
   el grafo, incluido el op_array de las closures; véase
   [Thread snapshot](/es/architecture/zend-async-api.html)).
3. El worker hace re-bind sobre los mismos listeners con `SO_REUSEPORT`.
4. El kernel (Linux/BSD) reparte de forma uniforme el accept entre los sockets de un mismo
   reuse-port-group.
5. El `start()` del padre espera a que terminen todos los workers.

Cada worker tiene event-loop, opcache y allocator independientes. Sin estado compartido, sin
bloqueos. El bootloader (si está definido) se ejecuta en cada worker una sola vez antes del
task-loop.

## Contrapresión CoDel

El servidor implementa [CoDel](https://datatracker.ietf.org/doc/html/rfc8289), contrapresión
adaptativa según el sojourn time:

- Cada solicitud se marca con timestamp de enqueue → dequeue.
- Si el sojourn (queue-wait) se mantiene por encima de `setBackpressureTargetMs()` (default 5 ms)
  durante **100 ms consecutivos**, el listen-socket se pausa.
- En cuanto el sojourn baja, el listen se reanuda.

A diferencia de un `max_connections` estricto, CoDel **rastrea la carga real** del pipeline y no
solo el número de conexiones concurrentes. Esto es especialmente importante en HTTP/2, donde una
conexión genera un número arbitrario de streams.

CoDel está desactivado por defecto para cargas opt-in: desde 0.3.0, situaciones en las que CoDel
disparaba por error en muxed-h2 (streams cortos y rápidos empujaban la conexión a "overloaded" y
aparcaban streams long-lived no relacionados) llevaron a un default conservador.

## Bailout firewall

Los fatals de PHP desde el handler de usuario (E_ERROR, OOM, no capturados en shutdown) **no
tiran el servidor**. Cada entry-point de protocolo (H1, H2, H3) envuelve la invocación del
handler en una bailout-fence que:

1. Drena la corrutina fallida.
2. Emite 500 al cliente (si las cabeceras aún no están en el cable).
3. Devuelve el control al listener, que sigue aceptando.

Diagnóstico: en la failure-path el servidor loguea el C-stack (si `<execinfo.h>` está disponible;
gated mediante `HAVE_EXECINFO_H`) y un `zend_error` a nivel PHP. En musl / Windows el dump de
frames de C se omite silenciosamente.

Véase [`docs/118-tracing-jit-stale-fp-spill.md`](https://github.com/true-async/server/tree/main/docs)
en el repositorio para uno de los primeros bugs de bailout bajo Tracing-JIT.

## Connection draining (Step 8)

El servidor implementa dos modelos de drain:

### Proactivo: `setMaxConnectionAgeMs()`

Tras `(age ± 10% de jitter)` de vida, la conexión recibe una señal:

- H1: la siguiente respuesta lleva `Connection: close`.
- H2: se emite `GOAWAY`.

Equivalente a `MAX_CONNECTION_AGE` de gRPC. Protege frente a conexiones long-lived "pegadas" a un
único worker detrás de un LB L4.

### Reactivo: trip de CoDel / transición a hard-cap

Cuando el servidor entra en overload (CoDel pausado o ha alcanzado `max_connections`), el efecto
drain por conexión se reparte por la ventana de `setDrainSpreadMs()` (equivalente a
`close-spread-time` de HAProxy) para que los clientes no reconecten en thundering herd.

El gap mínimo entre disparos lo define `setDrainCooldownMs()` (default 10 s).

## Rutas críticas zero-copy

- **Emit híbrido H2 sobre TLS** (0.6.2): respuestas pequeñas van por la ruta DRAIN (mem_send +
  `BIO_write`, sin asignación de gather); bodies > 2 KiB o streaming van por GATHER (NO_COPY refs
  + un único `SSL_write_ex`). Bench: best-of-three en matrices h2load.
- **Fast path para archivos estáticos pequeños** (≤ 64 KiB): el archivo se vuelca a un
  `zend_string` y se entrega en un único `writev(headers + body)`. Los archivos > 64 KiB van por
  sendfile.
- **`open`/`fstat` inline** para estáticos: sin futex-round-trip al thread-pool de libuv cuando
  el dentry cache está caliente.

## Modelo de memoria

El servidor minimiza intencionadamente el footprint en RAM:

- **Tamaños asimétricos del ring BIO TLS** (0.6.0): CT-in 17 KiB, PT-app back-channel 17 KiB,
  el resto sin cambios; ahorro de ~62 KiB por conexión TLS.
- **Body pool** (véase más arriba): reutilización de bodies grandes.
- **Streaming del cuerpo de la solicitud**: el RSS pico con 50 POSTs paralelos de 20 MiB cae de
  1170 MiB a **197 MiB**.
- **TSRMLS cache estática** (ext/async 0.7.0): `-DZEND_ENABLE_STATIC_TSRMLS_CACHE=1` convierte
  `EG()` / `ASYNC_G()` en un único load `__thread` en vez de `pthread_getspecific`. +32% RPS en
  un handler HTTP mínimo.

## Conformidad con los RFC

- HTTP/1.1: RFC 9112 completo (`Connection: close` → reply mirror según §9.6 desde 0.6.3).
- HTTP/2: RFC 9113, mitigación de rapid-reset para CVE-2023-44487.
- HTTP/3: RFC 9114, QUIC RFC 9000 incluyendo rotación de connection ID y límites de
  amplificación.
- TLS: solo TLS 1.2/1.3, OpenSSL 3.x; HTTP/3 requiere OpenSSL 3.5+.
- WebSocket / SSE / gRPC: en planes.

## Véase también

- [TrueAsync ABI](/es/architecture/zend-async-api.html)
- [Planificador y Reactor](/es/architecture/scheduler-reactor.html)
- [Configuración del servidor](/es/docs/server/configuration.html)
- [Multi-worker](/es/docs/server/workers.html)
