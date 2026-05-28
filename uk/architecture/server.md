---
layout: architecture
lang: uk
path_key: "/architecture/server.html"
nav_active: architecture
permalink: /uk/architecture/server.html
page_title: "Архітектура TrueAsync Server"
description: "Внутрішня будова TrueAsync Server: single-threaded event loop, zero-copy, CoDel, bailout firewall, multi-worker через SO_REUSEPORT."
---

# Архітектура TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server — нативне PHP-розширення (C), яке крутить HTTP-сервер прямо в адресному
просторі PHP-процесу. Архітектурно це **single-threaded event loop** з опціональним
**replicated worker pool** для горизонтального масштабування всередині одного процесу.

## Big picture

```
            ┌────────────────────────────────────────────────────────────┐
            │                       PHP-процес                           │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop потік #0                   │ │
            │   │                                                      │ │
            │   │   libuv ──► accept ──► parse ──► dispatch ──► send   │ │
            │   │     ▲                                ▼                │ │
            │   │     │     ┌──── PHP-обробник (корутина) ───┐         │ │
            │   │     │     │  user code, DB, HTTP-client, …  │        │ │
            │   │     │     └─────────────┬───────────────────┘        │ │
            │   │     └──────── yield ────┘                            │ │
            │   └──────────────────────────────────────────────────────┘ │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop потік #1 …N-1              │ │
            │   │   (при setWorkers(N>1), SO_REUSEPORT)                │ │
            │   └──────────────────────────────────────────────────────┘ │
            └────────────────────────────────────────────────────────────┘
```

Один потік тримає з'єднання і запит від accept до final send. Немає accept→worker handoff,
немає per-request fork/cleanup, немає глобальних блокувань. Коли обробнику потрібно зачекати I/O
(БД, HTTP, файл), корутина уступає event-loop'у, той одразу підхоплює наступну готову подію.

## Шари

### 1. Reactor: libuv

Базовий I/O-шар: libuv через [TrueAsync ABI](/uk/architecture/zend-async-api.html).
TCP accept'и, UDP recvmmsg, файлові операції, таймери, sigwait — все через однаковий інтерфейс
`zend_async_event_t`. Реактор знає про epoll/kqueue/IOCP, сервер не знає.

Critical extension API:

- `zend_async_io_*` — non-blocking читання/запис сокетів і файлів.
- `zend_async_io_sendfile_t` — `uv_fs_sendfile` (Linux/BSD `sendfile`, Windows `TransmitFile`).
- `zend_async_fs_open_t` — async `open(2)` через libuv thread-pool.
- `udp_bind` для HTTP/3 / QUIC.

### 2. Protocol parsers

- **HTTP/1.1**: vendored [`llhttp`](https://github.com/nodejs/llhttp) 9.3.0 (той самий парсер, що у Node.js).
- **HTTP/2**: `libnghttp2` ≥ 1.57 (floor для CVE-2023-44487 rapid-reset).
- **HTTP/3 / QUIC**: `libngtcp2` + `libnghttp3`, OpenSSL 3.5 QUIC TLS API (бекенд `libngtcp2_crypto_ossl`).

Protocol-detection поверх одного TCP-сокета:

- plaintext: preface `PRI * HTTP/2.0\r\n...\r\n` → HTTP/2 (h2c), інакше → llhttp.
- TLS: ALPN-negotiation на handshake.

`HttpServer::addListener()` піднімає multi-protocol listener. Для протокол-restricted портів
використовуйте `addHttp1Listener` / `addHttp2Listener` / `addHttp3Listener`.

### 3. Connection arena

`http_connection_t` — per-connection state (768 B). Зберігається в slab-pool: чанки по
`CONN_ARENA_CHUNK_SLOTS` (256) штук. Live/free відстежується через bitmap; chunks ніколи не
shrink'аються, що дає гарячий arena hit без алокацій.

Видно через [`HttpServer::getRuntimeStats()`](/uk/docs/reference/server/http-server.html#getruntimestats):
`conn_arena_live`, `conn_arena_slots`, `conn_arena_chunks`, `conn_arena_bytes`.

### 4. Body pool

Per-thread LIFO для великих request-body буферів (≥ 1 MB). Тіла цього класу алокуються через
`zend_mm`, але **повертаються** не в алокатор, а в per-size-class LIFO. Наступний запит того самого
size-class переуживає слот, без `mmap`/`munmap` traffic і без `mmap_lock` contention, яка
капала multi-worker scaling на upload-heavy навантаженнях.

Бенч (W=8, c=128, 2 MiB POST body): 1500 RPS / 370% CPU → **3300 RPS / 720% CPU** (×2.2 throughput;
CPU тепер реально масштабується з воркерами).

Drain'иться на `HttpServer::stop()` і RSHUTDOWN. У debug-збірці zend_mm leak detector бачить clean
slate на module unload.

### 5. Coroutine integration

Кожен прийнятий запит породжує нову корутину через `ZEND_ASYNC_NEW_COROUTINE`.
Корутина виконується в **per-request scope**, дочірньому до серверного scope. Це дає два ефекти:

- `Async\request_context()` резолвиться в спільний для всієї корутини-під-дерева запиту контекст.
- `Async\current_context()` лишається per-coroutine.

Cancel request'а (handler-coroutine cancelled → 4xx parser limit, peer reset на стрімі, drain timeout)
пробрасується через нормальний `AsyncCancellation`-ланцюжок. `TrueAsync\HttpException extends AsyncCancellation`
несе HTTP-status, щоб dispatcher знав, що відповісти клієнту.

### 6. Multi-worker (опціонально)

`HttpServerConfig::setWorkers(N > 1)`:

1. Батько спавнить `Async\ThreadPool` розміру N.
2. Конфіг + handler set копіюються в кожен воркер через `transfer_obj` (deep copy всього графа,
   включно з op_array замикань; див. [Thread snapshot](/uk/architecture/zend-async-api.html)).
3. Воркер re-bind'ить ті самі listeners з `SO_REUSEPORT`.
4. Ядро (Linux/BSD) рівномірно розподіляє accept по сокетах в одній reuse-port-групі.
5. Батьківський `start()` чекає завершення всіх воркерів.

Кожен воркер має незалежний event-loop, opcache і allocator. Жодного shared state, жодних
блокувань. Bootloader (якщо заданий) виконується в кожному воркері один раз перед task-loop'ом.

## CoDel backpressure

Сервер реалізує [CoDel](https://datatracker.ietf.org/doc/html/rfc8289), adaptive backpressure
за sojourn-часом:

- Кожен запит позначається timestamp'ом enqueue → dequeue.
- Якщо sojourn (queue-wait) тримається вище `setBackpressureTargetMs()` (дефолт 5 ms) **поспіль 100 ms**,
  listen-сокет ставиться на паузу.
- Як тільки sojourn падає назад, listen відновлюється.

На відміну від жорсткого `max_connections`, CoDel **відстежує реальне навантаження** на pipeline, а не
просто число конкурентних connections. Це особливо важливо на HTTP/2, де одне connection дає
довільне число streams.

CoDel вимкнено за замовчуванням для опт-ін робочих навантажень: після 0.3.0 ситуації, де CoDel
помилково спрацьовував на muxed-h2 (короткі швидкі потоки штовхали connection в "overloaded"
і паркували unrelated long-lived потоки), призвели до вибору conservative-default.

## Bailout firewall

PHP fatal-errors з user handler (E_ERROR, OOM, uncaught на shutdown) **не валять сервер**. Кожен
protocol-entry-point (H1, H2, H3) обгортає виклик handler'а в bailout-fence, що:

1. Дренує failing-корутину.
2. Емітує 500 клієнту (якщо headers ще не на дроті).
3. Повертає control listener'у, який продовжує приймати.

Diagnostics: на failure-path сервер логує C-stack (якщо `<execinfo.h>` доступний; gated через
`HAVE_EXECINFO_H`) і PHP-рівневу `zend_error`. На musl / Windows C-frame dump silently пропускається.

Див. [`docs/118-tracing-jit-stale-fp-spill.md`](https://github.com/true-async/server/tree/main/docs)
у репозиторії для одного з ранніх bailout-bug'ів під Tracing-JIT.

## Connection draining (Step 8)

Сервер реалізує дві моделі drain:

### Proactive: `setMaxConnectionAgeMs()`

Після `(age ± 10% jitter)` lifetime з'єднання отримує signal:

- H1: наступна відповідь несе `Connection: close`.
- H2: emit `GOAWAY`.

Аналог gRPC `MAX_CONNECTION_AGE`. Захищає від long-lived з'єднань, "прилиплих" до одного
воркера за L4-LB.

### Reactive: CoDel trip / hard-cap transition

Коли сервер заходить в overload (CoDel paused або hit `max_connections`), per-connection drain-effect
розподіляється по вікну `setDrainSpreadMs()` (аналог HAProxy `close-spread-time`), щоб клієнти
не перепідключались thundering herd'ом.

Мінімальний gap між тригерами задає `setDrainCooldownMs()` (дефолт 10 с).

## Zero-copy hot paths

- **H2 over TLS hybrid emit** (0.6.2): малі відповіді йдуть по DRAIN path (mem_send + `BIO_write`,
  без gather-алокації); тіла > 2 KiB або streaming ідуть по GATHER (NO_COPY refs + один `SSL_write_ex`).
  Bench: best-of-three на h2load matrix.
- **Static small-file fast path** (≤ 64 KiB): файл слурпається в `zend_string` і віддається одним
  `writev(headers + body)`. Файли > 64 KiB ідуть через sendfile.
- **Inline `open`/`fstat`** для статики: без futex-round-trip через libuv thread-pool на warm dentry cache.

## Memory model

Сервер цілеспрямовано мінімізує RAM footprint:

- **Asymmetric TLS BIO ring sizes** (0.6.0): CT-in 17 KiB, PT-app back-channel 17 KiB, решта
  без змін; економія ~62 KiB на TLS-connection.
- **Body pool** (див. вище): переуживання великих тіл.
- **Streaming request body**: peak RSS на 50 паралельних 20-MiB POST'ах падає з 1170 MiB до **197 MiB**.
- **Static TSRMLS cache** (ext/async 0.7.0): `-DZEND_ENABLE_STATIC_TSRMLS_CACHE=1` перетворює
  `EG()` / `ASYNC_G()` в один `__thread`-load замість `pthread_getspecific`. +32% RPS на мінімальному
  HTTP-handler.

## Відповідність RFC

- HTTP/1.1: повне RFC 9112 (`Connection: close` → reply mirror per §9.6 з 0.6.3).
- HTTP/2: RFC 9113, rapid-reset mitigation для CVE-2023-44487.
- HTTP/3: RFC 9114, QUIC RFC 9000 включно з ротацією connection ID і amplification limits.
- TLS: TLS 1.2/1.3 only, OpenSSL 3.x; HTTP/3 потребує OpenSSL 3.5+.
- WebSocket / SSE / gRPC: у планах.

## Див. також

- [TrueAsync ABI](/uk/architecture/zend-async-api.html)
- [Планувальник і реактор](/uk/architecture/scheduler-reactor.html)
- [Конфігурація сервера](/uk/docs/server/configuration.html)
- [Multi-worker](/uk/docs/server/workers.html)
