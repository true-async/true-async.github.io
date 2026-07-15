---
layout: docs
lang: fr
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /fr/docs/server/observability.html
page_title: "TrueAsync Server : Observabilité"
description: "Statistiques de requêtes avec getStats(), un endpoint Prometheus /metrics et Grafana, logging structuré et access log avec setLogSinks(), et compteurs runtime."
---

# Observabilité

(PHP 8.6+, true_async_server 0.10+)

Le serveur peut rapporter des statistiques de requêtes, écrire des logs structurés et émettre un
enregistrement d'access log par requête. Tout ce qui est décrit ici est désactivé par défaut.

## Statistiques de requêtes : `getStats()`

Activez les statistiques avec `setStatsEnabled(true)`, puis lisez-les avec `getStats()` :

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);

$server = new HttpServer($config);
$server->addHttpHandler(fn ($req, $res) => $res->json(['ok' => true]));

$server->start();
```

`getStats()` renvoie les compteurs par worker et un total combiné. Il lève une exception si les
statistiques n'ont pas été activées.

```php
[
    'enabled' => true,
    'workers' => [ 0 => [ /* les compteurs d'un worker */ ], 1 => [ … ] ],
    'totals'  => [ /* somme sur tous les workers */ ],
]
```

`totals` contient :

| Compteur | Signification |
|----------|---------------|
| `total_requests` | requêtes terminées |
| `responses_2xx_total` … `responses_5xx_total` | réponses par classe de statut ; les quatre somment à `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | connexions ouvertes par protocole |

Les totaux continuent de croître à travers un `reload()` ; les compteurs de connexions ne suivent
que les workers vivants.

## Prometheus et Grafana

Le serveur n'expose pas lui-même un endpoint `/metrics` — `getStats()` vous rend un simple tableau
PHP, que vous transformez en ce qu'attend votre stack de monitoring. Pour Prometheus, cela veut
dire un petit handler qui met en forme le tableau au [format d'exposition
texte](https://prometheus.io/docs/instrumenting/exposition_formats/) :

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) use ($server) {
    if ($req->getPath() === '/metrics') {
        $t = $server->getStats()['totals'];

        $body  = "# HELP http_requests_total Requests completed.\n";
        $body .= "# TYPE http_requests_total counter\n";
        $body .= "http_requests_total {$t['total_requests']}\n";

        $body .= "# HELP http_responses_total Responses by status class.\n";
        $body .= "# TYPE http_responses_total counter\n";
        foreach (['2xx', '3xx', '4xx', '5xx'] as $class) {
            $body .= "http_responses_total{class=\"{$class}\"} {$t["responses_{$class}_total"]}\n";
        }

        $body .= "# HELP http_connections_active Open connections by protocol.\n";
        $body .= "# TYPE http_connections_active gauge\n";
        foreach (['h1', 'h2', 'h3'] as $proto) {
            $body .= "http_connections_active{protocol=\"{$proto}\"} {$t["conns_active_{$proto}"]}\n";
        }

        $res->setHeader('Content-Type', 'text/plain; version=0.0.4')->end($body);
        return;
    }

    $res->json(['ok' => true]);
});

$server->start();
```

Pointez Prometheus vers l'endpoint :

```yaml
scrape_configs:
  - job_name: 'true-async-server'
    static_configs:
      - targets: ['your-server:8080']
```

Les compteurs vivent dans une unique table à l'échelle du processus, que chaque worker met à jour
et que `getStats()` lit, si bien qu'un seul scrape couvre tout le pool :

![Flux des métriques des workers vers Grafana](/diagrams/en/server-observability/metrics-flow.svg)

À partir de là, Grafana trace le débit de requêtes, les classes de statut et les connexions
ouvertes comme n'importe quelle autre source Prometheus :

![Tableau de bord Grafana sur les métriques du serveur](/diagrams/en/server-observability/grafana-dashboard.png)

## Logging : `setLogSinks()`

`setLogSinks()` envoie chaque enregistrement de log vers une ou plusieurs destinations, chacune avec
son propre format et son niveau minimum :

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::WARN],
]);
```

Jusqu'à 8 destinations. Cela remplace le mono-stream `setLogSeverity()` / `setLogStream()`.

**Où va un enregistrement** — `type` vaut `file`, `stdout`, `stderr`, `syslog` ou `stream`. Avec un
pool de workers, utilisez `file` (ou `stdout` / `stderr`) : une ressource `stream` ouverte par le
parent ne peut pas être partagée avec les threads worker, elle n'est donc utilisée que sur le
parent.

**À quoi ça ressemble** — `format` vaut `plain`, `logfmt`, `json`, `pretty` (une ligne de console
colorée) ou `template` :

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

Placeholders : `{ts}` ou `{ts:PATTERN}` (à la `date()` : `Y y m d H i s v`), `{level}`, `{msg}`,
`{attrs}`, `{trace}`, `{span}`. Tout le reste est imprimé tel quel.

Une destination `syslog` parle RFC 5424 sur TCP, UDP ou un socket unix :

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### Access log

Réglez `category` pour choisir ce que reçoit une destination : `app` (le défaut) reçoit les
diagnostics serveur, `access` reçoit un enregistrement par requête terminée, `all` reçoit les deux.
Ainsi un access log JSON et une console de diagnostics lisible peuvent tourner côte à côte.

Les enregistrements d'accès suivent les conventions HTTP OpenTelemetry. Un enregistrement `json` :

```json
{
    "Timestamp": "2026-07-15T07:03:37.740Z",
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

Un enregistrement est écrit pour chaque requête en HTTP/1, HTTP/2 et HTTP/3, y compris sous un pool
de workers. Si la requête portait un contexte de trace W3C, il est inclus.

## Compteurs runtime : `getRuntimeStats()`

`getRuntimeStats()` rapporte les pools mémoire propres au serveur et le trafic de topics WebSocket
cross-worker — utile pour attribuer une croissance mémoire à un sous-système. Aucun opt-in
nécessaire. Les clés incluent l'arène de connexions (`conn_arena_*`), le pool de corps de requête
(`body_pool*`) et la livraison de topics (`ws_topic_posted` / `ws_topic_skipped` /
`ws_topic_dropped`).

## Compteurs HTTP/3 : `getHttp3Stats()`

`getHttp3Stats()` renvoie une entrée par listener HTTP/3 avec ses compteurs QUIC
(`quic_packets_sent`, `quic_bytes_sent`, décomptes de datagrammes, et ainsi de suite). Il renvoie un
tableau vide sur un build sans `--enable-http3`.

## Voir aussi

- [Multi-worker](/fr/docs/server/workers.html) : logging et arrêt sous un pool
- [Configuration](/fr/docs/server/configuration.html)
- [`HttpServer::getStats()`](/fr/docs/reference/server/http-server.html)
