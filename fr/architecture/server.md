---
layout: architecture
lang: fr
path_key: "/architecture/server.html"
nav_active: architecture
permalink: /fr/architecture/server.html
page_title: "Architecture de TrueAsync Server"
description: "Internes de TrueAsync Server : event loop mono-thread, zero-copy, CoDel, bailout firewall, multi-worker via SO_REUSEPORT."
---

# Architecture de TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server est une extension PHP native (C) qui fait tourner un serveur HTTP directement dans
l'espace d'adressage du processus PHP. Architecturalement, c'est une **event loop mono-thread**
avec un **replicated worker pool** optionnel pour le passage à l'échelle horizontal au sein d'un
même processus.

## Vue d'ensemble

```
            ┌────────────────────────────────────────────────────────────┐
            │                       Processus PHP                        │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop thread #0                  │ │
            │   │                                                      │ │
            │   │   libuv ──► accept ──► parse ──► dispatch ──► send   │ │
            │   │     ▲                                ▼                │ │
            │   │     │     ┌──── handler PHP (coroutine) ────┐         │ │
            │   │     │     │  user code, DB, HTTP-client, …  │         │ │
            │   │     │     └─────────────┬───────────────────┘         │ │
            │   │     └──────── yield ────┘                             │ │
            │   └──────────────────────────────────────────────────────┘ │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop thread #1 …N-1             │ │
            │   │   (avec setWorkers(N>1), SO_REUSEPORT)               │ │
            │   └──────────────────────────────────────────────────────┘ │
            └────────────────────────────────────────────────────────────┘
```

Un seul thread détient la connexion et la requête, de l'accept au final send. Pas de
accept→worker handoff, pas de fork/cleanup par requête, pas de verrous globaux. Quand le handler
doit attendre des E/S (BD, HTTP, fichier), la coroutine rend la main à l'event-loop, qui prend
immédiatement le prochain événement prêt.

## Couches

### 1. Reactor : libuv

Couche d'E/S de base : libuv via le [TrueAsync ABI](/fr/architecture/zend-async-api.html).
TCP accept, UDP recvmmsg, opérations fichier, timers, sigwait — tout via la même interface
`zend_async_event_t`. Le reactor connaît epoll/kqueue/IOCP, le serveur non.

API d'extension critique :

- `zend_async_io_*` : lecture/écriture non bloquante de sockets et fichiers.
- `zend_async_io_sendfile_t` : `uv_fs_sendfile` (Linux/BSD `sendfile`, Windows `TransmitFile`).
- `zend_async_fs_open_t` : `open(2)` async via le thread-pool libuv.
- `udp_bind` pour HTTP/3 / QUIC.

### 2. Parseurs de protocoles

- **HTTP/1.1** : [`llhttp`](https://github.com/nodejs/llhttp) 9.3.0 vendored (le même parseur que
  Node.js).
- **HTTP/2** : `libnghttp2` ≥ 1.57 (floor pour CVE-2023-44487 rapid-reset).
- **HTTP/3 / QUIC** : `libngtcp2` + `libnghttp3`, API QUIC TLS OpenSSL 3.5 (backend
  `libngtcp2_crypto_ossl`).

Détection de protocole au-dessus d'un seul socket TCP :

- plaintext : preface `PRI * HTTP/2.0\r\n...\r\n` → HTTP/2 (h2c), sinon → llhttp.
- TLS : négociation ALPN au handshake.

`HttpServer::addListener()` lève un listener multi-protocole. Pour des ports protocol-restricted,
utilisez `addHttp1Listener` / `addHttp2Listener` / `addHttp3Listener`.

### 3. Connection arena

`http_connection_t` : state par connexion (768 B). Stocké dans une slab-pool : chunks de
`CONN_ARENA_CHUNK_SLOTS` (256) éléments. Live/free suivis par bitmap ; les chunks ne shrink
jamais, donnant un arena hit chaud sans allocations.

Visible via [`HttpServer::getRuntimeStats()`](/fr/docs/reference/server/http-server.html#getruntimestats) :
`conn_arena_live`, `conn_arena_slots`, `conn_arena_chunks`, `conn_arena_bytes`.

### 4. Body pool

LIFO per-thread pour les buffers de request-body volumineux (≥ 1 MB). Les corps de cette classe
sont alloués via `zend_mm`, mais **renvoyés** non pas dans l'allocateur, mais dans une LIFO par
size-class. La requête suivante de la même size-class réutilise un slot, sans trafic
`mmap`/`munmap` et sans contention `mmap_lock`, qui plombait la scalabilité multi-worker sur les
charges upload-heavy.

Bench (W=8, c=128, body POST 2 MiB) : 1500 RPS / 370 % CPU → **3300 RPS / 720 % CPU** (×2.2 sur le
throughput ; le CPU monte enfin réellement avec les workers).

Drain sur `HttpServer::stop()` et RSHUTDOWN. En build debug, le leak detector zend_mm voit un
clean slate au module unload.

### 5. Intégration coroutines

Chaque requête acceptée crée une nouvelle coroutine via `ZEND_ASYNC_NEW_COROUTINE`. La coroutine
s'exécute dans un **per-request scope**, enfant du scope serveur. Cela donne deux effets :

- `Async\request_context()` se résout en contexte commun à toute l'arborescence de coroutines de
  la requête.
- `Async\current_context()` reste per-coroutine.

Le cancel d'une requête (handler-coroutine annulée → limite parseur 4xx, peer reset sur stream,
drain timeout) est propagé via la chaîne `AsyncCancellation` normale.
`TrueAsync\HttpException extends AsyncCancellation` porte le statut HTTP, pour que le dispatcher
sache quoi répondre au client.

### 6. Multi-worker (optionnel)

`HttpServerConfig::setWorkers(N > 1)` :

1. Le parent spawn un `Async\ThreadPool` de taille N.
2. Config + ensemble de handlers sont copiés dans chaque worker via `transfer_obj` (deep copy de
   tout le graphe, y compris les op_array des closures ; voir
   [Thread snapshot](/fr/architecture/zend-async-api.html)).
3. Le worker re-bind les mêmes listeners avec `SO_REUSEPORT`.
4. Le noyau (Linux/BSD) répartit uniformément l'accept entre les sockets d'un même reuse-port-group.
5. Le `start()` parent attend la fin de tous les workers.

Chaque worker a une event-loop, un opcache et un allocator indépendants. Aucun shared state, aucun
verrou. Le bootloader (si défini) est exécuté dans chaque worker une seule fois avant la task-loop.

## CoDel backpressure

Le serveur implémente [CoDel](https://datatracker.ietf.org/doc/html/rfc8289), backpressure adaptatif
basé sur le temps de sojourn :

- Chaque requête est marquée avec un timestamp enqueue → dequeue.
- Si le sojourn (queue-wait) reste au-dessus de `setBackpressureTargetMs()` (défaut 5 ms) **pendant
  100 ms consécutives**, le socket listen est mis en pause.
- Dès que le sojourn redescend, le listen reprend.

Contrairement à un `max_connections` strict, CoDel **suit la charge réelle** sur le pipeline,
pas juste le nombre de connexions concurrentes. C'est particulièrement important pour HTTP/2 où
une seule connexion donne un nombre arbitraire de streams.

CoDel est désactivé par défaut pour des charges opt-in : après 0.3.0, les situations où CoDel se
déclenchait à tort sur du muxed-h2 (de courts flux rapides poussaient la connexion en "overloaded"
et parquaient des flux long-lived sans rapport) ont conduit au choix de ce défaut conservateur.

## Bailout firewall

Les PHP fatal-errors du user handler (E_ERROR, OOM, uncaught au shutdown) **ne tuent pas le
serveur**. Chaque protocol-entry-point (H1, H2, H3) emballe l'appel du handler dans un
bailout-fence qui :

1. Draine la coroutine en échec.
2. Émet 500 vers le client (si les en-têtes ne sont pas encore partis).
3. Rend le contrôle au listener, qui continue d'accepter.

Diagnostics : sur le failure-path, le serveur log la C-stack (si `<execinfo.h>` est dispo ;
gardé par `HAVE_EXECINFO_H`) et l'erreur niveau PHP `zend_error`. Sur musl / Windows, le dump des
frames C est silencieusement sauté.

Voir [`docs/118-tracing-jit-stale-fp-spill.md`](https://github.com/true-async/server/tree/main/docs)
dans le dépôt pour un des premiers bugs bailout sous Tracing-JIT.

## Connection draining (Step 8)

Le serveur implémente deux modèles de drain :

### Proactif : `setMaxConnectionAgeMs()`

Après `(age ± 10 % jitter)` de lifetime, la connexion reçoit un signal :

- H1 : la prochaine réponse porte `Connection: close`.
- H2 : émission de `GOAWAY`.

Équivalent du `MAX_CONNECTION_AGE` gRPC. Protège des connexions long-lived "collées" à un même
worker derrière un LB L4.

### Réactif : trip CoDel / transition hard-cap

Quand le serveur entre en overload (CoDel paused ou hit `max_connections`), l'effet de drain par
connexion est étalé sur la fenêtre `setDrainSpreadMs()` (équivalent du `close-spread-time`
HAProxy), pour éviter que les clients ne se reconnectent en thundering herd.

Le gap minimal entre déclenchements est donné par `setDrainCooldownMs()` (défaut 10 s).

## Chemins chauds zero-copy

- **H2 over TLS hybrid emit** (0.6.2) : les petites réponses passent par le path DRAIN
  (mem_send + `BIO_write`, sans allocation gather) ; les corps > 2 KiB ou streaming passent par
  GATHER (NO_COPY refs + un seul `SSL_write_ex`). Bench : best-of-three sur la matrice h2load.
- **Static small-file fast path** (≤ 64 KiB) : le fichier est slurpé dans une `zend_string` et
  envoyé en un seul `writev(headers + body)`. Les fichiers > 64 KiB passent par sendfile.
- **`open`/`fstat` inlinés** pour la statique : sans futex round-trip via thread-pool libuv sur
  un dentry cache chaud.

## Modèle mémoire

Le serveur minimise délibérément l'empreinte RAM :

- **Asymmetric TLS BIO ring sizes** (0.6.0) : CT-in 17 KiB, PT-app back-channel 17 KiB, le reste
  inchangé ; économie d'environ 62 KiB par connexion TLS.
- **Body pool** (voir plus haut) : réutilisation des corps volumineux.
- **Streaming du corps de requête** : peak RSS sur 50 POST parallèles de 20 MiB chute de 1170 MiB
  à **197 MiB**.
- **Static TSRMLS cache** (ext/async 0.7.0) : `-DZEND_ENABLE_STATIC_TSRMLS_CACHE=1` transforme
  `EG()` / `ASYNC_G()` en un unique `__thread`-load au lieu d'un `pthread_getspecific`. +32 % RPS
  sur un handler HTTP minimal.

## Conformité RFC

- HTTP/1.1 : RFC 9112 complète (`Connection: close` → reply mirror per §9.6 depuis 0.6.3).
- HTTP/2 : RFC 9113, mitigation rapid-reset pour CVE-2023-44487.
- HTTP/3 : RFC 9114, QUIC RFC 9000 y compris rotation des connection ID et amplification limits.
- TLS : TLS 1.2/1.3 seulement, OpenSSL 3.x ; HTTP/3 nécessite OpenSSL 3.5+.
- WebSocket / SSE / gRPC : planifiés.

## Voir aussi

- [TrueAsync ABI](/fr/architecture/zend-async-api.html)
- [Scheduler et Reactor](/fr/architecture/scheduler-reactor.html)
- [Configuration du serveur](/fr/docs/server/configuration.html)
- [Multi-worker](/fr/docs/server/workers.html)
