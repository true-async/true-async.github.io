---
layout: docs
lang: de
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /de/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): Full-Duplex-Verbindungen über RFC 6455, Backpressure, Keepalive, Subprotokoll-Aushandlung, permessage-deflate."
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

$server->start();
```

Jede Verbindung wird von ihrer eigenen Coroutine bedient, dasselbe Per-Request-Modell wie bei HTTP.

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
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // Client liest nicht schnell genug
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

Siehe [Konfiguration](/de/docs/server/configuration.html#websocket) für mehr Details.

## Siehe auch

- [`TrueAsync\WebSocket` und verwandte Klassen](/de/docs/reference/server/websocket.html): die
  vollständige Referenz
- [`HttpServer::addWebSocketHandler()`](/de/docs/reference/server/http-server.html#addwebsockethandler)
- [Konfiguration: WebSocket](/de/docs/server/configuration.html#websocket)
