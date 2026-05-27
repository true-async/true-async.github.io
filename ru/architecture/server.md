---
layout: architecture
lang: ru
path_key: "/architecture/server.html"
nav_active: architecture
permalink: /ru/architecture/server.html
page_title: "Архитектура TrueAsync Server"
description: "Внутренности TrueAsync Server: single-threaded event loop, zero-copy, CoDel, bailout firewall, multi-worker через SO_REUSEPORT."
---

# Архитектура TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server — нативное PHP-расширение (C), которое крутит HTTP-сервер прямо в адресном
пространстве PHP-процесса. Архитектурно это **single-threaded event loop** с опциональной
**replicated worker pool** для горизонтального масштабирования внутри одного процесса.

## Big picture

```
            ┌────────────────────────────────────────────────────────────┐
            │                       PHP-процесс                          │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop поток #0                   │ │
            │   │                                                      │ │
            │   │   libuv ──► accept ──► parse ──► dispatch ──► send   │ │
            │   │     ▲                                ▼                │ │
            │   │     │     ┌──── PHP-обработчик (корутина) ───┐        │ │
            │   │     │     │  user code, DB, HTTP-клиент, …  │        │ │
            │   │     │     └─────────────┬───────────────────┘        │ │
            │   │     └──────── yield ────┘                            │ │
            │   └──────────────────────────────────────────────────────┘ │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop поток #1 …N-1              │ │
            │   │   (при setWorkers(N>1), SO_REUSEPORT)                │ │
            │   └──────────────────────────────────────────────────────┘ │
            └────────────────────────────────────────────────────────────┘
```

Один поток держит соединение и запрос от accept до final send. Нет accept→worker handoff,
нет per-request fork/cleanup, нет глобальных блокировок. Когда обработчику нужно подождать I/O
(БД, HTTP, файл), корутина уступает event-loop'у, тот тут же подбирает следующее готовое событие.

## Layers

### 1. Reactor: libuv

Базовый I/O-слой: libuv через [TrueAsync ABI](/ru/architecture/zend-async-api.html).
TCP accept'ы, UDP recvmmsg, файловые операции, таймеры, sigwait — всё через одинаковый интерфейс
`zend_async_event_t`. Реактор знает про epoll/kqueue/IOCP, сервер не знает.

Critical extension API:

- `zend_async_io_*` — non-blocking чтение/запись сокетов и файлов.
- `zend_async_io_sendfile_t` — `uv_fs_sendfile` (Linux/BSD `sendfile`, Windows `TransmitFile`).
- `zend_async_fs_open_t` — async `open(2)` через libuv thread-pool.
- `udp_bind` для HTTP/3 / QUIC.

### 2. Protocol parsers

- **HTTP/1.1**: vendored [`llhttp`](https://github.com/nodejs/llhttp) 9.3.0 (тот же парсер, что у Node.js).
- **HTTP/2**: `libnghttp2` ≥ 1.57 (floor для CVE-2023-44487 rapid-reset).
- **HTTP/3 / QUIC**: `libngtcp2` + `libnghttp3`, OpenSSL 3.5 QUIC TLS API (бэкенд `libngtcp2_crypto_ossl`).

Protocol-detection поверх одного TCP-сокета:

- plaintext: preface `PRI * HTTP/2.0\r\n...\r\n` → HTTP/2 (h2c), иначе → llhttp.
- TLS: ALPN-negotiation на handshake.

`HttpServer::addListener()` поднимает multi-protocol listener. Для протокол-restricted портов
используйте `addHttp1Listener` / `addHttp2Listener` / `addHttp3Listener`.

### 3. Connection arena

`http_connection_t` — per-connection state (768 B). Хранится в slab-pool: чанки по
`CONN_ARENA_CHUNK_SLOTS` (256) штук. Live/free отслеживается через bitmap; chunks никогда не
shrink'аются, что даёт горячий arena hit без аллокаций.

Видно через [`HttpServer::getRuntimeStats()`](/ru/docs/reference/server/http-server.html#getruntimestats):
`conn_arena_live`, `conn_arena_slots`, `conn_arena_chunks`, `conn_arena_bytes`.

### 4. Body pool

Per-thread LIFO для крупных request-body буферов (≥ 1 MB). Тела этого класса аллоцируются через
`zend_mm`, но **возвращаются** не в аллокатор, а в per-size-class LIFO. Следующий запрос того же
size-class переиспользует слот, без `mmap`/`munmap` traffic и без `mmap_lock` contention, которая
капала multi-worker scaling на upload-heavy нагрузках.

Бенч (W=8, c=128, 2 MiB POST body): 1500 RPS / 370% CPU → **3300 RPS / 720% CPU** (×2.2 throughput;
CPU теперь реально масштабируется с воркерами).

Drain'ится на `HttpServer::stop()` и RSHUTDOWN. В debug-сборке zend_mm leak detector видит clean
slate на module unload.

### 5. Coroutine integration

Каждый принятый запрос порождает новую корутину через `ZEND_ASYNC_NEW_COROUTINE`.
Корутина выполняется в **per-request scope**, дочернем для серверного scope. Это даёт два эффекта:

- `Async\request_context()` резолвится в общий для всей корутины-под-дерева запроса контекст.
- `Async\current_context()` остаётся per-coroutine.

Cancel request'а (handler-coroutine cancelled → 4xx parser limit, peer reset на стриме, drain timeout)
прокидывается через нормальную `AsyncCancellation`-цепочку. `TrueAsync\HttpException extends AsyncCancellation`
несёт HTTP-status, чтобы dispatcher знал, что ответить клиенту.

### 6. Multi-worker (опционально)

`HttpServerConfig::setWorkers(N > 1)`:

1. Родитель спавнит `Async\ThreadPool` размера N.
2. Конфиг + handler set копируются в каждый воркер через `transfer_obj` (deep copy всего графа,
   включая op_array замыканий; см. [Thread snapshot](/ru/architecture/zend-async-api.html)).
3. Воркер re-bind'ит те же listeners с `SO_REUSEPORT`.
4. Ядро (Linux/BSD) равномерно распределяет accept по сокетам в одной reuse-port-группе.
5. Родительский `start()` ждёт завершения всех воркеров.

Каждый воркер имеет независимый event-loop, opcache и allocator. Никакого shared state, никаких
блокировок. Bootloader (если задан) выполняется в каждом воркере один раз перед task-loop'ом.

## CoDel backpressure

Сервер реализует [CoDel](https://datatracker.ietf.org/doc/html/rfc8289), adaptive backpressure
по sojourn-времени:

- Каждый запрос помечается timestamp'ом enqueue → dequeue.
- Если sojourn (queue-wait) держится выше `setBackpressureTargetMs()` (дефолт 5 ms) **подряд 100 ms**,
  listen-сокет ставится на паузу.
- Как только sojourn падает обратно, listen возобновляется.

В отличие от жёсткого `max_connections`, CoDel **отслеживает реальную нагрузку** на pipeline, а не
просто число конкурентных connections. Это особенно важно на HTTP/2, где одно connection даёт
произвольное число streams.

CoDel выключен по умолчанию для опт-ин рабочих нагрузок: после 0.3.0 ситуации, где CoDel
ошибочно срабатывал на муxed-h2 (короткие быстрые потоки толкали connection в "overloaded"
и парковали unrelated long-lived потоки), привели к выбору conservative-default.

## Bailout firewall

PHP fatal-errors из user handler (E_ERROR, OOM, uncaught на shutdown) **не валят сервер**. Каждый
protocol-entry-point (H1, H2, H3) оборачивает вызов handler'а в bailout-fence, который:

1. Драинит failing-корутину.
2. Эмитит 500 клиенту (если headers ещё не на проводе).
3. Возвращает control listener'у, который продолжает принимать.

Diagnostics: на failure-path сервер логирует C-stack (если `<execinfo.h>` доступен; gated через
`HAVE_EXECINFO_H`) и PHP-уровневую `zend_error`. На musl / Windows C-frame dump silently пропускается.

См. [`docs/118-tracing-jit-stale-fp-spill.md`](https://github.com/true-async/server/tree/main/docs)
в репозитории для одного из ранних bailout-bug'ов под Tracing-JIT.

## Connection draining (Step 8)

Сервер реализует две модели drain:

### Proactive: `setMaxConnectionAgeMs()`

После `(age ± 10% jitter)` lifetime соединение получает signal:

- H1: следующий ответ несёт `Connection: close`.
- H2: emit `GOAWAY`.

Аналог gRPC `MAX_CONNECTION_AGE`. Защищает от long-lived соединений, "приклеившихся" к одному
воркеру за L4-LB.

### Reactive: CoDel trip / hard-cap transition

Когда сервер заходит в overload (CoDel paused или hit `max_connections`), per-connection drain-effect
распределяется по окну `setDrainSpreadMs()` (аналог HAProxy `close-spread-time`), чтобы клиенты
не переподключались thundering herd'ом.

Минимальный gap между триггерами задаёт `setDrainCooldownMs()` (дефолт 10 s).

## Zero-copy hot paths

- **H2 over TLS hybrid emit** (0.6.2): малые ответы идут по DRAIN path (mem_send + `BIO_write`,
  без gather-аллокации); тела > 2 KiB или streaming идут по GATHER (NO_COPY refs + один `SSL_write_ex`).
  Bench: best-of-three на h2load matrix.
- **Static small-file fast path** (≤ 64 KiB): файл слурпается в `zend_string` и отдаётся одним
  `writev(headers + body)`. Файлы > 64 KiB идут через sendfile.
- **Inline `open`/`fstat`** для статики: без futex-round-trip через libuv thread-pool на warm dentry cache.

## Memory model

Сервер целенаправленно минимизирует RAM footprint:

- **Asymmetric TLS BIO ring sizes** (0.6.0): CT-in 17 KiB, PT-app back-channel 17 KiB, остальные
  без изменений; экономия ~62 KiB на TLS-connection.
- **Body pool** (см. выше): переиспользование крупных тел.
- **Streaming request body**: peak RSS на 50 параллельных 20-MiB POST'ах падает с 1170 MiB до **197 MiB**.
- **Static TSRMLS cache** (ext/async 0.7.0): `-DZEND_ENABLE_STATIC_TSRMLS_CACHE=1` превращает
  `EG()` / `ASYNC_G()` в один `__thread`-load вместо `pthread_getspecific`. +32% RPS на минимальном
  HTTP-handler.

## Соответствие RFC

- HTTP/1.1: полное RFC 9112 (`Connection: close` → reply mirror per §9.6 с 0.6.3).
- HTTP/2: RFC 9113, rapid-reset mitigation для CVE-2023-44487.
- HTTP/3: RFC 9114, QUIC RFC 9000 включая ротацию connection ID и amplification limits.
- TLS: TLS 1.2/1.3 only, OpenSSL 3.x; HTTP/3 требует OpenSSL 3.5+.
- WebSocket / SSE / gRPC: в планах.

## См. также

- [TrueAsync ABI](/ru/architecture/zend-async-api.html)
- [Scheduler и Reactor](/ru/architecture/scheduler-reactor.html)
- [Конфигурация сервера](/ru/docs/server/configuration.html)
- [Multi-worker](/ru/docs/server/workers.html)
