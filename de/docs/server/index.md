---
layout: docs
lang: de
path_key: "/docs/server/index.html"
nav_active: docs
permalink: /de/docs/server/index.html
page_title: "TrueAsync Server"
description: "TrueAsync Server — eine native PHP-Extension, die PHP in einen leistungsstarken HTTP/1.1/2/3-Server verwandelt. Multi-Protokoll, TLS 1.2/1.3, Komprimierung, Coroutinen — alles in einem Prozess."
---

# TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

**TrueAsync Server** ist eine native PHP-Extension, die einen leistungsstarken HTTP-Server
**direkt innerhalb des PHP-Prozesses** ausführt. Ohne separaten Daemon, ohne Reverse-Proxy, ohne FastCGI-Brücke.

Standardmäßig werden **HTTP/1.1 und HTTP/2 auf demselben TCP-Port** unterstützt. Die Protokollwahl
erfolgt über ALPN-Negotiation (bei TLS) oder HTTP Upgrade. HTTP/3 läuft über denselben UDP-Port
(QUIC) und wird Clients per `Alt-Svc`-Header angekündigt.

WebSocket und SSE sind bereits fertig und laufen auf demselben Single-Listener-Modell mit
Protokollerkennung. gRPC über HTTP/2 befindet sich noch in Arbeit (siehe [Roadmap](#funktionen)).

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

## Motivation

**Ziel des Servers ist es, das Potenzial konkurrenter PHP-Anwendungen voll auszuschöpfen.**

TrueAsync hat der Sprache echte Coroutinen, nicht-blockierendes I/O und Connection-Pools gegeben.
Damit dieses Potenzial unter Produktionslast wirksam wird, braucht es einen Server, der von Grund
auf für dieses Modell konzipiert ist: einen langlebigen Prozess mit Event-Loop, in dem jede Anfrage
ihre eigene Coroutine bekommt und der Scheduler bei jedem I/O-Wait zwischen ihnen wechselt.

TrueAsync Server ist genau dieser Server. Keine Zwischenschicht zwischen Coroutinen und Netzwerk:
Listener, Protokoll-Parser, Request-Dispatcher und Handler leben in einem Prozess und in einem
Event-Loop. Datenbankverbindungen werden über `Async\Pool` wiederverwendet, Opcache bleibt zwischen
Anfragen warm, der Cold-Start fällt einmal bei `start()` an.

## Funktionen

| Status | Funktion | Details |
|--------|----------|---------|
| ✅ | **HTTP/1.1** | Vollständige RFC-9112-Konformität, Keep-Alive, Pipelining (über [llhttp](https://github.com/nodejs/llhttp), derselbe Parser wie in Node.js) |
| ✅ | **HTTP/2** | Multiplexing, Server Push (libnghttp2 ≥ 1.57, Floor für CVE-2023-44487) |
| ✅ | **HTTP/3 / QUIC** | UDP-Transport über libngtcp2 + libnghttp3, OpenSSL 3.5 QUIC TLS API |
| ✅ | **TLS 1.2 / 1.3** | OpenSSL 3.x, ALPN-Negotiation, schwache Cipher deaktiviert |
| ✅ | **Komprimierung** | gzip (zlib-ng / zlib), Brotli, zstd: für Responses und Decoding eingehender Bodies in allen Protokollen |
| ✅ | **Multipart / File Uploads** | Streaming-Zero-Copy-Parser |
| ✅ | **Backpressure** | CoDel (RFC 8289), adaptive Accept-Pausierung unter Last |
| ✅ | **Streaming Request Body** | Optional über [`HttpRequest::readBody()`](/de/docs/reference/server/http-request.html); Uploads ohne Body im RAM zu halten |
| ✅ | **sendFile** | Effiziente Auslieferung von Dateien direkt aus dem Handler |
| ✅ | **Built-in Worker Pool** | `setWorkers(N)`: N Threads über `Async\ThreadPool` + `SO_REUSEPORT` |
| ✅ | **Per-Request Scope** | Jeder Handler in eigenem Scope; `Async\request_context()` liefert gemeinsamen Kontext für den gesamten Coroutine-Baum der Anfrage |
| ✅ | **Native Coroutinen** | Tiefe Integration mit TrueAsync: jedes blockierende I/O im Handler suspendiert die Coroutine, nicht den Thread |
| ✅ | **Zero-Copy** | Minimale Allokationen auf dem Hot Path |
| ✅ | **WebSocket** | RFC 6455, Upgrade von HTTP/1.1 und HTTP/2 (RFC 8441 Extended CONNECT), `wss://`, permessage-deflate (RFC 7692), Full-Duplex, Backpressure, alle 246 Autobahn|Testsuite-Tests |
| ✅ | **SSE** | `text/event-stream` über HTTP/1.1, HTTP/2 und HTTP/3, derselbe Handler unabhängig vom Protokoll |
| 📋 | **gRPC** | über HTTP/2, unary und streaming |

## Architektur: Single-Threaded Event Loop

Dasselbe Modell wie bei [NGINX](https://nginx.org), [Envoy](https://www.envoyproxy.io),
[Node.js](https://nodejs.org) und Rust [Tokio](https://tokio.rs)/[hyper](https://hyper.rs).

**Ein Thread besitzt sowohl die Verbindung als auch die Anfrage von accept bis send.**
Keine Übergabe zwischen Accept-Thread und Worker-Thread, keine Locks, keine Kontextwechsel zwischen ihnen.
Ein Event-Loop akzeptiert die Verbindung, liest Bytes aus dem Socket, parst HTTP, dispatcht die Anfrage
zum Handler und schreibt die Antwort, ohne den Thread zu verlassen.

```
       ┌─────────────────────────────────────────┐
       │              Event Loop Thread          │
       │                                         │
accept ─►  parse  ─►  dispatch  ─►  respond      │
       │     ▲                        │          │
       │     └──── coroutine yield ◄──┘          │
       └─────────────────────────────────────────┘
```

Nicht-blockierendes I/O übernimmt der **libuv-Reactor** (über TrueAsync). Wenn eine Coroutine auf
eine Datei, eine DB oder den nächsten WebSocket-Frame warten muss, übergibt sie die Kontrolle an
den Event-Loop, der sofort das nächste fertige Event aufnimmt. Der Thread bleibt nie in `read()`/`recv()` stehen.

Für Skalierung über CPU-Kerne hinweg wird **Multi-Worker** über
[`setWorkers(N)`](/de/docs/reference/server/http-server-config.html#setworkers) aktiviert:
Der integrierte `Async\ThreadPool` startet N OS-Threads, jeder mit eigenem unabhängigem Event-Loop,
und `SO_REUSEPORT` (Linux/BSD) sorgt dafür, dass der Kernel eingehende Verbindungen verteilt.
Kein Shared State, keine globalen Locks.

## Einstieg

- [Schnellstart](/de/docs/server/quickstart.html): Installation und Minimalbeispiel in 5 Minuten
- [Konfiguration](/de/docs/server/configuration.html): Listener, Workers, TLS, Timeouts, Body-Streaming, Bootloader
- [Komprimierung](/de/docs/server/compression.html): gzip / Brotli / zstd, Aushandlung, BREACH
- [Statische Dateien und sendFile](/de/docs/server/static-files.html): `StaticHandler`, precompressed Sidecars, Range
- [Streaming](/de/docs/server/streaming.html): Request-Body-Stream und Response-Stream
- [SSE](/de/docs/server/sse.html): Server-Sent Events, `sseEvent()`, Reconnection, Heartbeat
- [WebSocket](/de/docs/server/websocket.html): Full-Duplex-Verbindungen, Backpressure, Keepalive
- [Multi-Worker](/de/docs/server/workers.html): `setWorkers(N)`, Bootloader, Per-Request Scope
- [Beispiele](/de/docs/server/examples.html): JSON-API, Statik, Fan-Out, Multipart Upload
- [Architektur](/de/architecture/server.html): Interna

### API-Referenz

- [`TrueAsync\HttpServer`](/de/docs/reference/server/http-server.html)
- [`TrueAsync\HttpServerConfig`](/de/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/de/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/de/docs/reference/server/http-response.html)
- [`TrueAsync\WebSocket`](/de/docs/reference/server/websocket.html)
- [`TrueAsync\StaticHandler`](/de/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/de/docs/reference/server/send-file-options.html)
- [`TrueAsync\UploadedFile`](/de/docs/reference/server/uploaded-file.html)
- [`TrueAsync\LogSeverity`](/de/docs/reference/server/log-severity.html)
- [Ausnahmen](/de/docs/reference/server/exceptions.html)

## Alternativen

[FrankenPHP](/de/docs/frankenphp.html) ist ein eigenständiger einbettbarer Server auf Basis von
Caddy/Go, in dem PHP als Worker fungiert. Praktisch, wenn man Caddy-Features (automatisches
Let's Encrypt, Konfiguration über Caddyfile) oder die Integration in eine bestehende
Caddy-Infrastruktur benötigt. TrueAsync Server ist die native Alternative ohne Go-Runtime:
Der Server lebt direkt im PHP-Prozess.
