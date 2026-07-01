---
layout: docs
lang: fr
path_key: "/docs/server/configuration.html"
nav_active: docs
permalink: /fr/docs/server/configuration.html
page_title: "TrueAsync Server : configuration"
description: "HttpServerConfig : listeners, TLS, timeouts, backpressure, limites de corps, body streaming, drapeaux JSON, logging, HTTP/3."
---

# Configuration de TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

Toute la configuration du serveur se fait via l'objet
[`TrueAsync\HttpServerConfig`](/fr/docs/reference/server/http-server-config.html) avant l'appel de
`new HttpServer($config)`. Une fois `HttpServer` créé, la configuration est **gelée** : tout setter
sur celle-ci lèvera `HttpServerRuntimeException`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->addListener('0.0.0.0', 8443, tls: true)
    ->addHttp3Listener('0.0.0.0', 8443)
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key')
    ->setWorkers(4)
    ->setKeepAliveTimeout(60)
    ->setMaxBodySize(50 * 1024 * 1024)
    ->setCompressionEnabled(true)
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);

$server = new HttpServer($config);
```

Les setters renvoient `static`, donc la configuration se construit en chaîne.

## Listeners

Le serveur peut écouter un nombre arbitraire de sockets TCP/Unix et de ports UDP (pour HTTP/3)
simultanément.

| Méthode | Ce qu'elle fait |
|---------|-----------------|
| `addListener($host, $port, $tls = false)` | TCP, HTTP/1.1 + HTTP/2 (h2c via preface en plaintext, h2 via ALPN en TLS) |
| `addHttp1Listener($host, $port, $tls = false)` | TCP, uniquement HTTP/1.1. Un client avec preface HTTP/2 reçoit un 400 |
| `addHttp2Listener($host, $port, $tls = false)` | TCP, uniquement HTTP/2. Sans TLS, c'est du h2c avec preface obligatoire |
| `addHttp3Listener($host, $port)` | UDP, HTTP/3 / QUIC. TLS 1.3 activé automatiquement, le certificat du serveur est utilisé |
| `addUnixListener($path)` | Socket Unix, HTTP/1.1 + HTTP/2 (style h2c) |

```php
$config
    ->addListener('0.0.0.0', 80)              // H1 + H2c
    ->addListener('0.0.0.0', 443, tls: true)  // H1 + H2 over TLS
    ->addHttp3Listener('0.0.0.0', 443);       // H3 / QUIC sur le même port
```

Pour un rollout progressif de HTTP/3, on peut désactiver temporairement l'annonce `Alt-Svc` :

```php
$config->setHttp3AltSvcEnabled(false);
```

## TLS

```php
$config
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key');
```

Le certificat et la clé sont communs à tous les listeners TLS (y compris HTTP/3). TLS 1.2/1.3, ALPN,
chiffrements faibles désactivés, stateless session tickets, safe renegotiation désactivée.

## Workers et bootloader

`setWorkers(1)` (valeur par défaut) active le mode mono-thread : `start()` fait tourner l'event-loop
sur le thread appelant.

`setWorkers(N > 1)` lève un pool intégré de N threads via `Async\ThreadPool`. Chaque worker
re-bind les mêmes listeners, le noyau (Linux/BSD) répartit l'accept via `SO_REUSEPORT`.
Le `start()` parent attend la fin de tous les workers.

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // exécuté une seule fois dans chaque worker avant la task-loop
        require __DIR__ . '/vendor/autoload.php';
        Database::warmupPool();
        OpcacheWarm::compile();
    });
```

Détails : [Multi-worker](/fr/docs/server/workers.html).

## Timeouts

| Méthode | Défaut | Ce qui est en timeout |
|---------|--------|-----------------------|
| `setReadTimeout($sec)` | — | réception complète de la requête |
| `setWriteTimeout($sec)` | — | envoi de la réponse |
| `setKeepAliveTimeout($sec)` | — | idle entre requêtes ; `0` désactive keep-alive |
| `setShutdownTimeout($sec)` | — | graceful shutdown : combien de temps attendre les requêtes actives |

## Limites et backpressure

```php
$config
    ->setBacklog(1024)
    ->setMaxConnections(50_000)
    ->setMaxInflightRequests(10_000)
    ->setMaxBodySize(10 * 1024 * 1024)
    ->setBackpressureTargetMs(10);
```

- **`setMaxConnections($n)`** : limite stricte du nombre de connexions TCP. `0` lève la limite.
- **`setMaxInflightRequests($n)`** : admission control. Au-delà de ce nombre de handlers actifs,
  les nouvelles requêtes reçoivent un refus rapide. H1 → 503 + `Retry-After: 1`,
  H2 → `RST_STREAM REFUSED_STREAM` (retry-safe selon RFC 7540 §8.1.4). En H2, la limite stricte
  sur les connexions ne suffit pas, parce que de nouveaux streams arrivent sur une connexion déjà
  acceptée. `0` prend la valeur `max_connections × 10`.
- **`setMaxBodySize($bytes)`** : maximum du corps de requête. Par défaut 10 MiB, plage 1 KiB..16 GiB.
  H1 renvoie 413 et ferme la connexion ; H2 envoie `RST_STREAM(INTERNAL_ERROR)`.
- **`setBackpressureTargetMs($ms)`** : seuil de sojourn CoDel pour le backpressure côté accept.
  Quand le queue-wait par requête reste au-dessus du seuil pendant 100 ms consécutives, le socket
  listen est mis en pause. `0` désactive CoDel. Par défaut 5 ms ; pour un web typique 10–20 ms ;
  pour des handlers lents (BD, IO) 50–100 ms.

### Graceful drain (Step 8)

Gestion de la migration de charge derrière un load balancer L4 :

| Méthode | Défaut | Rôle |
|---------|--------|------|
| `setMaxConnectionAgeMs($ms)` | 0 (off) | Après une limite avec ±10 % de jitter, la connexion reçoit Connection: close (H1) ou GOAWAY (H2). Équivalent du `MAX_CONNECTION_AGE` gRPC. Production : 600_000 (10 min). |
| `setMaxConnectionAgeGraceMs($ms)` | 0 | Hard-close après `Connection: close`/GOAWAY. `0` désactive le timer force-close. |
| `setDrainSpreadMs($ms)` | 5000 | Fenêtre d'étalement uniforme du drain par connexion lors d'un trip CoDel / hard-cap (anti thundering herd). |
| `setDrainCooldownMs($ms)` | 10_000 | Gap minimum entre déclenchements réactifs de drain. |

## Limites du streaming HTTP/2

```php
$config
    ->setStreamWriteBufferBytes(256 * 1024)  // 256 KiB par stream, 4 KiB .. 64 MiB
    ->setH2StaticBudgetMax(0);               // 0 = auto (memory_limit / 8)
```

`HttpResponse::send($chunk)` ne bloque la coroutine du handler **que** sous backpressure : quand le
staging buffer par stream est plein. Par défaut 256 KiB (à titre de comparaison : gRPC-Go 64 KiB,
Envoy 1 MiB, Node.js 16 KiB).

## Réglages production HTTP/3

```php
$config
    ->setHttp3IdleTimeoutMs(30_000)           // RFC 9000 §10.1
    ->setHttp3StreamWindowBytes(256 * 1024)   // flow control par stream
    ->setHttp3MaxConcurrentStreams(100)       // initial_max_streams_bidi
    ->setHttp3PeerConnectionBudget(16)        // cap par IP source, protection slow-loris
    ->setHttp3AltSvcEnabled(true);            // annonce Alt-Svc RFC 7838
```

Le `initial_max_data` au niveau connexion est dérivé comme `window × max_concurrent_streams`
(pattern nginx).

## WebSocket

```php
$config
    ->setWsMaxMessageSize(1024 * 1024)   // 1 MiB, 128 .. 256 MiB
    ->setWsMaxFrameSize(1024 * 1024)     // 1 MiB, même plage
    ->setWsPingIntervalMs(30_000)        // PING de keepalive sur idle
    ->setWsPongTimeoutMs(60_000)         // délai maximum pour la réponse PONG
    ->setWsPermessageDeflate(false);     // RFC 7692, désactivé par défaut
```

- **`setWsMaxMessageSize($bytes)`** — taille max pour un message réassemblé. Dépasser cette
  limite produit `1009 Message Too Big` et ferme la connexion (RFC 6455 §7.4.1).
- **`setWsMaxFrameSize($bytes)`** — taille max pour une seule frame. Protège contre le
  fragment-flood, où le client envoie des millions de fragments minuscules.
- **`setWsPingIntervalMs($ms)`** — fréquence à laquelle le serveur ping de lui-même les
  connexions idle. `0` désactive le ping automatique.
- **`setWsPongTimeoutMs($ms)`** — combien de temps attendre le PONG après un PING avant de
  considérer la connexion comme morte et de la fermer avec le code `1001 GoingAway`. `0`
  désactive le timeout.
- **`setWsPermessageDeflate($bool)`** — RFC 7692, compression au niveau message. Désactivé par
  défaut : c'est un opt-in délibéré, parce que la compression coûte du CPU et élargit la surface
  d'attaque par décompression-bombe. Négocié uniquement quand le client lui-même offre cette
  extension ; nécessite un build avec zlib.

Voir le [guide WebSocket](/fr/docs/server/websocket.html) et la
[référence](/fr/docs/reference/server/websocket.html) pour l'API de connexion elle-même.

## Body streaming

Active le streaming pull-based du corps de requête (issue #26) : les parseurs H1/H2 déposent les
chunks dans une file, le handler les lit via
[`HttpRequest::readBody()`](/fr/docs/reference/server/http-request.html#readbody) sans retenir
l'intégralité du corps en RAM.

```php
$config->setBodyStreamingEnabled(true);

$server->addHttpHandler(function ($req, $res) {
    while (($chunk = $req->readBody()) !== null) {
        // traiter le chunk (par ex. écriture streaming sur disque, parsing)
    }
    $res->setStatusCode(204);
});
```

Sans `setBodyStreamingEnabled(true)`, le handler reçoit un corps déjà entièrement lu via
`getBody()` ; `readBody()` est indisponible dans ce mode.

Comparaison pour 50 POST parallèles de 20 MiB (h2load, WSL2) : peak RSS chute de 1170 MiB à
**197 MiB** (×6), débit 36 req/s → **100 req/s** (×2.7), parce que le dispatch du handler n'attend
plus le corps complet.

Voir aussi [Streaming](/fr/docs/server/streaming.html).

## Auto-await body

```php
$config->setAutoAwaitBody(true);   // défaut : true
```

Lorsqu'activé, les requêtes non multipart attendent le corps complet avant l'appel du handler
(multipart est toujours en streaming). Utile pour le traitement classique du corps entier.

## JSON

```php
$config->setJsonEncodeFlags(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

Ces drapeaux s'appliquent à [`HttpResponse::json()`](/fr/docs/reference/server/http-response.html#json)
quand l'appelant n'a pas passé `$flags` explicitement. `JSON_THROW_ON_ERROR` est silencieusement
retiré : une erreur d'encodage donne 500 avec un corps JSON d'erreur, l'exception n'est pas
propagée dans le handler.

## Logging

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);   // tout php_stream : fichier, php://stderr, php://memory, user wrapper
```

Le logger est désactivé par défaut (`LogSeverity::OFF`). La severity est figée au démarrage, les
changements runtime ne sont pas supportés (modèle mono-thread lock-free).

Niveaux (SeverityNumber OpenTelemetry) :

| Niveau | Ce qui est journalisé |
|--------|-----------------------|
| `OFF` (0) | rien |
| `DEBUG` (5) | tracing des paquets H3 et autres |
| `INFO` (9) | lifecycle serveur (start/stop), bind retries |
| `WARN` (13) | échec de handshake TLS, peer reset, exceptions absorbées |
| `ERROR` (17) | listener bind failed, erreurs protocole graves |

`FATAL` est volontairement absent : il passe par `zend_error_noreturn(E_ERROR)`, qui interrompt
déjà le processus.

## Télémétrie (W3C Trace Context)

```php
$config->setTelemetryEnabled(true);
```

Lorsqu'activé, les `traceparent` / `tracestate` entrants sont parsés et attachés à la requête.
Dans le handler, sont disponibles :

```php
$req->getTraceParent();   // header brut
$req->getTraceState();
$req->getTraceId();       // 32 caractères hex minuscule
$req->getSpanId();        // 16 caractères hex minuscule
$req->getTraceFlags();    // int (0x01 = sampled)
```

## Référence complète

Voir [`TrueAsync\HttpServerConfig`](/fr/docs/reference/server/http-server-config.html) : les 60+
méthodes avec description détaillée et plages de valeurs valides.
