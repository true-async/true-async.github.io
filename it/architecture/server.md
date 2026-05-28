---
layout: architecture
lang: it
path_key: "/architecture/server.html"
nav_active: architecture
permalink: /it/architecture/server.html
page_title: "Architettura di TrueAsync Server"
description: "Internals di TrueAsync Server: event loop a thread singolo, zero-copy, CoDel, firewall di bailout, multi-worker tramite SO_REUSEPORT."
---

# Architettura di TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server è un'estensione PHP nativa (in C) che fa girare un server HTTP direttamente nello
spazio di indirizzamento del processo PHP. Architetturalmente è un **event loop a thread singolo**
con un **pool di worker replicato** opzionale per scalare orizzontalmente all'interno di un unico
processo.

## Quadro generale

```
            ┌────────────────────────────────────────────────────────────┐
            │                       Processo PHP                         │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop thread #0                  │ │
            │   │                                                      │ │
            │   │   libuv ──► accept ──► parse ──► dispatch ──► send   │ │
            │   │     ▲                                ▼                │ │
            │   │     │     ┌──── Handler PHP (coroutine) ────┐         │ │
            │   │     │     │  user code, DB, client HTTP, …  │         │ │
            │   │     │     └─────────────┬───────────────────┘         │ │
            │   │     └──────── yield ────┘                             │ │
            │   └──────────────────────────────────────────────────────┘ │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │             Event-loop thread #1 … N-1               │ │
            │   │   (con setWorkers(N>1), SO_REUSEPORT)                │ │
            │   └──────────────────────────────────────────────────────┘ │
            └────────────────────────────────────────────────────────────┘
```

Un unico thread possiede connessione e richiesta dall'accept al send finale. Niente handoff
accept→worker, niente fork/cleanup per richiesta, niente lock globali. Quando l'handler deve
attendere I/O (DB, HTTP, file), la coroutine cede all'event loop, che subito sceglie il prossimo
evento pronto.

## Layer

### 1. Reactor: libuv

Il layer di I/O di base: libuv tramite la [TrueAsync ABI](/it/architecture/zend-async-api.html).
Accept TCP, recvmmsg UDP, operazioni su file, timer, sigwait — tutto tramite la stessa interfaccia
`zend_async_event_t`. Il reactor conosce epoll/kqueue/IOCP, il server no.

API di estensione critiche:

- `zend_async_io_*`: lettura/scrittura non bloccante di socket e file.
- `zend_async_io_sendfile_t`: `uv_fs_sendfile` (`sendfile` Linux/BSD, `TransmitFile` Windows).
- `zend_async_fs_open_t`: `open(2)` async tramite il thread pool di libuv.
- `udp_bind` per HTTP/3 / QUIC.

### 2. Parser di protocollo

- **HTTP/1.1**: [`llhttp`](https://github.com/nodejs/llhttp) 9.3.0 vendored (lo stesso parser usato
  da Node.js).
- **HTTP/2**: `libnghttp2` ≥ 1.57 (soglia per il rapid-reset di CVE-2023-44487).
- **HTTP/3 / QUIC**: `libngtcp2` + `libnghttp3`, API QUIC TLS di OpenSSL 3.5 (backend
  `libngtcp2_crypto_ossl`).

Rilevamento di protocollo sopra un unico socket TCP:

- plaintext: preface `PRI * HTTP/2.0\r\n...\r\n` → HTTP/2 (h2c), altrimenti → llhttp.
- TLS: negoziazione ALPN durante l'handshake.

`HttpServer::addListener()` apre un listener multi-protocollo. Per porte con protocollo ristretto si
usano `addHttp1Listener` / `addHttp2Listener` / `addHttp3Listener`.

### 3. Arena delle connessioni

`http_connection_t`: stato per connessione (768 B). Conservato in uno slab pool: chunk da
`CONN_ARENA_CHUNK_SLOTS` (256) elementi. Live/free tracciati tramite bitmap; i chunk non si riducono
mai, dando un arena hit a caldo senza allocazioni.

Visibile tramite [`HttpServer::getRuntimeStats()`](/it/docs/reference/server/http-server.html#getruntimestats):
`conn_arena_live`, `conn_arena_slots`, `conn_arena_chunks`, `conn_arena_bytes`.

### 4. Body pool

LIFO per thread per i buffer di corpi richiesta grandi (≥ 1 MB). I corpi di questa classe vengono
allocati tramite `zend_mm`, ma **non** restituiti all'allocatore: vanno in un LIFO per classe di
dimensione. La richiesta successiva della stessa classe riusa lo slot, senza traffico `mmap`/`munmap`
e senza contesa su `mmap_lock`, che limitava la scalabilità multi-worker sui carichi di upload pesanti.

Benchmark (W=8, c=128, body POST da 2 MiB): 1500 RPS / 370% CPU → **3300 RPS / 720% CPU** (×2.2 di
throughput; la CPU ora scala davvero con i worker).

Il pool si drena su `HttpServer::stop()` e RSHUTDOWN. In build di debug, il leak detector di
`zend_mm` vede uno stato pulito allo scarico del modulo.

### 5. Integrazione con le coroutine

Ogni richiesta accettata genera una nuova coroutine tramite `ZEND_ASYNC_NEW_COROUTINE`. La coroutine
viene eseguita in uno **scope per richiesta**, figlio dello scope del server. Questo ha due effetti:

- `Async\request_context()` risolve nel contesto comune all'intero sottoinsieme di coroutine della
  richiesta.
- `Async\current_context()` resta per coroutine.

La cancellation della richiesta (coroutine handler cancellata → limite 4xx del parser, peer reset
sullo stream, drain timeout) viaggia per la normale catena `AsyncCancellation`.
`TrueAsync\HttpException extends AsyncCancellation` porta lo stato HTTP così che il dispatcher sappia
cosa rispondere al client.

### 6. Multi-worker (opzionale)

`HttpServerConfig::setWorkers(N > 1)`:

1. Il padre crea un `Async\ThreadPool` di dimensione N.
2. Configurazione + set degli handler vengono copiati in ogni worker tramite `transfer_obj`
   (deep copy dell'intero grafo, incluso l'op_array delle closure; vedi
   [Thread snapshot](/it/architecture/zend-async-api.html)).
3. Il worker rifa il bind degli stessi listener con `SO_REUSEPORT`.
4. Il kernel (Linux/BSD) distribuisce in modo uniforme gli accept fra i socket dello stesso gruppo
   reuse-port.
5. Lo `start()` del padre attende il termine di tutti i worker.

Ogni worker ha event loop, opcache e allocator indipendenti. Niente stato condiviso, niente lock.
Il bootloader (se definito) viene eseguito in ogni worker una sola volta prima del task loop.

## Contropressione CoDel

Il server implementa [CoDel](https://datatracker.ietf.org/doc/html/rfc8289), una contropressione
adattiva basata sul tempo di sojourn:

- Ogni richiesta riceve un timestamp di enqueue → dequeue.
- Se il sojourn (queue-wait) resta sopra `setBackpressureTargetMs()` (default 5 ms) **per 100 ms
  consecutivi**, il socket in ascolto viene messo in pausa.
- Appena il sojourn rientra, l'ascolto riprende.

A differenza di un rigido `max_connections`, CoDel **tiene conto del carico reale** della pipeline,
non solo del numero di connessioni concorrenti. Questo conta soprattutto su HTTP/2, dove una
connessione produce un numero arbitrario di stream.

CoDel è disattivato per default in favore di carichi opt-in: dopo lo 0.3.0 alcune situazioni in cui
CoDel scattava erroneamente su mux H2 (stream brevi e veloci spingevano la connessione in
"overload" parcheggiando stream long-lived non correlati) hanno portato a un default conservativo.

## Firewall di bailout

I fatal error PHP dall'handler utente (E_ERROR, OOM, non gestiti allo shutdown) **non abbattono il
server**. Ogni protocol entry point (H1, H2, H3) avvolge la chiamata all'handler in una bailout
fence che:

1. Drena la coroutine fallita.
2. Invia 500 al client (se gli header non sono ancora sulla rete).
3. Restituisce il controllo al listener, che continua ad accettare.

Diagnostica: sul percorso di failure il server registra lo stack C (se `<execinfo.h>` è disponibile;
gated da `HAVE_EXECINFO_H`) e una `zend_error` a livello PHP. Su musl / Windows il dump dei frame C
viene saltato in silenzio.

Vedi [`docs/118-tracing-jit-stale-fp-spill.md`](https://github.com/true-async/server/tree/main/docs)
nel repository per uno dei primi bug di bailout sotto Tracing-JIT.

## Drain delle connessioni (Step 8)

Il server implementa due modelli di drain:

### Proattivo: `setMaxConnectionAgeMs()`

Dopo `(age ± 10% jitter)` di vita la connessione riceve un segnale:

- H1: la prossima risposta porta `Connection: close`.
- H2: emissione di `GOAWAY`.

Analogo a `MAX_CONNECTION_AGE` di gRPC. Protegge da connessioni long-lived "appiccicate" a un unico
worker dietro un LB L4.

### Reattivo: trigger CoDel / transizione hard-cap

Quando il server entra in overload (CoDel in pausa o `max_connections` raggiunto), l'effetto di drain
per connessione viene distribuito su una finestra `setDrainSpreadMs()` (analogo a
`close-spread-time` di HAProxy), perché i client non riconnettano in thundering herd.

Il gap minimo tra trigger è dato da `setDrainCooldownMs()` (default 10 s).

## Hot path zero-copy

- **H2 over TLS hybrid emit** (0.6.2): le risposte piccole vanno per il path DRAIN (mem_send +
  `BIO_write`, senza allocazione gather); i corpi > 2 KiB o in streaming vanno per il path GATHER
  (riferimenti NO_COPY + un solo `SSL_write_ex`). Bench: best-of-three sulla matrice h2load.
- **Fast path file piccolo statico** (≤ 64 KiB): il file viene caricato in `zend_string` e inviato
  con un unico `writev(headers + body)`. I file > 64 KiB passano per sendfile.
- **`open`/`fstat` inline** per gli statici: senza futex round-trip nel thread pool di libuv su
  dentry cache calde.

## Modello di memoria

Il server minimizza intenzionalmente il footprint RAM:

- **Dimensioni asimmetriche delle ring BIO TLS** (0.6.0): CT-in 17 KiB, PT-app back-channel 17 KiB,
  resto invariato; risparmio ~62 KiB per connessione TLS.
- **Body pool** (vedi sopra): riuso dei corpi grandi.
- **Streaming del corpo della richiesta**: RSS di picco su 50 POST paralleli da 20 MiB cala da
  1170 MiB a **197 MiB**.
- **TSRMLS cache statica** (ext/async 0.7.0): `-DZEND_ENABLE_STATIC_TSRMLS_CACHE=1` trasforma
  `EG()` / `ASYNC_G()` in un singolo `__thread` load invece di `pthread_getspecific`. +32% RPS su un
  handler HTTP minimale.

## Conformità RFC

- HTTP/1.1: pieno RFC 9112 (`Connection: close` → reply mirror per §9.6 dal 0.6.3).
- HTTP/2: RFC 9113, mitigazione rapid-reset per CVE-2023-44487.
- HTTP/3: RFC 9114, QUIC RFC 9000 inclusa la rotazione del connection ID e i limiti di amplification.
- TLS: solo TLS 1.2/1.3, OpenSSL 3.x; HTTP/3 richiede OpenSSL 3.5+.
- WebSocket / SSE / gRPC: in roadmap.

## Vedi anche

- [TrueAsync ABI](/it/architecture/zend-async-api.html)
- [Scheduler e Reactor](/it/architecture/scheduler-reactor.html)
- [Configurazione del server](/it/docs/server/configuration.html)
- [Multi-worker](/it/docs/server/workers.html)
