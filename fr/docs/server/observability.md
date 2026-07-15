---
layout: docs
lang: fr
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /fr/docs/server/observability.html
page_title: "TrueAsync Server : Observabilité"
description: "Statistiques de requêtes cross-worker (getStats), logging structuré multi-sink (setLogSinks), un access log OpenTelemetry, et compteurs d'allocateur runtime."
---

# Observabilité

(PHP 8.6+, true_async_server 0.10+)

Trois choses qu'un serveur en production doit exposer : **combien de requêtes il a servies et
avec quel statut**, **un log qu'il peut expédier quelque part**, et **un enregistrement d'accès
par requête**. Cette page couvre les trois. Aucune n'est active par défaut — un serveur inactif
ne paie rien.

## Statistiques cross-worker : `getStats()`

Activez-les avec `setStatsEnabled(true)`, puis lisez l'agrégat avec `HttpServer::getStats()` :

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);          // doit être défini avant start()

$server = new HttpServer($config);
$server->addHttpHandler(fn ($req, $res) => $res->json(['ok' => true]));

spawn(function () use ($server) {
    while ($server->isRunning()) {
        Async\delay(10_000);
        $stats = $server->getStats();
        error_log("requests so far: " . $stats['totals']['total_requests']);
    }
});

$server->start();
```

`getStats()` lève une exception si les stats n'ont pas été activées — désactivées, aucune tranche
de compteurs n'est allouée du tout. La forme :

```php
[
    'enabled'  => true,
    'workers'  => [ 0 => [ /* les compteurs d'un worker */ ], 1 => [ … ], … ],
    'reactors' => [ /* requêtes servies entièrement sur un reactor de transport */ ],
    'totals'   => [ /* repliés sur les workers et les reactors */ ],
]
```

`totals` est ce que veut un scraper :

| Compteur | Signification |
|----------|---------------|
| `total_requests` | chaque requête terminée |
| `responses_2xx_total` … `responses_5xx_total` | classées une fois chacune, donc les quatre somment à `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | connexions vivantes par protocole (une jauge) |
| `log_records_dropped_total` | lignes de log qu'un ring plein a droppées (voir plus bas) |

Chaque compteur est combiné de la façon que sa signification permet. Les totaux monotones
**somment, et survivent à un `reload()`** — les totaux d'un worker qui se retire sont hérités,
donc un scraper ne voit jamais un compteur reculer simplement parce que le pool a tourné. Les
jauges actives ne somment que sur les workers vivants, donc le dernier décompte de connexions d'un
worker mort n'est pas reporté comme un fantôme. Les lectures sont lock-free, donc l'agrégat peut
être périmé d'au plus un worker en cours de rotation.

> **Ne capturez pas `$server` dans un handler de requête pour appeler `getStats()` depuis
> l'intérieur.** Sous un pool de workers cela crée un cycle de références `HttpServer ⇄ handler`,
> et transférer le handler dans les workers fait planter le processus
> ([true-async/php-async#196](https://github.com/true-async/php-async/issues/196)). Lisez les stats
> depuis une coroutine séparée qui possède `$server`, comme ci-dessus — pas depuis le handler.

## Logging structuré : `setLogSinks()`

Un enregistrement de log part vers plusieurs **sinks** à la fois, chacun avec sa propre
destination, son format et son plancher de sévérité :

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    // access log structuré -> un fichier, en JSON OpenTelemetry
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    // diagnostics lisibles -> la console, colorés
    ['type' => 'stderr', 'format' => 'pretty',
     'category' => 'app', 'level' => LogSeverity::WARN],
]);
```

Cela remplace le sucre mono-stream `setLogSeverity()` / `setLogStream()`. Jusqu'à 8 sinks ; une
spec invalide lève une exception au moment de `setLogSinks()`, pas de `start()`.

**Types de sink** — `stream`, `file`, `stdout`, `stderr`, `syslog`. Sous un pool de workers,
utilisez `file` (ou `stdout`/`stderr`), jamais `stream` : une ressource stream PHP ouverte par le
parent ne peut pas traverser vers un thread worker — le sink reste sur le parent et est ignoré
dans les workers avec un avis au démarrage. `file` fonctionne parce que chaque worker rouvre le
chemin lui-même (mode append).

**Formats** — `plain`, `logfmt`, `json` (un objet OpenTelemetry-Logs par ligne), `pretty` (une
ligne console colorée, la couleur décidée d'après le fd cible en respectant `NO_COLOR` /
`CLICOLOR_FORCE`), et `template` pour une mise en forme personnalisée :

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

`{ts}` (ISO-8601) ou `{ts:PATTERN}` avec un sous-ensemble à la `date()` (`Y y m d H i s v`), plus
`{level}`, `{msg}`, `{attrs}`, `{trace}`, `{span}` ; tout le reste est littéral.

**`syslog`** émet du RFC 5424 — octet-framé (RFC 6587) sur TCP, un enregistrement par datagramme
sur `udp` / `udg` :

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### L'access log : `'category' => 'access'`

Le `category` d'un sink route les types d'enregistrement : `app` (le défaut) reçoit les
diagnostics serveur, `access` reçoit exactement **un enregistrement structuré par requête
terminée**, et `all` reçoit les deux — si bien qu'un access log JSON et une console de diagnostics
pretty coexistent sur un même serveur.

Les enregistrements d'accès utilisent les conventions sémantiques HTTP OpenTelemetry stables. Une
ligne du formateur `json`, pretty-printée :

```json
{
    "Timestamp": "2026-07-15T07:03:37.740Z",
    "SeverityNumber": 9,
    "SeverityText": "INFO",
    "Body": "GET /x 200",
    "Attributes": {
        "http.request.method": "GET",
        "url.path": "/x",
        "http.response.status_code": 200,
        "network.protocol.version": "1.1",
        "http.response.body.size": 11,
        "http.server.request.duration": 9.266e-06,
        "client.address": "127.0.0.1",
        "client.port": 42336
    }
}
```

Émis sur chaque chemin de complétion — retour du handler, fichier statique, `sendFile()`,
rejet de compression, dispatch reactor-pool — à travers HTTP/1, HTTP/2 et HTTP/3, y compris sous
un pool de workers. Le contexte de trace W3C est ajouté quand la requête en portait un. Les
formateurs texte échappent les octets de contrôle dans les valeurs, donc un champ dérivé de la
requête ne peut pas forger une ligne de log.

### Aucun sink ne rappelle dans PHP

Les enregistrements sont émis depuis des callbacks IO libuv et depuis des threads reactor HTTP/3
qui n'ont aucun contexte PHP, donc le chemin de log ne doit jamais rentrer à nouveau dans la VM —
il n'y a pas de sink « appeler un callable PHP », par conception. Pour exporter des logs depuis
l'userland, pointez un sink vers un fichier ou un socket avec `'format' => 'json'` et drainez-le
depuis votre propre coroutine. C'est la forme async-appender, et cela garde aussi la latence de
l'exporteur hors du chemin de requête.

Le ring d'un sink est borné — le producteur ne doit jamais bloquer — donc une rafale qui dépasse
l'écrivain coûte des enregistrements. Ceux-ci sont comptés dans `log_records_dropped_total` (voir
`getStats()` ci-dessus), pas perdus silencieusement.

## Compteurs d'allocateur runtime : `getRuntimeStats()`

`HttpServer::getRuntimeStats()` rapporte les allocateurs internes du serveur et le trafic de
topics cross-worker — les compteurs qui vous laissent attribuer la RSS à un sous-système plutôt que
de deviner :

- `conn_arena_live` / `conn_arena_slots` / `conn_arena_chunks` / `conn_arena_bytes` — la tranche
  de connexions (un `http_connection_t` par connexion TCP vivante).
- `body_pool` — cache par classe de taille des gros corps de requête, avec `body_pool_total_bytes`.
- `ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped` — livraison de
  [topic WebSocket](/fr/docs/server/websocket.html#topics-publishsubscribe-across-every-worker)
  cross-worker : publishes remis à un autre worker, workers que le filtre d'intérêt a laissé un
  publisher sauter, et publishes qu'une mailbox pleine a droppés (ce dernier est une perte de
  données).

Contrairement à `getStats()`, celui-ci ne nécessite aucun opt-in.

## Compteurs HTTP/3 : `getHttp3Stats()`

Une entrée par listener HTTP/3, avec des compteurs QUIC par listener (`quic_packets_sent`,
`quic_bytes_sent`, décomptes de datagrammes, `poll_rearms`, …). Renvoie un tableau vide sur un
build sans `--enable-http3`. Chaque compteur est lu avec un load atomique relaxed individuel, donc
le rapport est cohérent en interne même pendant que le thread reactor continue d'écrire.

## Voir aussi

- [Multi-worker](/fr/docs/server/workers.html) : logging et arrêt sous un pool
- [Configuration](/fr/docs/server/configuration.html)
- [`HttpServer::getStats()`](/fr/docs/reference/server/http-server.html)
