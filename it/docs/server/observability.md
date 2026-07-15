---
layout: docs
lang: it
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /it/docs/server/observability.html
page_title: "TrueAsync Server: Osservabilità"
description: "Statistiche delle richieste cross-worker (getStats), logging strutturato multi-sink (setLogSinks), un access log OpenTelemetry e contatori dell'allocatore a runtime."
---

# Osservabilità

(PHP 8.6+, true_async_server 0.10+)

Tre cose che un server in produzione deve esporre: **quante richieste ha servito e con
quale stato**, **un log che può spedire da qualche parte** e **un record di accesso per
richiesta**. Questa pagina copre tutte e tre. Nessuna è attiva di default — un server inattivo
non paga nulla.

## Statistiche cross-worker: `getStats()`

Attivale con `setStatsEnabled(true)`, poi leggi l'aggregato con `HttpServer::getStats()`:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);          // deve essere impostato prima di start()

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

`getStats()` lancia un'eccezione se le statistiche non sono state abilitate — con esse
disattivate, non viene allocato alcun slab di contatori. La forma:

```php
[
    'enabled'  => true,
    'workers'  => [ 0 => [ /* i contatori di un worker */ ], 1 => [ … ], … ],
    'reactors' => [ /* richieste servite interamente su un reactor di transport */ ],
    'totals'   => [ /* aggregato su worker e reactor */ ],
]
```

`totals` è ciò che uno scraper vuole:

| Contatore | Significato |
|-----------|-------------|
| `total_requests` | ogni richiesta completata |
| `responses_2xx_total` … `responses_5xx_total` | classificate una volta ciascuna, così le quattro sommano a `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | connessioni vive per protocollo (un gauge) |
| `log_records_dropped_total` | righe di log scartate da un ring pieno (vedi sotto) |

Ogni contatore è combinato nel modo che il suo significato consente. I totali monotoni
**sommano, e sopravvivono a un `reload()`** — i totali di un worker in ritiro vengono
ereditati, così uno scraper non vede mai un contatore andare all'indietro solo perché il pool
ha ruotato. I gauge attivi sommano solo sui worker vivi, così l'ultimo conteggio di connessioni
di un worker morto non viene trascinato avanti come un fantasma. Le letture sono lock-free,
quindi l'aggregato può essere stantìo al più di un worker a metà rotazione.

> **Non catturare `$server` in un request handler per chiamare `getStats()` da dentro.**
> Sotto un pool di worker questo crea un ciclo di riferimenti `HttpServer ⇄ handler`, e
> trasferire l'handler nei worker fa crashare il processo
> ([true-async/php-async#196](https://github.com/true-async/php-async/issues/196)). Leggi le
> statistiche da una coroutine separata che possiede `$server`, come sopra — non dall'handler.

## Logging strutturato: `setLogSinks()`

Un singolo record di log fa fan-out verso più **sink** in una volta, ciascuno con la propria
destinazione, formato e soglia di severity:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    // access log strutturato -> un file, come JSON OpenTelemetry
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    // diagnostica leggibile -> la console, colorata
    ['type' => 'stderr', 'format' => 'pretty',
     'category' => 'app', 'level' => LogSeverity::WARN],
]);
```

Questo soppianta lo zucchero sintattico a singolo stream `setLogSeverity()` /
`setLogStream()`. Fino a 8 sink; una spec non valida lancia al momento di `setLogSinks()`, non
allo `start()`.

**Tipi di sink** — `stream`, `file`, `stdout`, `stderr`, `syslog`. Sotto un pool di worker usa
`file` (o `stdout`/`stderr`), mai `stream`: una risorsa stream PHP aperta dal padre non può
passare in un thread worker — il sink resta sul padre e viene saltato nei worker con un avviso
all'avvio. `file` funziona perché ogni worker riapre da sé il percorso (modalità append).

**Formati** — `plain`, `logfmt`, `json` (un oggetto OpenTelemetry-Logs per riga), `pretty`
(una riga di console colorata, con il colore deciso dal fd di destinazione rispettando
`NO_COLOR` / `CLICOLOR_FORCE`), e `template` per un layout personalizzato:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

`{ts}` (ISO-8601) o `{ts:PATTERN}` con un sottoinsieme in stile `date()` (`Y y m d H i s v`),
più `{level}`, `{msg}`, `{attrs}`, `{trace}`, `{span}`; tutto il resto è letterale.

**`syslog`** emette RFC 5424 — octet-framed (RFC 6587) su TCP, un record per datagramma su
`udp` / `udg`:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### L'access log: `'category' => 'access'`

La `category` di un sink instrada i tipi di record: `app` (il default) riceve la diagnostica
del server, `access` riceve esattamente **un record strutturato per richiesta completata**, e
`all` riceve entrambi — così un access log JSON e una console diagnostica pretty coesistono su
un solo server.

I record di accesso usano le stabili convenzioni semantiche HTTP di OpenTelemetry. Una riga dal
formatter `json`, formattata in modo leggibile:

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

Emesso su ogni percorso di completamento — return dell'handler, file statico, `sendFile()`,
compression-reject, dispatch del reactor-pool — su HTTP/1, HTTP/2 e HTTP/3, incluso sotto un
pool di worker. Il trace context W3C viene aggiunto quando la richiesta ne portava uno. I
formatter testuali fanno l'escape dei byte di controllo nei valori, così un campo derivato
dalla richiesta non può falsificare una riga di log.

### Nessun sink richiama PHP

I record sono emessi da callback IO di libuv e da thread reactor di HTTP/3 che non hanno
contesto PHP, quindi il percorso di log non deve mai rientrare nella VM — non c'è un sink
"chiama un callable PHP", per design. Per esportare i log dall'userland, punta un sink su un
file o un socket con `'format' => 'json'` e drenalo dalla tua coroutine. Questa è la forma
dell'async-appender, e mantiene anche la latenza dell'exporter fuori dal percorso della
richiesta.

Il ring di un sink è limitato — il producer non deve mai bloccarsi — quindi una raffica che
supera lo scrittore costa dei record. Questi sono conteggiati in `log_records_dropped_total`
(vedi `getStats()` sopra), non persi silenziosamente.

## Contatori dell'allocatore a runtime: `getRuntimeStats()`

`HttpServer::getRuntimeStats()` riporta gli allocatori interni del server e il traffico dei
topic cross-worker — i contatori che ti permettono di attribuire l'RSS a un sottosistema invece
di tirare a indovinare:

- `conn_arena_live` / `conn_arena_slots` / `conn_arena_chunks` / `conn_arena_bytes` — lo slab
  delle connessioni (un `http_connection_t` per connessione TCP viva).
- `body_pool` — cache per size-class dei corpi di richiesta grandi, con `body_pool_total_bytes`.
- `ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped` — consegna cross-worker dei
  [topic WebSocket](/it/docs/server/websocket.html#topic-publishsubscribe-su-ogni-worker):
  publish passate a un altro worker, worker che il filtro di interesse ha lasciato saltare a un
  publisher, e publish scartate da una mailbox piena (quest'ultima è perdita di dati).

A differenza di `getStats()`, questa non richiede opt-in.

## Contatori HTTP/3: `getHttp3Stats()`

Una voce per listener HTTP/3, con contatori QUIC per listener (`quic_packets_sent`,
`quic_bytes_sent`, conteggi di datagrammi, `poll_rearms`, …). Restituisce un array vuoto su una
build senza `--enable-http3`. Ogni contatore viene letto con un singolo load atomico relaxed,
così il report è internamente consistente anche mentre il thread reactor continua a scrivere.

## Vedi anche

- [Multi-worker](/it/docs/server/workers.html): logging e shutdown sotto un pool
- [Configurazione](/it/docs/server/configuration.html)
- [`HttpServer::getStats()`](/it/docs/reference/server/http-server.html)
