---
layout: docs
lang: es
path_key: "/docs/server/index.html"
nav_active: docs
permalink: /es/docs/server/index.html
page_title: "TrueAsync Server"
description: "TrueAsync Server: extensión PHP nativa que convierte PHP en un servidor HTTP/1.1/2/3 de alto rendimiento. Multi-protocolo, TLS 1.2/1.3, compresión, corrutinas, todo en un mismo proceso."
---

# TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

**TrueAsync Server** es una extensión PHP nativa que ejecuta un servidor HTTP de alto rendimiento
**directamente dentro del proceso PHP**. Sin daemon separado, sin proxy inverso, sin puente FastCGI.

De serie soporta **HTTP/1.1 y HTTP/2 en el mismo puerto TCP**. La elección del protocolo se realiza
mediante negociación ALPN (sobre TLS) o HTTP Upgrade. HTTP/3 funciona en el mismo puerto UDP (QUIC)
y se anuncia a los clientes mediante la cabecera `Alt-Svc`.

WebSocket y SSE ya están terminados y funcionan sobre el mismo modelo de un único listener con
detección de protocolo. gRPC sobre HTTP/2 sigue en desarrollo (véase [Roadmap](#capacidades)).

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

## Por qué

**El objetivo del servidor es desplegar todo el potencial de las aplicaciones concurrentes en PHP.**

TrueAsync dotó al lenguaje de auténticas corrutinas, E/S no bloqueante y pools de conexiones. Para
que ese potencial se traduzca en carga de producción hace falta un servidor diseñado desde el
principio para este modelo: un proceso de larga duración con event-loop, donde cada solicitud
recibe su propia corrutina y el planificador alterna entre ellas en cada espera de E/S.

TrueAsync Server es exactamente eso. Ninguna capa intermedia entre las corrutinas y la red: el
listener, el analizador de protocolo, el despachador de solicitudes y el manejador viven en el
mismo proceso y en el mismo event-loop. Las conexiones a la base de datos se reutilizan a través
de `Async\Pool`, opcache se mantiene caliente entre solicitudes, el cold-start se paga una sola
vez, en `start()`.

## Capacidades

| Estado | Característica | Detalles |
|--------|----------------|----------|
| ✅ | **HTTP/1.1** | Conformidad completa con RFC 9112, keep-alive, pipelining (mediante [llhttp](https://github.com/nodejs/llhttp), el mismo analizador que Node.js) |
| ✅ | **HTTP/2** | Multiplexación, server push (libnghttp2 ≥ 1.57, mínimo por CVE-2023-44487) |
| ✅ | **HTTP/3 / QUIC** | Transporte UDP sobre libngtcp2 + libnghttp3, API QUIC TLS de OpenSSL 3.5 |
| ✅ | **TLS 1.2 / 1.3** | OpenSSL 3.x, negociación ALPN, cifrados débiles desactivados |
| ✅ | **Compresión** | gzip (zlib-ng / zlib), Brotli, zstd: tanto en la respuesta como decodificación de cuerpos entrantes en todos los protocolos |
| ✅ | **Multipart / subidas de archivos** | Analizador zero-copy en streaming |
| ✅ | **Contrapresión** | CoDel (RFC 8289), pausa adaptativa del accept bajo carga |
| ✅ | **Cuerpo de solicitud en streaming** | Opcional mediante [`HttpRequest::readBody()`](/es/docs/reference/server/http-request.html); subidas sin retener el cuerpo en RAM |
| ✅ | **sendFile** | Entrega eficiente de archivos del disco directamente desde el manejador |
| ✅ | **Pool de workers integrado** | `setWorkers(N)`: N hilos vía `Async\ThreadPool` + `SO_REUSEPORT` |
| ✅ | **Scope por solicitud** | Cada manejador en su propio scope; `Async\request_context()` ofrece un contexto compartido en todo el árbol de corrutinas de la solicitud |
| ✅ | **Corrutinas nativas** | Integración profunda con TrueAsync: cualquier E/S bloqueante en el manejador suspende la corrutina, no el hilo |
| ✅ | **Zero-copy** | Mínimo de asignaciones en la ruta crítica |
| ✅ | **WebSocket** | RFC 6455, Upgrade desde HTTP/1.1 y HTTP/2 (RFC 8441 Extended CONNECT), `wss://`, permessage-deflate (RFC 7692), full-duplex, contrapresión, los 246 tests de Autobahn|Testsuite |
| ✅ | **SSE** | `text/event-stream` sobre HTTP/1.1, HTTP/2 y HTTP/3, el mismo manejador sin importar el protocolo |
| 📋 | **gRPC** | sobre HTTP/2, unario y streaming |

## Arquitectura: event loop de un solo hilo

El mismo modelo que [NGINX](https://nginx.org), [Envoy](https://www.envoyproxy.io),
[Node.js](https://nodejs.org) y [Tokio](https://tokio.rs)/[hyper](https://hyper.rs) en Rust.

**Un único hilo posee tanto la conexión como la solicitud, desde accept hasta send.**
No hay traspaso entre accept-thread y worker-thread, no hay bloqueos, no hay cambios de contexto
entre ellos. Un único event-loop acepta la conexión, lee bytes del socket, analiza HTTP, despacha
la solicitud al manejador y escribe la respuesta sin abandonar el hilo.

```
       ┌─────────────────────────────────────────┐
       │              Event Loop Thread          │
       │                                         │
accept ─►  parse  ─►  dispatch  ─►  respond      │
       │     ▲                        │          │
       │     └──── coroutine yield ◄──┘          │
       └─────────────────────────────────────────┘
```

La E/S no bloqueante la proporciona el **reactor libuv** (a través de TrueAsync). Cuando una
corrutina necesita esperar un archivo, una base de datos o el siguiente frame de WebSocket, cede
el control al event-loop, que enseguida elige el siguiente evento listo. El hilo nunca queda
inactivo en `read()`/`recv()`.

Para escalar por núcleos se activa el modo **multi-worker** mediante
[`setWorkers(N)`](/es/docs/reference/server/http-server-config.html#setworkers):
el `Async\ThreadPool` integrado lanza N hilos del sistema operativo, cada uno con su propio
event-loop independiente, y `SO_REUSEPORT` (Linux/BSD) deja que el kernel distribuya las conexiones
entrantes entre ellos. Sin estado compartido, sin bloqueos globales.

## Por dónde empezar

- [Inicio rápido](/es/docs/server/quickstart.html): instalación y ejemplo mínimo en 5 minutos
- [Configuración](/es/docs/server/configuration.html): listeners, workers, TLS, timeouts, body streaming, bootloader
- [Compresión](/es/docs/server/compression.html): gzip / brotli / zstd, negociación, BREACH
- [Archivos estáticos y sendFile](/es/docs/server/static-files.html): `StaticHandler`, sidecars precomprimidos, Range
- [Streaming](/es/docs/server/streaming.html): streaming del cuerpo de la solicitud y de la respuesta
- [SSE](/es/docs/server/sse.html): Server-Sent Events, `sseEvent()`, reconexión, heartbeat
- [WebSocket](/es/docs/server/websocket.html): conexiones full-duplex, contrapresión, keepalive
- [Multi-worker](/es/docs/server/workers.html): `setWorkers(N)`, bootloader, scope por solicitud
- [Ejemplos](/es/docs/server/examples.html): JSON-API, estáticos, fan-out, subida multipart
- [Arquitectura](/es/architecture/server.html): por dentro

### Referencia de API

- [`TrueAsync\HttpServer`](/es/docs/reference/server/http-server.html)
- [`TrueAsync\HttpServerConfig`](/es/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/es/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/es/docs/reference/server/http-response.html)
- [`TrueAsync\WebSocket`](/es/docs/reference/server/websocket.html)
- [`TrueAsync\StaticHandler`](/es/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/es/docs/reference/server/send-file-options.html)
- [`TrueAsync\UploadedFile`](/es/docs/reference/server/uploaded-file.html)
- [`TrueAsync\LogSeverity`](/es/docs/reference/server/log-severity.html)
- [Excepciones](/es/docs/reference/server/exceptions.html)

## Alternativas

[FrankenPHP](/es/docs/frankenphp.html) es un servidor embebible aparte basado en Caddy/Go, en el
que PHP actúa como worker. Resulta práctico cuando se necesitan las funcionalidades de Caddy
(Let's Encrypt automático, configuración mediante Caddyfile) o integración en una infraestructura
Caddy ya existente. TrueAsync Server es la alternativa nativa sin runtime de Go: el servidor vive
directamente en el proceso PHP.
