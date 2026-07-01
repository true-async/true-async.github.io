---
layout: docs
lang: fr
path_key: "/docs/server/index.html"
nav_active: docs
permalink: /fr/docs/server/index.html
page_title: "TrueAsync Server"
description: "TrueAsync Server — extension PHP native qui transforme PHP en serveur HTTP/1.1/2/3 haute performance. Multi-protocole, TLS 1.2/1.3, compression, coroutines — le tout dans un seul processus."
---

# TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

**TrueAsync Server** est une extension PHP native qui exécute un serveur HTTP performant
**directement à l'intérieur du processus PHP**. Sans démon séparé, sans reverse-proxy, sans pont FastCGI.

Il prend en charge dès l'installation **HTTP/1.1 et HTTP/2 sur le même port TCP**. Le choix du
protocole se fait par négociation ALPN (en TLS) ou via HTTP Upgrade. HTTP/3 fonctionne sur le même
port UDP (QUIC) et est annoncé aux clients via l'en-tête `Alt-Svc`.

WebSocket et SSE sont déjà terminés et fonctionnent sur le même modèle d'un unique listener avec
détection de protocole. gRPC sur HTTP/2 est encore en développement (voir
[Roadmap](#fonctionnalités)).

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

## Pourquoi

**L'objectif du serveur est de révéler le potentiel des applications concurrentes en PHP.**

TrueAsync a doté le langage de véritables coroutines, d'E/S non bloquantes et de pools de connexions.
Pour que ce potentiel se concrétise sous charge production, il faut un serveur conçu dès le départ
pour ce modèle : un processus longue durée avec une event-loop, dans laquelle chaque requête reçoit
sa propre coroutine et où l'ordonnanceur bascule entre elles à chaque attente d'E/S.

TrueAsync Server est précisément ce serveur. Aucune couche d'indirection entre les coroutines et le
réseau : le listener, le parseur de protocole, le dispatcher de requêtes et le handler vivent dans
le même processus et dans la même event-loop. Les connexions à la base sont réutilisées via
`Async\Pool`, opcache reste chaud entre les requêtes, le cold-start est payé une seule fois, lors
du `start()`.

## Fonctionnalités

| Statut | Fonctionnalité | Détails |
|--------|----------------|---------|
| ✅ | **HTTP/1.1** | Conformité complète RFC 9112, keep-alive, pipelining (via [llhttp](https://github.com/nodejs/llhttp), le même parseur que Node.js) |
| ✅ | **HTTP/2** | Multiplexage, server push (libnghttp2 ≥ 1.57, floor pour CVE-2023-44487) |
| ✅ | **HTTP/3 / QUIC** | Transport UDP via libngtcp2 + libnghttp3, API QUIC TLS d'OpenSSL 3.5 |
| ✅ | **TLS 1.2 / 1.3** | OpenSSL 3.x, négociation ALPN, chiffrements faibles désactivés |
| ✅ | **Compression** | gzip (zlib-ng / zlib), Brotli, zstd : sur la réponse et décodage des corps entrants pour tous les protocoles |
| ✅ | **Multipart / file uploads** | Parseur streaming zero-copy |
| ✅ | **Backpressure** | CoDel (RFC 8289), pause adaptative de l'accept sous charge |
| ✅ | **Streaming du corps de requête** | Optionnel via [`HttpRequest::readBody()`](/fr/docs/reference/server/http-request.html) ; uploads sans conserver le corps en RAM |
| ✅ | **sendFile** | Service efficace de fichiers disque directement depuis le handler |
| ✅ | **Worker pool intégré** | `setWorkers(N)` : N threads via `Async\ThreadPool` + `SO_REUSEPORT` |
| ✅ | **Per-request scope** | Chaque handler dans son propre scope ; `Async\request_context()` fournit un contexte commun à toute l'arborescence de coroutines de la requête |
| ✅ | **Coroutines natives** | Intégration profonde avec TrueAsync : toute E/S bloquante dans le handler suspend la coroutine, pas le thread |
| ✅ | **Zero-copy** | Allocations minimales sur le chemin chaud |
| ✅ | **WebSocket** | RFC 6455, Upgrade depuis HTTP/1.1 et HTTP/2 (RFC 8441 Extended CONNECT), `wss://`, permessage-deflate (RFC 7692), full-duplex, backpressure, les 246 tests Autobahn|Testsuite |
| ✅ | **SSE** | `text/event-stream` sur HTTP/1.1, HTTP/2 et HTTP/3, le même handler quel que soit le protocole |
| 📋 | **gRPC** | Au-dessus de HTTP/2, unary et streaming |

## Architecture : event loop mono-thread

Le même modèle que [NGINX](https://nginx.org), [Envoy](https://www.envoyproxy.io),
[Node.js](https://nodejs.org) et Rust [Tokio](https://tokio.rs)/[hyper](https://hyper.rs).

**Un seul thread est propriétaire de la connexion et de la requête, de l'accept au send.**
Aucun transfert entre accept-thread et worker-thread, aucun verrou, aucun changement de contexte
entre eux. Une event-loop unique accepte la connexion, lit les octets du socket, parse le HTTP,
dispatche la requête vers le handler et écrit la réponse, sans quitter le thread.

```
       ┌─────────────────────────────────────────┐
       │              Event Loop Thread          │
       │                                         │
accept ─►  parse  ─►  dispatch  ─►  respond      │
       │     ▲                        │          │
       │     └──── coroutine yield ◄──┘          │
       └─────────────────────────────────────────┘
```

Les E/S non bloquantes sont assurées par le **reactor libuv** (via TrueAsync). Quand une coroutine
doit attendre un fichier, une base de données ou la prochaine frame WebSocket, elle rend la main à
l'event-loop, qui prend immédiatement le prochain événement prêt. Le thread n'est jamais inactif
dans un `read()`/`recv()`.

Pour le passage à l'échelle multi-cœurs, on lève un **multi-worker** via
[`setWorkers(N)`](/fr/docs/reference/server/http-server-config.html#setworkers) :
l'`Async\ThreadPool` intégré crée N threads OS, chacun avec son event-loop indépendante,
et `SO_REUSEPORT` (Linux/BSD) laisse le noyau répartir les connexions entrantes entre eux.
Aucun shared state, aucun verrou global.

## Par où commencer

- [Démarrage rapide](/fr/docs/server/quickstart.html) : installation et exemple minimal en 5 minutes
- [Configuration](/fr/docs/server/configuration.html) : listeners, workers, TLS, timeouts, body streaming, bootloader
- [Compression](/fr/docs/server/compression.html) : gzip / brotli / zstd, négociation, BREACH
- [Fichiers statiques et sendFile](/fr/docs/server/static-files.html) : `StaticHandler`, sidecars précompressés, Range
- [Streaming](/fr/docs/server/streaming.html) : streaming du corps de requête et streaming de la réponse
- [SSE](/fr/docs/server/sse.html) : Server-Sent Events, `sseEvent()`, reconnexion, heartbeat
- [WebSocket](/fr/docs/server/websocket.html) : connexions full-duplex, backpressure, keepalive
- [Multi-worker](/fr/docs/server/workers.html) : `setWorkers(N)`, bootloader, per-request scope
- [Exemples](/fr/docs/server/examples.html) : JSON-API, statique, fan-out, multipart upload
- [Architecture](/fr/architecture/server.html) : internes

### Référence API

- [`TrueAsync\HttpServer`](/fr/docs/reference/server/http-server.html)
- [`TrueAsync\HttpServerConfig`](/fr/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/fr/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/fr/docs/reference/server/http-response.html)
- [`TrueAsync\WebSocket`](/fr/docs/reference/server/websocket.html)
- [`TrueAsync\StaticHandler`](/fr/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/fr/docs/reference/server/send-file-options.html)
- [`TrueAsync\UploadedFile`](/fr/docs/reference/server/uploaded-file.html)
- [`TrueAsync\LogSeverity`](/fr/docs/reference/server/log-severity.html)
- [Exceptions](/fr/docs/reference/server/exceptions.html)

## Alternatives

[FrankenPHP](/fr/docs/frankenphp.html) est un serveur embarquable séparé basé sur Caddy/Go, dans
lequel PHP joue le rôle de worker. Il est pratique lorsque vous avez besoin des fonctionnalités de
Caddy (Let's Encrypt automatique, configuration via Caddyfile) ou d'une intégration dans une
infrastructure Caddy existante. TrueAsync Server est l'alternative native sans runtime Go : le
serveur vit directement dans le processus PHP.
