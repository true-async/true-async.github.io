---
layout: docs
lang: de
path_key: "/docs/reference/server/websocket.html"
nav_active: docs
permalink: /de/docs/reference/server/websocket.html
page_title: "TrueAsync\\WebSocket"
description: "TrueAsync\\WebSocket, WebSocketMessage, WebSocketUpgrade, WebSocketCloseCode und die WebSocket-Exception-Hierarchie."
---

# TrueAsync\WebSocket

(PHP 8.6+, true_async_server 0.9+)

Die Klassen hinter Full-Duplex-Verbindungen über RFC 6455. Guide mit Beispielen:
[WebSocket](/de/docs/server/websocket.html).

## TrueAsync\WebSocket

Eine WebSocket-Verbindung. Wird vom Server direkt nach dem Commit des Upgrade-Handshakes erzeugt
und als erstes Argument an den über
[`HttpServer::addWebSocketHandler()`](/de/docs/reference/server/http-server.html#addwebsockethandler)
registrierten Handler übergeben.

```php
namespace TrueAsync;

final class WebSocket implements \Iterator
{
    public function recv(): ?WebSocketMessage;

    public function send(string $text): void;
    public function sendBinary(string $data): void;
    public function trySend(string $text): bool;
    public function trySendBinary(string $data): bool;

    public function ping(string $payload = ''): void;
    public function close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void;

    public function isClosed(): bool;
    public function getSubprotocol(): ?string;
    public function getRemoteAddress(): string;

    // Iterator
    public function current(): ?WebSocketMessage;
    public function key(): int;
    public function next(): void;
    public function rewind(): void;
    public function valid(): bool;
}
```

Instanzen werden nur vom Server konstruiert; `new WebSocket` steht Anwendungscode nicht zur
Verfügung.

### Lebenszyklus

Die Verbindung ist an die Handler-Coroutine gebunden. Wenn der Handler die Kontrolle aus
irgendeinem Grund zurückgibt, auch durch `return` aus einer `recv()`-Schleife bei `null`, schließt
der Server die Verbindung mit Code `1000 Normal`. Ein explizites `close()` vor `return` ist nur
für einen abweichenden Code oder Reason-Text nötig.

### Nebenläufigkeitsmodell

- `send()`, `sendBinary()` und `ping()` können gefahrlos von jeder Coroutine auf demselben Thread
  aufgerufen werden. Producer reihen serialisierte Frames atomar ein; ein einzelner kooperativer
  Flusher schreibt sie nacheinander auf den Socket, sodass Frames verschiedener Aufrufer niemals
  ineinander verschachtelt werden.
- `recv()` ist Single-Reader: ein zweiter gleichzeitiger `recv()`-Aufruf wirft
  `WebSocketConcurrentReadException`, weil die Verbindung ein einzelner Byte-Stream ist und es
  keine definierte Semantik für mehrere Leser gibt.
- `close()` ist idempotent und kann von jeder Coroutine aufgerufen werden.

### recv

```php
public WebSocket::recv(): ?WebSocketMessage
```

Empfängt die nächste Text- oder Binärnachricht. Suspendiert die aufrufende Coroutine, bis eine
vollständige Nachricht eintrifft oder die Verbindung schließt.

Liefert eine [`WebSocketMessage`](#websocketmessage) oder `null`, wenn der Client sauber
geschlossen hat: ein normaler CLOSE-Code (`1000`/`1001`/`1005`) oder eine einfache Trennung ohne
CLOSE-Frame. Typische Schleife: `while (($m = $ws->recv()) !== null) { ... }`.

Die Methode wirft:

- `WebSocketClosedException` bei einem Protokollfehler oder einem expliziten Fehler-Close-Code;
  `$closeCode`/`$closeReason` tragen den RFC-6455-Code und den Grund.
- `WebSocketConcurrentReadException`, wenn eine andere Coroutine bereits in `recv()` auf dieser
  Verbindung wartet.

### send

```php
public WebSocket::send(string $text): void
```

Sendet ein Text-Frame. `$text` **muss** gültiges UTF-8 sein: ungültige Daten werden von vornherein
abgelehnt, damit der Empfänger nie ein Frame sieht, das gegen RFC 6455 §5.6 verstößt.

Gibt im üblichen Fall die Kontrolle sofort zurück, solange der Sendepuffer nicht voll ist.
Suspendiert die aufrufende Coroutine, sobald sich der Puffer füllt, und setzt fort, sobald der
Client genug gelesen hat, um wieder Platz zu schaffen. Zieht sich die Suspendierung länger hin als
`write_timeout_ms`, wirft die Methode `WebSocketBackpressureException`, und der Handler kann dann
die Nachricht verwerfen, die Verbindung schließen oder erneut versuchen.

Die Methode wirft außerdem `WebSocketClosedException`, wenn die Verbindung bereits geschlossen ist.

### sendBinary

```php
public WebSocket::sendBinary(string $data): void
```

Sendet ein Binär-Frame. Binäre Payloads unterliegen keiner UTF-8-Beschränkung. Das
Backpressure-Verhalten ist identisch zu `send()`.

### trySend

```php
public WebSocket::trySend(string $text): bool
```

Nicht-blockierendes Senden. Reiht ein Text-Frame ein und liefert `true`, wenn der Sendepuffer
nicht voll ist; liefert `false`, ohne etwas einzureihen, wenn der Puffer voll ist, sodass der
Aufrufer die Nachricht verwerfen, verlangsamen oder die Verbindung schließen kann. Anders als
`send()` suspendiert `trySend()` die aufrufende Coroutine nie, was es zum richtigen Werkzeug für
eine Broadcast-Schleife macht, in der ein langsamer Client die Zustellung an die anderen nicht
aufhalten darf.

Die Puffergröße wird durch
[`HttpServerConfig::setStreamWriteBufferBytes()`](/de/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
festgelegt (`0` hebt das Limit auf: `trySend()` reiht das Frame dann immer ein und liefert `true`).

Die Funktion liefert `true`, wenn die Nachricht in die Warteschlange aufgenommen wurde, und
`false`, wenn der Sendepuffer voll ist und der Client nicht mithält. Wirft
`WebSocketClosedException`, wenn die Verbindung bereits geschlossen ist.

### trySendBinary

```php
public WebSocket::trySendBinary(string $data): bool
```

Nicht-blockierendes Binär-Senden. Verhält sich wie `trySend()`.

### ping

```php
public WebSocket::ping(string $payload = ''): void
```

Sendet ein PING-Frame. Nach RFC 6455 §5.5.2 muss die Gegenseite mit PONG antworten.
Anwendungscode muss das selten von Hand aufrufen: der Keepalive-Timer des Servers
(`HttpServerConfig::setWsPingIntervalMs()`) sendet PINGs automatisch, wenn konfiguriert.

`$payload` akzeptiert bis zu 125 Bytes (RFC 6455 §5.5).

### close

```php
public WebSocket::close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void
```

Startet den Close-Handshake und baut die Verbindung ab. Idempotent: wiederholte Aufrufe sind
No-ops.

- `$code` ist ein `WebSocketCloseCode`-Wert oder ein roher Integer im Bereich `4000..4999`
  (reserviert für anwendungsspezifische Codes, RFC 6455 §7.4.2).
- `$reason` ist UTF-8-Text, bis zu 123 Bytes.

### isClosed

```php
public WebSocket::isClosed(): bool
```

`true`, nachdem `close()` aufgerufen wurde, oder nachdem das CLOSE-Frame des Clients verarbeitet
wurde.

### getSubprotocol

```php
public WebSocket::getSubprotocol(): ?string
```

Das beim Upgrade ausgehandelte Subprotokoll, oder `null`, wenn keines gewählt wurde.

### getRemoteAddress

```php
public WebSocket::getRemoteAddress(): string
```

Die Peer-Adresse in der Form `host:port` (IPv4) oder `[host]:port` (IPv6) für TCP-Verbindungen.
Ein leerer String für Verbindungen über einen Unix-Socket.

### Iterator

```php
public WebSocket::current(): ?WebSocketMessage
public WebSocket::key(): int
public WebSocket::next(): void
public WebSocket::rewind(): void
public WebSocket::valid(): bool
```

Ermöglicht `foreach ($ws as $msg)` statt einer manuellen `recv()`-Schleife. Bei jedem Schritt holt
die Schleife die nächste Nachricht; ein sauberer Close beendet einfach die `foreach`-Schleife, und
ein Close mit Fehler wirft `WebSocketClosedException` direkt aus der Schleife.

## TrueAsync\WebSocketMessage {#websocketmessage}

```php
namespace TrueAsync;

final class WebSocketMessage
{
    public readonly string $data;
    public readonly bool $binary;
}
```

Eine vollständig reassemblierte Nachricht, wie sie von `WebSocket::recv()` geliefert wird.
Textnachrichten wurden bereits als UTF-8 validiert, sodass Sie `$data` unverändert verwenden
können, ohne es erneut zu prüfen.

- **`$data`** — die Payload der Nachricht. Bei Textnachrichten ist dies ein gültiger
  UTF-8-String.
- **`$binary`** — `true`, wenn die Nachricht als Binär-Frame gesendet wurde, `false` bei einem
  Text-Frame.

Instanzen werden nur vom Server konstruiert. Sie erhalten sie über `WebSocket::recv()`; es gibt
keine Möglichkeit, selbst `new WebSocketMessage` zu konstruieren.

## TrueAsync\WebSocketUpgrade

```php
namespace TrueAsync;

final class WebSocketUpgrade
{
    public function reject(int $status, string $reason = ''): void;
    public function setSubprotocol(string $name): void;
    public function getOfferedSubprotocols(): array;
    public function getOfferedExtensions(): array;
}
```

Der Griff auf eine laufende Upgrade-Aushandlung. Existiert vom Moment des Handler-Aufrufs an, bis
entweder `reject()` aufgerufen wird oder der Handler erfolgreich zurückkehrt (in diesem Fall sendet
der Server `101` mit dem über `setSubprotocol()` gewählten Subprotokoll).

Nur für Handler verfügbar, die mit drei Parametern registriert wurden:

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    // ...
});
```

Der Server prüft, wie viele Parameter der Handler deklariert; ein Handler mit zwei Parametern
überspringt dieses Objekt vollständig, und das Upgrade wird mit Standardeinstellungen akzeptiert.

Sobald der Handshake committet ist, wirft jeder Aufruf auf diesem Objekt: `Sec-WebSocket-Protocol`
ist bereits auf dem Draht, und das Subprotokoll kann nicht mehr geändert werden.

### reject

```php
public WebSocketUpgrade::reject(int $status, string $reason = ''): void
```

Lehnt das Upgrade mit dem angegebenen HTTP-Status ab. Die `101`-Antwort wird nie gesendet; der
Client erhält stattdessen den gewählten Status, und die Verbindung schließt. Nach `reject()`
sollte der Handler sofort zurückkehren: weitere I/O ist nicht erlaubt.

- `$status` — der HTTP-Statuscode (muss 4xx oder 5xx sein).
- `$reason` — ein optionaler Response-Body.

### setSubprotocol

```php
public WebSocketUpgrade::setSubprotocol(string $name): void
```

Wählt ein Subprotokoll aus der vom Client angebotenen Liste. Der gewählte Wert wird im
`Sec-WebSocket-Protocol`-Response-Header zurückgespiegelt. Muss vor dem Rückkehren des Handlers
und vor `reject()` aufgerufen werden. Der Server prüft nicht, ob der gewählte Wert tatsächlich in
`getOfferedSubprotocols()` enthalten war; das liegt beim Handler.

### getOfferedSubprotocols

```php
public WebSocketUpgrade::getOfferedSubprotocols(): array
```

Liefert die Subprotokolle (`string[]`), die der Client im `Sec-WebSocket-Protocol`-Header
gesendet hat, in der vom Client bevorzugten Reihenfolge. Ein leeres Array, wenn der Client keine
angeboten hat.

### getOfferedExtensions

```php
public WebSocketUpgrade::getOfferedExtensions(): array
```

Liefert die Extensions (`string[]`) aus dem `Sec-WebSocket-Extensions`-Header, in der vom Client
bevorzugten Reihenfolge. permessage-deflate (RFC 7692, Nachrichtenkomprimierung) wird vom Server
selbst über `HttpServerConfig::setWsPermessageDeflate()` ausgehandelt; die übrigen angebotenen
Werte sind nur informativ. Ein leeres Array, wenn der Client keine angeboten hat.

## TrueAsync\WebSocketCloseCode

```php
namespace TrueAsync;

enum WebSocketCloseCode: int
{
    case NORMAL                = 1000;
    case GOING_AWAY            = 1001;
    case PROTOCOL_ERROR        = 1002;
    case UNSUPPORTED_DATA      = 1003;
    case NO_STATUS             = 1005;  // RESERVED
    case ABNORMAL_CLOSURE      = 1006;  // RESERVED
    case INVALID_FRAME_PAYLOAD = 1007;
    case POLICY_VIOLATION      = 1008;
    case MESSAGE_TOO_BIG       = 1009;
    case MANDATORY_EXTENSION   = 1010;
    case INTERNAL_SERVER_ERROR = 1011;
    case TLS_HANDSHAKE         = 1015;  // RESERVED
}
```

Die RFC-6455-§7.4.1-Close-Code-Registry. Anwendungsspezifische Codes (`4000..4999`, RFC 6455
§7.4.2) bleiben ebenfalls verfügbar: `WebSocket::close()` akzeptiert neben diesem Enum auch einen
rohen `int`.

## Exceptions

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // final
              ├── WebSocketBackpressureException    // final
              └── WebSocketConcurrentReadException  // final
```

### TrueAsync\WebSocketException

```php
class WebSocketException extends HttpServerException {}
```

Die Basis-Exception für alle WebSocket-Fehler. Erbt von der projektweiten `HttpServerException`,
sodass bestehende Catch-all-Handler weiter funktionieren.

### TrueAsync\WebSocketClosedException

```php
final class WebSocketClosedException extends WebSocketException
{
    public readonly int $closeCode;
    public readonly string $closeReason;
}
```

Die Verbindung wurde aus einem anderen Grund als einem normalen, vom Client initiierten Handshake
geschlossen: ein Protokollfehler oder ein expliziter Fehlercode vom Client. `$closeCode` trägt den
RFC-6455-Close-Code (oder `1006 Abnormal Closure`, wenn überhaupt kein CLOSE-Frame ankam, zum
Beispiel bei einem Netzwerkabbruch). `$closeReason` trägt den UTF-8-Reason-Text aus dem
CLOSE-Frame des Clients, oder einen leeren String, wenn keiner angegeben wurde.

Ein sauberer Close durch den Client (Code `1000`) wirft nicht: `WebSocket::recv()` liefert in
diesem Fall einfach `null`.

### TrueAsync\WebSocketBackpressureException

```php
final class WebSocketBackpressureException extends WebSocketException {}
```

Wird von `send()`/`sendBinary()` geworfen, wenn der Sendepuffer länger als `write_timeout_ms`
voll bleibt. Das ist das Signal an die Anwendung, dass der Client zu langsam liest: die Verbindung
schließen oder die Nachricht verwerfen und fortfahren.

### TrueAsync\WebSocketConcurrentReadException

```php
final class WebSocketConcurrentReadException extends WebSocketException {}
```

Ein Programmierfehler: eine zweite Coroutine hat `recv()` aufgerufen, während eine andere bereits
in `recv()` auf demselben `WebSocket` wartete. Eine einzelne Verbindung kann nur von einer Stelle
aus gelesen werden; wenn Sie Nachrichten an mehrere Handler verteilen müssen, bauen Sie eine
`recv()`-Schleife und verteilen Sie die Nachrichten selbst von dort aus.

## Siehe auch

- [Guide: WebSocket](/de/docs/server/websocket.html)
- [`HttpServer::addWebSocketHandler()`](/de/docs/reference/server/http-server.html#addwebsockethandler)
- [`HttpServerConfig`: WebSocket-Optionen](/de/docs/reference/server/http-server-config.html#websocket)
- [TrueAsync Server Ausnahmen](/de/docs/reference/server/exceptions.html)
