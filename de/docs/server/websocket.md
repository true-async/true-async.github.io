---
layout: docs
lang: de
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /de/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): Full-Duplex-Verbindungen über RFC 6455, Cross-Worker-Pub/Sub-Topics, Backpressure, Keepalive, Subprotokoll-Aushandlung, permessage-deflate."
---

# WebSocket

(PHP 8.6+, true_async_server 0.9+)

`HttpServer::addWebSocketHandler()` registriert einen Handler für Full-Duplex-Verbindungen über
RFC 6455.

Eine Verbindung startet als gewöhnliche HTTP-Anfrage, und dann bittet der Client den Server, sie
auf derselben TCP-Verbindung auf ein anderes Protokoll umzuschalten: das ist ein Upgrade. Der
Server antwortet mit Status `101 Switching Protocols`, und ab diesem Punkt trägt dieselbe
Verbindung WebSocket, nicht mehr HTTP. Unterstützt werden:

- Upgrade von HTTP/1.1 (der klassische `Connection: Upgrade`-Header).
- Upgrade von HTTP/2 (RFC 8441 Extended CONNECT).
- `wss://` (WebSocket über TLS).
- permessage-deflate (RFC 7692), Komprimierung auf Nachrichtenebene.
- [Pub/Sub-Topics](#topics-publishsubscribe-across-every-worker), die jeden Worker des Prozesses
  erreichen, sodass ein Chat keinen Single-Worker-Server und keinen externen Broker braucht.

> Die Implementierung wird gegen die Autobahn|Testsuite-Konformitätssuite verifiziert und besteht
> alle 246 Tests der Kategorie `behavior`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\WebSocket;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
);

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});

// Erforderlich: der Server verweigert den Start ohne HTTP-Handler, und dieser
// beantwortet die Anfragen, die keine Upgrades sind.
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(404)->end();
});

$server->start();
```

Die Registrierung des Handlers ist das, was WebSocket einschaltet — es gibt keinen separaten
Schalter, den man umlegen müsste, genau wie bei HTTP/2 und `addHttp2Handler()`.

> `HttpServerConfig::enableWebSocket()` ist ein Legacy-Umschalter, nicht dieser Schalter. Wird ihm
> `true` übergeben, wirft er `HttpServerRuntimeException` und verweist Sie auf
> `addWebSocketHandler()` — registrieren Sie stattdessen den Handler.

Jede Verbindung wird von ihrer eigenen Coroutine bedient, dasselbe Per-Request-Modell wie bei HTTP.
Ein Handler, der wirft, reißt den Worker nicht mit sich: die Exception wird geloggt, und dem Peer
wird es im Protokoll mitgeteilt — ein HTTP-Status, falls der Wurf dem Upgrade zuvorkam, ein
`CLOSE 1011`, sobald die Session live war.

Der Handler wird immer mit drei Argumenten aufgerufen, und PHP verwirft die, die Sie nicht
deklariert haben — sodass `function (WebSocket $ws)`, `function (WebSocket $ws, HttpRequest $req)`
und die Drei-Parameter-Form alle gültig sind. Deklarieren Sie nur, was Sie nutzen.

## Lebenszyklus

Eine Verbindung bleibt offen, bis die Handler-Coroutine zurückkehrt. Wenn der Handler einfach
endet (zum Beispiel, weil die `recv()`/`foreach`-Schleife am Ende `null` erhalten hat), schließt
der Server die Verbindung automatisch mit Code `1000 Normal`. Ein explizites `close()` vor
`return` ist nur nötig, wenn Sie einen anderen Code oder einen eigenen Reason-Text wollen.

## Nachrichten empfangen: `recv()` und `foreach`

```php
public WebSocket::recv(): ?WebSocketMessage
```

Suspendiert die Coroutine, bis die nächste Nachricht eintrifft oder die Verbindung schließt.
Liefert eine [`WebSocketMessage`](/de/docs/reference/server/websocket.html#websocketmessage) oder
`null`, wenn der Client die Verbindung sauber geschlossen hat (ein normaler Close-Code oder eine
Trennung ohne explizites CLOSE-Frame):

```php
while (($msg = $ws->recv()) !== null) {
    handle($msg->data, $msg->binary);
}
```

`WebSocket` implementiert `\Iterator`, sodass sich dieselbe Schleife kürzer als
`foreach ($ws as $msg) { ... }` schreiben lässt. Ein sauberer Close beendet einfach die
`foreach`-Schleife; ein Close mit Fehler wirft `WebSocketClosedException` direkt aus der Schleife.

Lesen Sie Nachrichten nur von einer Stelle aus: Wenn Sie `recv()` von zwei Coroutinen parallel auf
derselben Verbindung aufrufen, wirft der zweite Aufruf `WebSocketConcurrentReadException`. Wenn Sie
Nachrichten an mehrere Handler verteilen müssen, behalten Sie eine `recv()`-Schleife und verteilen
Sie selbst von dort aus.

## Nachrichten senden: `send()`, `trySend()`

`send()` und `sendBinary()` können gefahrlos von jeder Coroutine aus aufgerufen werden, auch von
mehreren gleichzeitig: der Server stellt sicher, dass Daten aus verschiedenen Aufrufen niemals auf
dem Draht vermischt werden.

```php
$ws->send('text frame');       // Text MUSS gültiges UTF-8 sein
$ws->sendBinary($binaryData);  // Binärdaten unterliegen keiner Kodierungsbeschränkung
```

Normalerweise kehren diese Funktionen sofort zurück. Wenn der Client langsam liest und der
Sendepuffer sich füllt, suspendiert die Coroutine und setzt fort, sobald der Client einen Teil des
Puffers geleert hat. Zieht sich das Warten länger hin als `write_timeout_ms`, wird eine
`WebSocketBackpressureException` geworfen, und der Handler entscheidet, was zu tun ist: Nachricht
verwerfen, Verbindung schließen oder erneut versuchen.

Für das Broadcasten einer Nachricht an viele Clients, wobei ein langsamer Client die anderen nicht
aufhalten soll, gibt es nicht-blockierende Varianten:

```php
if (!$ws->trySend($text)) {
    // der Puffer dieses Clients ist voll, die Nachricht wurde NICHT gesendet, der Client hinkt hinterher
}
```

`trySend()`/`trySendBinary()` suspendieren die Coroutine niemals: sie liefern sofort `true`, wenn
die Nachricht akzeptiert wurde, und `false`, wenn der Puffer voll ist (in diesem Fall wird die
Nachricht einfach nicht gesendet). Die Puffergröße wird durch
[`HttpServerConfig::setStreamWriteBufferBytes()`](/de/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
festgelegt (`0` hebt das Limit auf: `trySend()` sendet dann immer und liefert `true`).

## Topics: Publish/Subscribe über jeden Worker {#topics-publishsubscribe-across-every-worker}

Ein Worker ist ein Thread mit seinem eigenen PHP-Kontext. Der naheliegende Weg, einen Chat zu
bauen — ein Array von Verbindungen halten und darüber iterieren — kann daher immer nur die Peers
*eines* Workers erreichen, weshalb ein solcher Chat auf `setWorkers(1)` laufen musste.

Topics beheben das. Sie leben im Server, nicht in Ihrem Handler: jeder Worker indexiert die
Verbindungen, die ihm gehören, und ein `publish()` wird an jeden Worker übergeben, der dann an
seine eigenen Sockets zustellt. Kein Redis, kein Message-Broker, kein Single-Worker-Server.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = ltrim($req->getPath(), '/') ?: 'lobby';

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", $msg->data);   // erreicht Subscriber auf ALLEN Workern
    }
});
```

Ein Topic wird über den **Namen, an der Aufrufstelle** adressiert. Es gibt kein Topic-Objekt,
das man beschaffen, halten oder in einen Handler übergeben müsste.

### Filter folgen MQTT

Ebenen werden durch `/` getrennt, `+` matcht genau eine Ebene, und ein abschließendes `#` matcht
den Rest:

| Filter | Empfängt |
|--------|----------|
| `chat/general` | genau dieses Topic |
| `chat/+/typing` | `chat/general/typing`, `chat/random/typing` — eine Ebene, beliebiger Wert |
| `user/42/#` | `user/42`, `user/42/presence`, `user/42/dm/7` — den gesamten Subtree |

Wildcards gehören zu *Subscriptions*. Ein **Publish-Topic muss konkret sein**: eine an ein Muster
gefächerte Nachricht hat kein wohldefiniertes Ziel, sodass `publish('chat/+/typing', …)`
`WebSocketException` wirft. Filter dürfen bis zu 128 Ebenen tief sein.

### Die API

```php
$ws->subscribe('chat/+/typing');            // idempotent
$ws->unsubscribe('chat/+/typing');          // idempotent
$ws->getTopics();                           // string[] — die Filter dieser Verbindung

$ws->publish('chat/general', $text);        // Text, an jeden Worker
$ws->publishBinary('chat/general', $bytes); // binäres Pendant

$ws->subscriberCount('chat/general');       // über alle Worker, Wildcards inklusive
```

`publish()` **suspendiert nie**. Ein Peer, dessen ausgehende Queue verstopft ist, verwirft die
Nachricht, statt die Zustellung an den Rest des Topics aufzuhalten — dieselbe Semantik wie
`trySend()`. Wenn Sie eine Zustellgarantie brauchen, senden Sie stattdessen mit `send()` an die
eine Verbindung. Ein Subscriber, den mehrere seiner eigenen Filter matchen, erhält dennoch genau
eine Kopie.

`$excludeSelf` ist standardmäßig `true` — der „alle außer dem Sender"-Fall, den ein Chat will:

```php
$ws->publish('chat/general', $msg->data);                      // der Sender bekommt sie nicht zurück
$ws->publish('chat/general', $msg->data, excludeSelf: false);  // der Sender bekommt sie auch
```

Der Rückgabewert ist die Zahl der Subscriber, die **nur auf dem aufrufenden Worker** bedient
wurden. Die Zustellung an die anderen Worker ist asynchron und kann an der Aufrufstelle nicht
gezählt werden, es ist also eine lokale Zahl, keine prozessweite. `subscriberCount()` ist die
prozessweite — aber da jeder Worker mit seiner eigenen Zahl antwortet und die Antworten summiert
werden, ist es ein Snapshot statt eines Live-Counters, und ein Worker, der nicht rechtzeitig
antwortet, bleibt außen vor.

Eine schließende Verbindung meldet sich von allem selbst ab.

### Limits

Beide sind standardmäßig aus, was jeder selbst gehostete Broker so ausliefert (EMQX
`max_subscriptions` / `messages_rate`, NATS `max_subs`): nur die Anwendung weiß, wie viele Topics
sie braucht.

```php
$config
    ->setWsMaxSubscriptions(32)          // distinkte Filter, die eine Verbindung halten darf
    ->setWsPublishRateLimit(50, burst: 100);
```

Setzen Sie `setWsMaxSubscriptions()`, sobald Client-Eingaben `subscribe()` erreichen — etwa
`$ws->subscribe($msg->data)` — damit ein Peer den Topic-Baum des Workers nicht endlos wachsen
lassen kann. Über dem Cap wirft `subscribe()` `WebSocketException`, und die Verbindung bleibt
bestehen.

`setWsPublishRateLimit()` ist ein Per-Connection-Token-Bucket. `publish()` ist der eine
WebSocket-Aufruf, den ein unprivilegierter Peer in Arbeit auf *jedem* Worker im Prozess verwandeln
kann — `send()` und `trySend()` berühren immer nur den eigenen Socket. Ungedrosselt füllt ein
Client, der auf einer weitergereichten Nachricht loopt, den Inbox jedes Workers, und die darauf
folgenden Drops reißen auch den Traffic *anderer* Topics mit. Über der Rate wirft `publish()`
`WebSocketBackpressureException`, und die Verbindung bleibt bestehen: dem Sender wird es
mitgeteilt, statt dass die Nachricht in einer vollen Mailbox verschwindet, wo sie niemand sieht.

`$burst` ist die Bucket-Tiefe in Nachrichten — wie weit ein Handler der Dauerrate vorauslaufen
darf. `0` bedeutet den Wert einer Sekunde.

```php
try {
    $ws->publish("chat/$room", $msg->data);
} catch (WebSocketBackpressureException) {
    $ws->send('you are sending too fast');
} catch (WebSocketException $e) {
    $ws->send('bad topic: ' . $e->getMessage());
}
```

### Was es kostet

Jeder Worker fasst seine Subscriptions in einem Counting-Bloom-Filter von Topic-Präfixen
zusammen, und ein Publisher überspringt die Worker, die nachweislich keinen Subscriber halten,
statt alle zu wecken. Ein Publish an ein Topic, das niemand im Prozess hört, kostet null
Cross-Worker-Wakeups. `HttpServer::getRuntimeStats()` meldet das Ergebnis — `ws_topic_posted`,
`ws_topic_skipped` (der Filter, der sich bezahlt macht) und `ws_topic_dropped` (die Mailbox eines
Workers war voll: das ist Datenverlust).

Topics funktionieren auf jedem WebSocket-Transport, nicht nur auf Plaintext-HTTP/1 — über TLS,
über HTTP/2 Extended CONNECT und mit permessage-deflate, wo ein `publish()` einen komprimierten
und einen unkomprimierten Peer nebeneinander bedient, jeden mit dem Framing, das er ausgehandelt
hat.

## Die Adresse des Clients

```php
$ws->getRemoteAddress();   // "203.0.113.7" oder "2001:db8::1" — nackte IP, kein Port
$ws->getRemotePort();      // 54321
```

`getRemoteAddress()` liefert die **nackte IP**: keinen Port und keine Klammern um ein
IPv6-Literal — dieselbe Form wie `$_SERVER['REMOTE_ADDR']`, sodass sie sich direkt in
`filter_var(…, FILTER_VALIDATE_IP)`, eine ACL oder einen Rate-Limiter einspeisen lässt. Beide
liefern `null` auf einem Unix-Socket-Listener, der keinen IP-Peer hat.

Das ist der Peer der TCP-Verbindung. Sie wird **nicht** aus `X-Forwarded-For` abgeleitet —
hinter einem Proxy parsen Sie diesen Header selbst, und nur, wenn Sie dem Proxy vertrauen, der
ihn gesetzt hat.

> **Breaking Change.** `getRemoteAddress()` lieferte früher `"host:port"` (und `""`, wenn es
> keinen IP-Peer gab). Jetzt liefert es die nackte IP und `null`. Nutzen Sie `getRemotePort()`
> für den Port.

## Verbindung schließen: `close()`, `isClosed()`

```php
$ws->close(WebSocketCloseCode::NORMAL, 'bye');
```

Beginnt, die Verbindung zu schließen. Kann gefahrlos mehrfach aufgerufen werden: spätere Aufrufe
sind No-ops. Der Close-Code ist ein Wert von
[`WebSocketCloseCode`](/de/docs/reference/server/websocket.html#websocketclosecode) oder ein
Integer im Bereich `4000..4999` (reserviert für anwendungsspezifische Codes). `$reason` nimmt
UTF-8-Text, bis zu 123 Bytes.

`isClosed()` liefert `true` nach `close()` oder nachdem der Client sein eigenes Close-Signal
gesendet hat.

## Ping und Keepalive

```php
$ws->ping('optional payload');   // bis zu 125 Bytes, RFC 6455 §5.5
```

Anwendungscode muss das selten von Hand aufrufen: der Keepalive-Timer des Servers
(`HttpServerConfig::setWsPingIntervalMs()`) sendet PINGs automatisch. Antwortet der Client nicht
rechtzeitig (`setWsPongTimeoutMs()`), schließt der Server die Verbindung von sich aus. Siehe
[Konfiguration](/de/docs/server/configuration.html#websocket) für die Details.

## Subprotokoll-Aushandlung und Ablehnung: `WebSocketUpgrade`

Standardmäßig erhält der Handler nur `WebSocket $ws`. Um selbst zu entscheiden, ob die Verbindung
angenommen wird und welches Subprotokoll gewählt wird, registrieren Sie den Handler mit drei
Parametern: der Server erkennt die Parameteranzahl und übergibt in diesem Fall ein drittes Objekt,
`WebSocketUpgrade`:

```php
use TrueAsync\WebSocket;
use TrueAsync\HttpRequest;
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    $offered = $u->getOfferedSubprotocols();   // aus dem Sec-WebSocket-Protocol-Header

    if (!in_array('chat.v2', $offered, true)) {
        $u->reject(400, 'unsupported subprotocol');
        return;
    }

    $u->setSubprotocol('chat.v2');   // muss vor return oder reject() aufgerufen werden

    foreach ($ws as $msg) {
        // ...
    }
});
```

`WebSocketUpgrade` lebt vom Moment des Handler-Aufrufs bis zu `reject()` oder einem erfolgreichen
`return` (an diesem Punkt schließt der Server den Handshake mit dem gewählten Subprotokoll ab).
Danach wirft jeder Aufruf auf diesem Objekt: die Antwort ist bereits auf dem Draht, und das
Subprotokoll kann nicht mehr geändert werden.

`getOfferedExtensions()` liefert die Liste der vom Client angebotenen Extensions.
permessage-deflate (RFC 7692, Nachrichtenkomprimierung) wird vom Server selbst über
`HttpServerConfig::setWsPermessageDeflate()` ausgehandelt; die übrigen angebotenen Werte sind nur
informativ.

## Close-Codes und Exceptions

`WebSocketCloseCode` ist ein Enum mit den Standard-RFC-6455-Close-Codes (`NORMAL`, `GOING_AWAY`,
`PROTOCOL_ERROR`, `MESSAGE_TOO_BIG` und andere). Die Exception-Hierarchie:

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException            // auch: ungültiger Topic-Filter, Subscription-Cap
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // langsamer Leser — oder publish() über seinem Rate-Limit
              └── WebSocketConcurrentReadException  // zweiter recv() parallel
```

Ein sauberer Close durch den Client zeigt sich als `null` von `recv()`, nicht als Exception. Eine
Exception wird nur bei einem Protokollfehler oder einem Close mit explizitem Fehlercode geworfen;
`$closeCode`/`$closeReason` tragen den Grund. Siehe die
[Referenz](/de/docs/reference/server/websocket.html) für Details.

## Konfiguration

| Methode | Standard | Zweck |
|--------|---------|---------|
| `setWsMaxMessageSize($bytes)` | 1 MiB | max. Größe der reassemblierten Nachricht, sonst `1009` |
| `setWsMaxFrameSize($bytes)` | 1 MiB | max. Größe eines einzelnen Frames, Schutz vor einer Flut winziger Fragmente |
| `setWsPingIntervalMs($ms)` | 30000 | wie oft der Server eine idle Verbindung pingt, `0` deaktiviert es |
| `setWsPongTimeoutMs($ms)` | 60000 | wie lange auf PONG gewartet wird, bevor geschlossen wird (`1001`) |
| `setWsPermessageDeflate($bool)` | `false` | RFC 7692, Opt-in wegen der CPU-Kosten |
| `setWsMaxSubscriptions($count)` | `0` (kein Limit) | distinkte Topic-Filter, die eine Verbindung halten darf |
| `setWsPublishRateLimit($perSecond, $burst)` | `0` (aus) | Per-Connection-Token-Bucket über `publish()` |

Siehe [Konfiguration](/de/docs/server/configuration.html#websocket) für mehr Details.

## Siehe auch

- [`TrueAsync\WebSocket` und verwandte Klassen](/de/docs/reference/server/websocket.html): die
  vollständige Referenz
- [`HttpServer::addWebSocketHandler()`](/de/docs/reference/server/http-server.html#addwebsockethandler)
- [Konfiguration: WebSocket](/de/docs/server/configuration.html#websocket)
