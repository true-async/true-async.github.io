---
layout: docs
lang: de
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /de/docs/server/observability.html
page_title: "TrueAsync Server: Observability"
description: "Cross-Worker-Request-Statistiken (getStats), Multi-Sink-Structured-Logging (setLogSinks), ein OpenTelemetry-Access-Log und Runtime-Allocator-Counter."
---

# Observability

(PHP 8.6+, true_async_server 0.10+)

Drei Dinge muss ein Server in Produktion nach außen sichtbar machen: **wie viele Anfragen er
mit welchem Status bedient hat**, **ein Log, das er irgendwohin verschicken kann**, und **einen
Access-Record pro Anfrage**. Diese Seite behandelt alle drei. Keines davon ist standardmäßig
aktiv — ein idle Server zahlt nichts.

## Cross-Worker-Statistiken: `getStats()`

Mit `setStatsEnabled(true)` aktivieren, dann das Aggregat über `HttpServer::getStats()` auslesen:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);          // muss vor start() gesetzt werden

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

`getStats()` wirft, sofern die Statistiken nicht aktiviert wurden — sind sie aus, wird gar kein
Counter-Slab allokiert. Die Struktur:

```php
[
    'enabled'  => true,
    'workers'  => [ 0 => [ /* Counter eines Workers */ ], 1 => [ … ], … ],
    'reactors' => [ /* vollständig auf einem Transport-Reactor bediente Anfragen */ ],
    'totals'   => [ /* über Worker und Reactoren zusammengefaltet */ ],
]
```

`totals` ist das, was ein Scraper will:

| Counter | Bedeutung |
|---------|-----------|
| `total_requests` | jede abgeschlossene Anfrage |
| `responses_2xx_total` … `responses_5xx_total` | je einmal klassifiziert, sodass die vier `total_requests` ergeben |
| `conns_active_h1` / `_h2` / `_h3` | aktive Verbindungen pro Protokoll (ein Gauge) |
| `log_records_dropped_total` | Log-Zeilen, die ein voller Ring verworfen hat (siehe unten) |

Jeder Counter wird so kombiniert, wie es seine Bedeutung zulässt. Monotone Totals **summieren
sich und überleben ein `reload()`** — die Totals eines auslaufenden Workers werden vererbt,
sodass ein Scraper einen Counter nie rückwärts laufen sieht, nur weil der Pool rotiert hat.
Aktive Gauges summieren nur über lebende Worker, sodass die letzte Verbindungszahl eines toten
Workers nicht als Phantom weitergetragen wird. Reads sind lock-free, sodass das Aggregat um
höchstens einen Worker mitten in der Rotation veraltet sein kann.

> **Schließen Sie in einem Request-Handler nicht über `$server`, um `getStats()` von innen
> aufzurufen.** Unter einem Worker-Pool erzeugt das einen `HttpServer ⇄ Handler`-Referenzzyklus,
> und der Transfer des Handlers in die Worker bringt den Prozess zum Absturz
> ([true-async/php-async#196](https://github.com/true-async/php-async/issues/196)). Lesen Sie die
> Statistiken aus einer separaten Coroutine, die `$server` besitzt, wie oben — nicht aus dem
> Handler.

## Structured Logging: `setLogSinks()`

Ein Log-Record fächert sich zugleich auf mehrere **Sinks** auf, jeder mit eigenem Ziel, Format
und Severity-Floor:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    // strukturiertes Access-Log -> eine Datei, als OpenTelemetry-JSON
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    // menschenlesbare Diagnostik -> die Konsole, farbig
    ['type' => 'stderr', 'format' => 'pretty',
     'category' => 'app', 'level' => LogSeverity::WARN],
]);
```

Das löst die Single-Stream-Zucker `setLogSeverity()` / `setLogStream()` ab. Bis zu 8 Sinks; eine
ungültige Spezifikation wirft zum Zeitpunkt von `setLogSinks()`, nicht bei `start()`.

**Sink-Typen** — `stream`, `file`, `stdout`, `stderr`, `syslog`. Unter einem Worker-Pool `file`
(oder `stdout`/`stderr`) nutzen, niemals `stream`: eine vom Parent geöffnete PHP-Stream-Ressource
kann nicht in einen Worker-Thread übergehen — der Sink bleibt auf dem Parent und wird in den
Workern mit einem Startup-Hinweis übersprungen. `file` funktioniert, weil jeder Worker den Pfad
selbst wieder öffnet (Append-Modus).

**Formate** — `plain`, `logfmt`, `json` (ein OpenTelemetry-Logs-Objekt pro Zeile), `pretty`
(eine farbige Konsolenzeile, Farbe anhand des Ziel-fd entschieden, unter Beachtung von `NO_COLOR`
/ `CLICOLOR_FORCE`) und `template` für ein eigenes Layout:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

`{ts}` (ISO-8601) oder `{ts:PATTERN}` mit einem `date()`-artigen Subset (`Y y m d H i s v`), dazu
`{level}`, `{msg}`, `{attrs}`, `{trace}`, `{span}`; alles andere ist literal.

**`syslog`** emittiert RFC 5424 — Octet-Framed (RFC 6587) über TCP, ein Record pro Datagramm auf
`udp` / `udg`:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### Das Access-Log: `'category' => 'access'`

Die `category` eines Sinks routet die Record-Arten: `app` (der Default) erhält
Server-Diagnostik, `access` erhält genau **einen strukturierten Record pro abgeschlossener
Anfrage**, und `all` erhält beides — sodass ein JSON-Access-Log und eine Pretty-Diagnostik-Konsole
auf einem Server koexistieren.

Access-Records verwenden stabile OpenTelemetry-HTTP-Semantic-Conventions. Eine Zeile aus dem
`json`-Formatter, pretty-printed:

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

Emittiert auf jedem Abschlusspfad — Handler-Return, statische Datei, `sendFile()`,
Compression-Reject, Reactor-Pool-Dispatch — über HTTP/1, HTTP/2 und HTTP/3, auch unter einem
Worker-Pool. Der W3C-Trace-Context wird hinzugefügt, wenn die Anfrage einen trug. Text-Formatter
escapen Control-Bytes in Werten, sodass ein aus der Anfrage abgeleitetes Feld keine Log-Zeile
fälschen kann.

### Kein Sink ruft zurück nach PHP

Records werden aus libuv-IO-Callbacks und aus HTTP/3-Reactor-Threads emittiert, die keinen
PHP-Kontext haben, sodass der Log-Pfad die VM niemals erneut betreten darf — es gibt bewusst
keinen „ruf ein PHP-Callable auf"-Sink. Um Logs aus Userland zu exportieren, richten Sie einen
Sink auf eine Datei oder einen Socket mit `'format' => 'json'` und drainen ihn aus Ihrer eigenen
Coroutine. Das ist die Async-Appender-Form, und sie hält zugleich die Exporter-Latenz vom
Request-Pfad fern.

Der Ring eines Sinks ist beschränkt — der Producer darf niemals blockieren — sodass ein Burst,
der den Writer überholt, Records kostet. Diese werden in `log_records_dropped_total` gezählt
(siehe `getStats()` oben), nicht stillschweigend verloren.

## Runtime-Allocator-Counter: `getRuntimeStats()`

`HttpServer::getRuntimeStats()` meldet die server-eigenen internen Allocatoren und den
Cross-Worker-Topic-Traffic — die Counter, mit denen sich RSS einem Subsystem zuschreiben lässt,
statt zu raten:

- `conn_arena_live` / `conn_arena_slots` / `conn_arena_chunks` / `conn_arena_bytes` — der
  Connection-Slab (ein `http_connection_t` pro aktiver TCP-Verbindung).
- `body_pool` — Per-Size-Class-Cache großer Request-Bodies, mit `body_pool_total_bytes`.
- `ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped` — Cross-Worker-Zustellung von
  [WebSocket-Topics](/de/docs/server/websocket.html#topics-publishsubscribe-across-every-worker):
  an einen anderen Worker übergebene Publishes, Worker, die der Interest-Filter einem Publisher
  überspringen ließ, und Publishes, die eine volle Mailbox verworfen hat (letzteres ist
  Datenverlust).

Anders als `getStats()` braucht dieser kein Opt-in.

## HTTP/3-Counter: `getHttp3Stats()`

Ein Eintrag pro HTTP/3-Listener, mit Per-Listener-QUIC-Countern (`quic_packets_sent`,
`quic_bytes_sent`, Datagramm-Counts, `poll_rearms`, …). Liefert ein leeres Array auf einem Build
ohne `--enable-http3`. Jeder Counter wird mit einem einzelnen Relaxed-Atomic-Load gelesen, sodass
der Report intern konsistent ist, selbst während der Reactor-Thread weiterschreibt.

## Siehe auch

- [Multi-Worker](/de/docs/server/workers.html): Logging und Shutdown unter einem Pool
- [Konfiguration](/de/docs/server/configuration.html)
- [`HttpServer::getStats()`](/de/docs/reference/server/http-server.html)
</content>
</invoke>
