---
layout: architecture
lang: de
path_key: "/architecture/server.html"
nav_active: architecture
permalink: /de/architecture/server.html
page_title: "Architektur TrueAsync Server"
description: "Interna des TrueAsync Server: Single-Threaded Event Loop, Zero-Copy, CoDel, Bailout Firewall, Multi-Worker über SO_REUSEPORT."
---

# Architektur TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server ist eine native PHP-Extension (C), die einen HTTP-Server direkt im Adressraum des
PHP-Prozesses betreibt. Architektonisch ist es ein **Single-Threaded Event Loop** mit optionalem
**replicated Worker Pool** für horizontale Skalierung innerhalb eines Prozesses.

## Big Picture

```
            ┌────────────────────────────────────────────────────────────┐
            │                       PHP-Prozess                          │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-Loop-Thread #0                  │ │
            │   │                                                      │ │
            │   │   libuv ──► accept ──► parse ──► dispatch ──► send   │ │
            │   │     ▲                                ▼                │ │
            │   │     │     ┌──── PHP-Handler (Coroutine) ────┐         │ │
            │   │     │     │  User-Code, DB, HTTP-Client, …  │         │ │
            │   │     │     └─────────────┬──────────────────┘          │ │
            │   │     └──────── yield ────┘                             │ │
            │   └──────────────────────────────────────────────────────┘ │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-Loop-Thread #1 …N-1             │ │
            │   │   (bei setWorkers(N>1), SO_REUSEPORT)                │ │
            │   └──────────────────────────────────────────────────────┘ │
            └────────────────────────────────────────────────────────────┘
```

Ein Thread hält Verbindung und Anfrage von Accept bis zum finalen Send. Kein Accept→Worker-Handoff,
kein Per-Request-Fork/Cleanup, keine globalen Locks. Muss der Handler auf I/O warten (DB, HTTP, Datei),
gibt die Coroutine die Kontrolle an den Event-Loop ab, der sofort das nächste fertige Event aufnimmt.

## Layers

### 1. Reactor: libuv

Basis-I/O-Layer: libuv über [TrueAsync ABI](/de/architecture/zend-async-api.html).
TCP-Accepts, UDP-recvmmsg, Filesystem-Operationen, Timer, sigwait — alles über dieselbe Schnittstelle
`zend_async_event_t`. Der Reactor kennt epoll/kqueue/IOCP, der Server nicht.

Critical Extension API:

- `zend_async_io_*` — non-blocking Read/Write von Sockets und Files.
- `zend_async_io_sendfile_t` — `uv_fs_sendfile` (Linux/BSD `sendfile`, Windows `TransmitFile`).
- `zend_async_fs_open_t` — async `open(2)` über den libuv-Threadpool.
- `udp_bind` für HTTP/3 / QUIC.

### 2. Protocol Parsers

- **HTTP/1.1**: vendored [`llhttp`](https://github.com/nodejs/llhttp) 9.3.0 (derselbe Parser wie in Node.js).
- **HTTP/2**: `libnghttp2` ≥ 1.57 (Floor für CVE-2023-44487 Rapid Reset).
- **HTTP/3 / QUIC**: `libngtcp2` + `libnghttp3`, OpenSSL 3.5 QUIC TLS API (Backend
  `libngtcp2_crypto_ossl`).

Protokoll-Detection über einem TCP-Socket:

- Plaintext: Preface `PRI * HTTP/2.0\r\n...\r\n` → HTTP/2 (h2c), sonst → llhttp.
- TLS: ALPN-Negotiation beim Handshake.

`HttpServer::addListener()` startet einen Multi-Protocol-Listener. Für protokoll-restriktierte Ports
nutzen Sie `addHttp1Listener` / `addHttp2Listener` / `addHttp3Listener`.

### 3. Connection Arena

`http_connection_t` — Per-Connection-State (768 B). Wird in einem Slab-Pool gehalten: Chunks à
`CONN_ARENA_CHUNK_SLOTS` (256) Stück. Live/Free wird über eine Bitmap verfolgt; Chunks shrinken nie,
was heißen Arena-Hits ohne Allokationen erlaubt.

Sichtbar über [`HttpServer::getRuntimeStats()`](/de/docs/reference/server/http-server.html#getruntimestats):
`conn_arena_live`, `conn_arena_slots`, `conn_arena_chunks`, `conn_arena_bytes`.

### 4. Body Pool

Per-Thread LIFO für große Request-Body-Buffer (≥ 1 MB). Bodies dieser Klasse werden über `zend_mm`
allokiert, aber **zurückgegeben** werden sie nicht an den Allokator, sondern an die Per-Size-Class-LIFO.
Die nächste Anfrage derselben Size-Class verwendet den Slot wieder — ohne `mmap`/`munmap`-Traffic und
ohne `mmap_lock`-Contention, die Multi-Worker-Scaling auf upload-heavy Workloads bremste.

Bench (W=8, c=128, 2 MiB POST Body): 1500 RPS / 370 % CPU → **3300 RPS / 720 % CPU** (×2.2 Durchsatz;
CPU skaliert nun tatsächlich mit den Workern).

Wird bei `HttpServer::stop()` und RSHUTDOWN drainiert. Im Debug-Build sieht der zend_mm Leak Detector
beim Module-Unload einen Clean Slate.

### 5. Coroutine Integration

Jede akzeptierte Anfrage spawnt eine neue Coroutine über `ZEND_ASYNC_NEW_COROUTINE`.
Die Coroutine läuft in einem **Per-Request-Scope**, der ein Child des Server-Scope ist. Das hat zwei
Effekte:

- `Async\request_context()` löst sich auf einen gemeinsamen Kontext des Coroutine-Subtrees der Anfrage auf.
- `Async\current_context()` bleibt per-Coroutine.

Ein Request-Cancel (Handler-Coroutine cancelled → 4xx Parser-Limit, Peer-Reset auf dem Stream,
Drain-Timeout) wird über die normale `AsyncCancellation`-Kette weitergereicht.
`TrueAsync\HttpException extends AsyncCancellation` trägt den HTTP-Status, damit der Dispatcher weiß,
was er dem Client antworten soll.

### 6. Multi-Worker (optional)

`HttpServerConfig::setWorkers(N > 1)`:

1. Der Parent spawnt einen `Async\ThreadPool` der Größe N.
2. Config + Handler-Set werden in jeden Worker über `transfer_obj` kopiert (Deep Copy des gesamten
   Graphs, inklusive op_array der Closures; siehe [Thread Snapshot](/de/architecture/zend-async-api.html)).
3. Der Worker re-bindet dieselben Listener mit `SO_REUSEPORT`.
4. Der Kernel (Linux/BSD) verteilt Accepts gleichmäßig auf die Sockets derselben Reuse-Port-Gruppe.
5. Das übergeordnete `start()` wartet auf das Ende aller Worker.

Jeder Worker hat einen unabhängigen Event-Loop, Opcache und Allokator. Kein Shared State, keine Locks.
Der Bootloader (falls gesetzt) läuft in jedem Worker einmal vor dem Task-Loop.

## CoDel Backpressure

Der Server implementiert [CoDel](https://datatracker.ietf.org/doc/html/rfc8289), adaptive Backpressure
nach Sojourn-Zeit:

- Jede Anfrage erhält einen Enqueue→Dequeue-Timestamp.
- Bleibt Sojourn (Queue-Wait) über `setBackpressureTargetMs()` (Default 5 ms) **100 ms am Stück**,
  wird der Listen-Socket pausiert.
- Sobald Sojourn wieder fällt, wird Listen fortgesetzt.

Anders als ein hartes `max_connections` **misst CoDel die tatsächliche Pipeline-Last**, nicht nur die
Zahl konkurrenter Connections. Das ist besonders auf HTTP/2 wichtig, wo eine Connection beliebig viele
Streams führt.

CoDel ist per Default deaktiviert für Opt-in-Workloads: nach 0.3.0 führten Situationen, in denen CoDel
auf muxed-h2 fälschlich ansprach (kurze schnelle Streams schoben die Connection in "overloaded" und
parkten unrelated long-lived Streams), zum konservativen Default.

## Bailout Firewall

PHP-Fatal-Errors aus dem User-Handler (E_ERROR, OOM, Uncaught beim Shutdown) **kippen den Server nicht**.
Jeder Protocol-Entry-Point (H1, H2, H3) umschließt den Handler-Aufruf mit einem Bailout-Fence, der:

1. Die fehlerhafte Coroutine drainiert.
2. 500 an den Client emittiert (sofern Header noch nicht auf dem Draht sind).
3. Die Kontrolle an den Listener zurückgibt, der weiter Accepts entgegennimmt.

Diagnostics: auf dem Failure-Pfad loggt der Server den C-Stack (sofern `<execinfo.h>` verfügbar;
gegated über `HAVE_EXECINFO_H`) und den PHP-`zend_error`. Auf musl / Windows wird der C-Frame-Dump
stillschweigend übersprungen.

Siehe [`docs/118-tracing-jit-stale-fp-spill.md`](https://github.com/true-async/server/tree/main/docs)
im Repository für einen der frühen Bailout-Bugs unter Tracing-JIT.

## Connection Draining (Step 8)

Der Server implementiert zwei Drain-Modelle:

### Proactive: `setMaxConnectionAgeMs()`

Nach `(age ± 10 % Jitter)` Lifetime erhält die Connection ein Signal:

- H1: nächste Antwort trägt `Connection: close`.
- H2: emittiert `GOAWAY`.

Pendant zu gRPC `MAX_CONNECTION_AGE`. Schützt vor langlebigen Connections, die sich hinter einem
L4-LB an einem Worker "festkleben".

### Reactive: CoDel-Trip / Hard-Cap-Transition

Wenn der Server in Overload geht (CoDel pausiert oder `max_connections` erreicht), wird der
Per-Connection-Drain-Effekt über das Fenster `setDrainSpreadMs()` verteilt (Pendant zu HAProxy
`close-spread-time`), damit Clients nicht in einem Thundering Herd reconnecten.

Den minimalen Abstand zwischen Triggern definiert `setDrainCooldownMs()` (Default 10 s).

## Zero-Copy Hot Paths

- **H2 over TLS Hybrid Emit** (0.6.2): kleine Antworten gehen über den DRAIN-Pfad (mem_send +
  `BIO_write`, ohne Gather-Allokation); Bodies > 2 KiB oder Streaming gehen über GATHER (NO_COPY-Refs
  + einmaliger `SSL_write_ex`). Bench: best-of-three auf der h2load-Matrix.
- **Static Small-File Fast Path** (≤ 64 KiB): Datei wird in `zend_string` geslurpt und mit einem
  `writev(headers + body)` ausgeliefert. Dateien > 64 KiB laufen über sendfile.
- **Inline `open`/`fstat`** für Statik: kein Futex-Round-Trip über den libuv-Threadpool bei warmem
  Dentry-Cache.

## Memory-Modell

Der Server minimiert gezielt den RAM-Footprint:

- **Asymmetric TLS BIO Ring Sizes** (0.6.0): CT-in 17 KiB, PT-app Back-Channel 17 KiB, die übrigen
  unverändert; Ersparnis ~62 KiB pro TLS-Connection.
- **Body Pool** (siehe oben): Wiederverwendung großer Bodies.
- **Streaming Request Body**: Peak-RSS bei 50 parallelen 20-MiB-POSTs fällt von 1170 MiB auf **197 MiB**.
- **Static TSRMLS Cache** (ext/async 0.7.0): `-DZEND_ENABLE_STATIC_TSRMLS_CACHE=1` verwandelt
  `EG()` / `ASYNC_G()` in einen einzigen `__thread`-Load statt `pthread_getspecific`. +32 % RPS auf
  einem minimalen HTTP-Handler.

## RFC-Konformität

- HTTP/1.1: volle RFC 9112 (`Connection: close` → Reply-Mirror gemäß §9.6 seit 0.6.3).
- HTTP/2: RFC 9113, Rapid-Reset-Mitigation für CVE-2023-44487.
- HTTP/3: RFC 9114, QUIC RFC 9000 inklusive Connection-ID-Rotation und Amplification-Limits.
- TLS: TLS 1.2/1.3 only, OpenSSL 3.x; HTTP/3 benötigt OpenSSL 3.5+.
- WebSocket / SSE / gRPC: geplant.

## Siehe auch

- [TrueAsync ABI](/de/architecture/zend-async-api.html)
- [Scheduler und Reactor](/de/architecture/scheduler-reactor.html)
- [Server-Konfiguration](/de/docs/server/configuration.html)
- [Multi-Worker](/de/docs/server/workers.html)
