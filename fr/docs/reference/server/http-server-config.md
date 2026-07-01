---
layout: docs
lang: fr
path_key: "/docs/reference/server/http-server-config.html"
nav_active: docs
permalink: /fr/docs/reference/server/http-server-config.html
page_title: "TrueAsync\\HttpServerConfig"
description: "Référence complète de HttpServerConfig : listeners, workers, TLS, timeouts, backpressure, drain, compression, knobs HTTP/3, body streaming, logging."
---

# TrueAsync\HttpServerConfig

(PHP 8.6+, true_async_server 0.6+)

Configuration du serveur. Toutes les méthodes sont fluent (retournent `static`). Une fois l'objet
passé à `new HttpServer($config)`, la configuration est **gelée** : tout setter lève
`HttpServerRuntimeException`. Vérifier avec `isLocked()`.

Voir aussi [Configuration](/fr/docs/server/configuration.html) — guide pas-à-pas.

## Constructeur

### __construct

```php
public HttpServerConfig::__construct(?string $host = null, int $port = 8080)
```

Paramètres optionnels — raccourci pour un single-listener. Utilisé plus souvent sans arguments,
suivi de `addListener()`.

## Listeners

### addListener

```php
public HttpServerConfig::addListener(string $host, int $port, bool $tls = false): static
```

Listener TCP, acceptant HTTP/1.1 et HTTP/2 (h2c via détection de preface en plaintext, h2 via ALPN
en TLS).

### addHttp1Listener

```php
public HttpServerConfig::addHttp1Listener(string $host, int $port, bool $tls = false): static
```

Listener TCP HTTP/1.1 uniquement. Une connexion avec preface HTTP/2 est transmise à llhttp, qui
émet un 400 Bad Request conforme et se ferme.

### addHttp2Listener

```php
public HttpServerConfig::addHttp2Listener(string $host, int $port, bool $tls = false): static
```

Listener HTTP/2 uniquement.

- `$tls=false` : h2c (H2 cleartext). Le listener exige la preface RFC 7540 §3.5 ; tout le reste
  va dans `BAD_CLIENT_MAGIC` de nghttp2 et reçoit un `GOAWAY(PROTOCOL_ERROR)` conforme.
- `$tls=true` : le serveur annonce uniquement `h2` via ALPN.

### addUnixListener

```php
public HttpServerConfig::addUnixListener(string $path): static
```

Listener Unix-socket (H1 + H2, style h2c).

### addHttp3Listener

```php
public HttpServerConfig::addHttp3Listener(string $host, int $port): static
```

HTTP/3 / QUIC over UDP. TLS 1.3 obligatoire — le certificat serveur est utilisé, il n'y a pas de
flag `$tls` séparé. L'extension doit être compilée avec `--enable-http3`, sinon `start()` lèvera
une exception.

### getListeners

```php
public HttpServerConfig::getListeners(): array
```

Tableau de tous les listeners enregistrés.

## Limites de connexion

### setBacklog / getBacklog

```php
public HttpServerConfig::setBacklog(int $backlog): static
public HttpServerConfig::getBacklog(): int
```

Backlog du socket. Défaut 128.

### setWorkers / getWorkers

```php
public HttpServerConfig::setWorkers(int $workers): static
public HttpServerConfig::getWorkers(): int
```

Taille du worker-pool intégré (issue #11).

- `1` (défaut) : mono-thread.
- `> 1` : `start()` spawn un `Async\ThreadPool` de la taille indiquée, config + handler-set sont
  répliqués via `transfer_obj`, le parent attend la fin de tous les workers. Chaque worker re-bind
  les listeners ; le noyau balance l'accept via `SO_REUSEPORT` (Linux/BSD).

### setBootloader / getBootloader

```php
public HttpServerConfig::setBootloader(?\Closure $bootloader): static
public HttpServerConfig::getBootloader(): ?\Closure
```

Hook de startup par worker. Le pool deep-copy la closure une fois et l'exécute sur chaque worker
avant la task-loop — endroit idéal pour autoload, warmup des pools de connexions, précompilation
opcache.

S'applique uniquement quand `setWorkers() > 1`. Une exception dans le bootloader fait échouer tout
le pool. Nécessite TrueAsync ABI v0.15+.

### setMaxConnections / getMaxConnections

```php
public HttpServerConfig::setMaxConnections(int $maxConnections): static
public HttpServerConfig::getMaxConnections(): int
```

Limite stricte du nombre de connexions concurrentes. `0` : pas de limite.

### setMaxInflightRequests / getMaxInflightRequests

```php
public HttpServerConfig::setMaxInflightRequests(int $n): static
public HttpServerConfig::getMaxInflightRequests(): int
```

Admission control : à la limite atteinte, les nouvelles requêtes reçoivent un refus rapide — H1 →
503 + `Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM` (retry-safe selon RFC 7540 §8.1.4). `0` :
désactivé (défaut) ; si `0` reste à `start()`, la limite est dérivée comme `max_connections × 10`.

## Timeouts

| Méthode | Ce qui est en timeout |
|---------|-----------------------|
| `setReadTimeout(int)` / `getReadTimeout(): int` | réception de la requête |
| `setWriteTimeout(int)` / `getWriteTimeout(): int` | envoi de la réponse |
| `setKeepAliveTimeout(int)` / `getKeepAliveTimeout(): int` | idle entre requêtes ; `0` désactive keep-alive |
| `setShutdownTimeout(int)` / `getShutdownTimeout(): int` | combien de temps attendre les requêtes actives lors d'un graceful shutdown |

Valeurs en secondes. `0` (le cas échéant) désactive.

## Backpressure (CoDel)

### setBackpressureTargetMs / getBackpressureTargetMs

```php
public HttpServerConfig::setBackpressureTargetMs(int $ms): static
public HttpServerConfig::getBackpressureTargetMs(): int
```

Target sojourn pour CoDel. Quand le queue-wait par requête reste au-dessus du seuil pendant 100 ms
consécutives, le socket listen est mis en pause. Plage 0..10_000, défaut 5. `0` : désactive CoDel.

Guidance :
- handlers rapides (<5 ms) : défaut 5
- web typique : 10..20
- lent (BD, IO) : 50..100

## Graceful drain (Step 8)

### setMaxConnectionAgeMs / getMaxConnectionAgeMs

```php
public HttpServerConfig::setMaxConnectionAgeMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeMs(): int
```

Après `(age ± 10 % jitter)` de lifetime : H1 prochaine réponse avec `Connection: close`, H2 :
`GOAWAY`. Équivalent du `MAX_CONNECTION_AGE` gRPC. Défaut `0` (off) ; recommandation production
600_000 (10 min) derrière un LB L4. Doit être `0` ou ≥ 1000.

### setMaxConnectionAgeGraceMs / getMaxConnectionAgeGraceMs

```php
public HttpServerConfig::setMaxConnectionAgeGraceMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeGraceMs(): int
```

Hard-close après `Connection: close`/`GOAWAY`. `0` : pas de timer force-close ; non-zero ≥ 1000.

### setDrainSpreadMs / getDrainSpreadMs

```php
public HttpServerConfig::setDrainSpreadMs(int $ms): static
public HttpServerConfig::getDrainSpreadMs(): int
```

Fenêtre d'étalement uniforme du drain par connexion lors d'un trip CoDel / hard-cap
(anti-thundering-herd). Équivalent du `close-spread-time` HAProxy. Défaut 5000, ≥ 100.

### setDrainCooldownMs / getDrainCooldownMs

```php
public HttpServerConfig::setDrainCooldownMs(int $ms): static
public HttpServerConfig::getDrainCooldownMs(): int
```

Gap minimal entre déclenchements réactifs de drain. Les déclenchements pendant le cooldown
incrémentent un compteur de telemetry. Défaut 10_000, ≥ 1000.

## Streaming HTTP/2

### setStreamWriteBufferBytes / getStreamWriteBufferBytes

```php
public HttpServerConfig::setStreamWriteBufferBytes(int $bytes): static
public HttpServerConfig::getStreamWriteBufferBytes(): int
```

Cap par stream sur la chunk-queue pour le backpressure de `HttpResponse::send()`. HTTP/2 only ;
HTTP/1 chunked utilise le send-buffer kernel.

Défaut 262_144 (256 KiB). Plage 4_096..67_108_864 (64 MiB).

Baseline industrie : gRPC-Go 64 KiB, Envoy 1 MiB, Node.js 16 KiB.

### setH2StaticBudgetMax / getH2StaticBudgetMax

```php
public HttpServerConfig::setH2StaticBudgetMax(int $bytes): static
public HttpServerConfig::getH2StaticBudgetMax(): int
```

Cap par worker des body-buffers HTTP/2 pour fichiers statiques (read-ahead chunks + ring queues).
`0` : auto (`memory_limit / 8`). Toute valeur explicite est clampée pour que le static budget ne
dépasse pas `memory_limit` moins une petite réserve.

## Limites de corps

### setMaxBodySize / getMaxBodySize

```php
public HttpServerConfig::setMaxBodySize(int $bytes): static
public HttpServerConfig::getMaxBodySize(): int
```

Maximum du corps de requête (H1 et H2). H1 : 413 + close ; H2 : `RST_STREAM(INTERNAL_ERROR)` (la
connexion reste pour les autres streams).

Défaut 10_485_760 (10 MiB). Plage 1_024..17_179_869_184 (16 GiB).

## WebSocket {#websocket}

(true_async_server 0.9+). Guide : [WebSocket](/fr/docs/server/websocket.html).

### setWsMaxMessageSize / getWsMaxMessageSize

```php
public HttpServerConfig::setWsMaxMessageSize(int $bytes): static
public HttpServerConfig::getWsMaxMessageSize(): int
```

Taille max du message WebSocket réassemblé. Un ensemble de frames dont le payload combiné dépasse
la limite ferme la connexion avec `1009 Message Too Big` (RFC 6455 §7.4.1).

Défaut 1_048_576 (1 MiB). Plage 128..268_435_456 (256 MiB).

### setWsMaxFrameSize / getWsMaxFrameSize

```php
public HttpServerConfig::setWsMaxFrameSize(int $bytes): static
public HttpServerConfig::getWsMaxFrameSize(): int
```

Payload max pour une seule frame. Protège contre les attaques de type fragment-flood, où le
client envoie des millions de fragments minuscules.

Défaut 1_048_576 (1 MiB). Même plage que `setWsMaxMessageSize`.

### setWsPingIntervalMs / getWsPingIntervalMs

```php
public HttpServerConfig::setWsPingIntervalMs(int $ms): static
public HttpServerConfig::getWsPingIntervalMs(): int
```

Fréquence à laquelle le serveur ping une connexion par ailleurs idle. Le pair doit répondre avec
PONG dans le délai `WsPongTimeoutMs`, sinon la connexion est fermée avec le code `1001 GoingAway`.

Défaut 30_000 (30 s). `0` désactive le ping automatique.

### setWsPongTimeoutMs / getWsPongTimeoutMs

```php
public HttpServerConfig::setWsPongTimeoutMs(int $ms): static
public HttpServerConfig::getWsPongTimeoutMs(): int
```

Le délai PONG : combien de temps le serveur attend après un PING avant de déclarer la connexion
morte.

Défaut 60_000 (60 s). `0` désactive le timeout.

### setWsPermessageDeflate / getWsPermessageDeflate

```php
public HttpServerConfig::setWsPermessageDeflate(bool $enabled): static
public HttpServerConfig::getWsPermessageDeflate(): bool
```

Active RFC 7692 permessage-deflate (compression au niveau message). Désactivé par défaut : c'est
un opt-in, parce que la compression coûte du CPU et élargit la surface d'attaque par
décompression-bombe. Négocié uniquement quand le client offre l'extension ; le plafond du message
réassemblé est vérifié aussi bien avant qu'après l'inflate. Nécessite un build avec zlib
(compression HTTP).

## Knobs HTTP/3

### setHttp3IdleTimeoutMs / getHttp3IdleTimeoutMs

```php
public HttpServerConfig::setHttp3IdleTimeoutMs(int $ms): static
public HttpServerConfig::getHttp3IdleTimeoutMs(): int
```

QUIC `max_idle_timeout` (RFC 9000 §10.1). Défaut 30_000 (30 s). Plage 0..UINT32_MAX (~49 jours) ;
`0` annonce "no idle timeout". La variable d'env legacy `PHP_HTTP3_IDLE_TIMEOUT_MS` fonctionne
toujours comme ops escape hatch.

### setHttp3StreamWindowBytes / getHttp3StreamWindowBytes

```php
public HttpServerConfig::setHttp3StreamWindowBytes(int $bytes): static
public HttpServerConfig::getHttp3StreamWindowBytes(): int
```

Fenêtre de flow-control QUIC par stream. Positionne les trois :
`initial_max_stream_data_bidi_local`, `_bidi_remote`, `_uni` (style h2o
`http3-input-window-size`). Le `initial_max_data` au niveau connexion est dérivé comme
`window × max_concurrent_streams` (pattern nginx).

Défaut 262_144 (256 KiB). Plage 1_024..1_073_741_824 (1 GiB).

### setHttp3MaxConcurrentStreams / getHttp3MaxConcurrentStreams

```php
public HttpServerConfig::setHttp3MaxConcurrentStreams(int $n): static
public HttpServerConfig::getHttp3MaxConcurrentStreams(): int
```

QUIC `initial_max_streams_bidi`. Équivalent de `http3_max_concurrent_streams` nginx. Défaut 100,
plage 1..1_000_000.

### setHttp3PeerConnectionBudget / getHttp3PeerConnectionBudget

```php
public HttpServerConfig::setHttp3PeerConnectionBudget(int $n): static
public HttpServerConfig::getHttp3PeerConnectionBudget(): int
```

Cap par IP source du nombre de connexions QUIC concurrentes. Protection contre handshake slow-loris
et amplification. Défaut 16, plage 1..4_096. La variable d'env legacy `PHP_HTTP3_PEER_BUDGET`
override encore au spawn du listener.

### setHttp3AltSvcEnabled / isHttp3AltSvcEnabled

```php
public HttpServerConfig::setHttp3AltSvcEnabled(bool $enable): static
public HttpServerConfig::isHttp3AltSvcEnabled(): bool
```

RFC 7838 `Alt-Svc: h3=":<port>"; ma=86400` sur les réponses H1/H2 quand un listener H3 est levé.
Défaut `true`. À désactiver pour un rollout H3 progressif. La variable d'env legacy
`PHP_HTTP3_DISABLE_ALT_SVC` est honorée à `start()`.

## Compression

### setCompressionEnabled / isCompressionEnabled

```php
public HttpServerConfig::setCompressionEnabled(bool $enable): static
public HttpServerConfig::isCompressionEnabled(): bool
```

Master switch. Défaut `true`. Si l'extension est compilée sans `--enable-http-compression`, seul
`false` est accepté — `true` lève une exception.

### setCompressionLevel / getCompressionLevel

```php
public HttpServerConfig::setCompressionLevel(int $level): static
public HttpServerConfig::getCompressionLevel(): int
```

Niveau gzip. Sémantique zlib : 1 = rapide/faible, 9 = lent/fort. Défaut 6.

### setBrotliLevel / getBrotliLevel

```php
public HttpServerConfig::setBrotliLevel(int $level): static
public HttpServerConfig::getBrotliLevel(): int
```

Brotli quality. Plage 0..11. Défaut 4 (production-typique ; quality 11 ≈ 50× plus lent que
quality 4 pour un gain marginal en ratio).

Inerte si l'extension est compilée sans `--enable-brotli` — le pipeline ne sélectionnera jamais
Brotli sans `HAVE_HTTP_BROTLI`, quoi que vous passiez ici.

### setZstdLevel / getZstdLevel

```php
public HttpServerConfig::setZstdLevel(int $level): static
public HttpServerConfig::getZstdLevel(): int
```

Niveau zstd. Plage 1..22. Défaut 3 — production-default de l'équipe zstd (meilleur ratio que
gzip-6 à throughput plus élevé).

### setCompressionMinSize / getCompressionMinSize

```php
public HttpServerConfig::setCompressionMinSize(int $bytes): static
public HttpServerConfig::getCompressionMinSize(): int
```

Seuil de taille de corps — en deçà, pas de compression. Défaut 1024 (1 KiB). Plage 0..16 MiB.

### setCompressionMimeTypes / getCompressionMimeTypes

```php
public HttpServerConfig::setCompressionMimeTypes(array $types): static
public HttpServerConfig::getCompressionMimeTypes(): array
```

Whitelist MIME pour la compression. **Remplace intégralement** le défaut (sémantique `gzip_types`
nginx). Les entrées sont normalisées au setter : les paramètres (`; charset=...`) sont coupés, les
espaces trimmés, tout en minuscules.

Défaut : `["application/javascript", "application/json", "application/xml", "image/svg+xml",
"text/css", "text/html", "text/javascript", "text/plain", "text/xml"]`.

### setRequestMaxDecompressedSize / getRequestMaxDecompressedSize

```php
public HttpServerConfig::setRequestMaxDecompressedSize(int $bytes): static
public HttpServerConfig::getRequestMaxDecompressedSize(): int
```

Cap anti zip-bomb sur les corps décodés (`Content-Encoding: gzip/br/zstd` entrant). En cas de
dépassement : 413. `0` désactive le cap (explicitement — il n'y a pas de illimité-implicite).
Défaut 10_485_760 (10 MiB).

### getSupportedEncodings (static)

```php
public static HttpServerConfig::getSupportedEncodings(): array
```

Liste des codecs compilés dans cette build, dans l'ordre de préférence du serveur. Contient
toujours `"identity"` ; `"gzip"` si `--enable-http-compression` a réussi ; `"br"` / `"zstd"` si la
bibliothèque correspondante est présente à configure-time.

## Buffers

### setWriteBufferSize / getWriteBufferSize

```php
public HttpServerConfig::setWriteBufferSize(int $size): static
public HttpServerConfig::getWriteBufferSize(): int
```

Taille du write-buffer.

## Options protocole

| Méthode | Rôle |
|---------|------|
| `enableHttp2(bool)` / `isHttp2Enabled(): bool` | toggle HTTP/2 (TODO) |
| `enableWebSocket(bool)` / `isWebSocketEnabled(): bool` | toggle WS (TODO) |
| `enableProtocolDetection(bool)` / `isProtocolDetectionEnabled(): bool` | détection auto du protocole sur le listener |

> `enableWebSocket()` est un toggle séparé, pas encore implémenté. WebSocket lui-même fonctionne
> déjà pleinement via
> [`addWebSocketHandler()`](/fr/docs/reference/server/http-server.html#addwebsockethandler)
> et les réglages de la [section WebSocket](#websocket) ci-dessus ; les deux drapeaux sont sans
> rapport.

## TLS

| Méthode | Rôle |
|---------|------|
| `enableTls(bool)` / `isTlsEnabled(): bool` | toggle TLS sur le listener par défaut |
| `setCertificate(string)` / `getCertificate(): ?string` | chemin vers le certificat PEM |
| `setPrivateKey(string)` / `getPrivateKey(): ?string` | chemin vers la clé PEM |

## Gestion du corps

### setAutoAwaitBody / isAutoAwaitBodyEnabled

```php
public HttpServerConfig::setAutoAwaitBody(bool $enable): static
public HttpServerConfig::isAutoAwaitBodyEnabled(): bool
```

Quand `true`, les requêtes non multipart attendent le corps complet avant l'appel du handler. Le
multipart est toujours en streaming. Défaut `true`.

### setBodyStreamingEnabled / isBodyStreamingEnabled

```php
public HttpServerConfig::setBodyStreamingEnabled(bool $enabled): static
public HttpServerConfig::isBodyStreamingEnabled(): bool
```

Streaming des corps de requête dans une file par requête (issue #26) au lieu d'accumuler dans
`req->body`. Les handlers doivent lire via
[`HttpRequest::readBody()`](/fr/docs/reference/server/http-request.html#readbody) ; `getBody()`
lève une exception.

## JSON

### setJsonEncodeFlags / getJsonEncodeFlags

```php
public HttpServerConfig::setJsonEncodeFlags(int $flags): static
public HttpServerConfig::getJsonEncodeFlags(): int
```

Drapeaux `JSON_*` par défaut pour
[`HttpResponse::json()`](/fr/docs/reference/server/http-response.html#json), quand le `$flags=0`
par appel (ou omis).

Défaut : `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`.

`JSON_THROW_ON_ERROR` est silencieusement retiré — une erreur d'encode donne 500 avec corps JSON
d'erreur, l'exception n'est pas propagée.

## Logging / télémétrie

### setLogSeverity / getLogSeverity

```php
public HttpServerConfig::setLogSeverity(\TrueAsync\LogSeverity $level): static
public HttpServerConfig::getLogSeverity(): \TrueAsync\LogSeverity
```

Severity du logger. Défaut `OFF`. Figée au démarrage — pas de changement runtime supporté (modèle
mono-thread lock-free). Voir [`LogSeverity`](/fr/docs/reference/server/log-severity.html).

### setLogStream / getLogStream

```php
public HttpServerConfig::setLogStream(mixed $stream): static
public HttpServerConfig::getLogStream(): mixed
```

Sink du logger. Tout `php_stream` (fichier, `php://stderr`, `php://memory`, user wrapper). Le
logger est désactivé tant que **les deux** ne sont pas positionnés : severity non-OFF ET stream.

### setTelemetryEnabled / isTelemetryEnabled

```php
public HttpServerConfig::setTelemetryEnabled(bool $enabled): static
public HttpServerConfig::isTelemetryEnabled(): bool
```

Parsing W3C Trace Context — `traceparent` / `tracestate` entrants sont attachés à la requête,
disponibles via
[`HttpRequest::getTraceParent/getTraceId/...`](/fr/docs/reference/server/http-request.html).

## État

### isLocked

```php
public HttpServerConfig::isLocked(): bool
```

`true` après passage de la config à `new HttpServer()`. Une config locked refuse tous les setters
avec `HttpServerRuntimeException`.

## Voir aussi

- [Configuration](/fr/docs/server/configuration.html) — guide pas-à-pas
- [`TrueAsync\HttpServer`](/fr/docs/reference/server/http-server.html)
- [`TrueAsync\WebSocket`](/fr/docs/reference/server/websocket.html)
- [`TrueAsync\LogSeverity`](/fr/docs/reference/server/log-severity.html)
