---
layout: docs
lang: it
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /it/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): connessioni full-duplex su RFC 6455, contropressione, keepalive, negoziazione del subprotocollo, permessage-deflate."
---

# WebSocket

(PHP 8.6+, true_async_server 0.9+)

`HttpServer::addWebSocketHandler()` registra un handler per connessioni full-duplex su RFC 6455.

Una connessione inizia come una normale richiesta HTTP, dopodiché il client chiede al server di
passare a un protocollo diverso sulla stessa connessione TCP: questo è l'Upgrade. Il server
risponde con lo stato `101 Switching Protocols`, e da quel momento la stessa connessione porta
WebSocket, non più HTTP. Supportati:

- Upgrade da HTTP/1.1 (il classico header `Connection: Upgrade`).
- Upgrade da HTTP/2 (RFC 8441 Extended CONNECT).
- `wss://` (WebSocket su TLS).
- permessage-deflate (RFC 7692), compressione a livello di messaggio.

> L'implementazione è verificata rispetto alla suite di conformità Autobahn|Testsuite e supera
> tutti i 246 test della categoria `behavior`.

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

Ogni connessione viene servita dalla propria coroutine, lo stesso modello per richiesta usato per
HTTP.

## Ciclo di vita

Una connessione resta aperta finché la coroutine dell'handler non ritorna. Se l'handler
semplicemente termina (ad esempio, il loop `recv()`/`foreach` ottiene `null` alla fine), il server
chiude la connessione con il codice `1000 Normal` automaticamente. Una `close()` esplicita prima
del `return` serve solo se si vuole un codice diverso o un proprio testo di motivo.

## Ricezione dei messaggi: `recv()` e `foreach`

```php
public WebSocket::recv(): ?WebSocketMessage
```

Sospende la coroutine finché non arriva il messaggio successivo o la connessione si chiude.
Restituisce un [`WebSocketMessage`](/it/docs/reference/server/websocket.html#websocketmessage) o
`null` quando il client ha chiuso la connessione in modo pulito (un codice di chiusura normale, o
una disconnessione senza un frame CLOSE esplicito):

```php
while (($msg = $ws->recv()) !== null) {
    handle($msg->data, $msg->binary);
}
```

`WebSocket` implementa `\Iterator`, quindi lo stesso loop si può scrivere più concisamente come
`foreach ($ws as $msg) { ... }`. Una chiusura pulita termina semplicemente il `foreach`; una
chiusura con errore lancia `WebSocketClosedException` direttamente fuori dal loop.

Leggi i messaggi da un solo punto: se chiami `recv()` da due coroutine in parallelo sulla stessa
connessione, la seconda chiamata lancia `WebSocketConcurrentReadException`. Se devi distribuire i
messaggi a più handler, mantieni un solo loop `recv()` e distribuisci da lì.

## Invio dei messaggi: `send()`, `trySend()`

`send()` e `sendBinary()` sono sicuri da chiamare da qualsiasi coroutine, anche più di una alla
volta: il server garantisce che i dati di chiamate diverse non si mescolino mai sulla rete.

```php
$ws->send('text frame');       // il testo DEVE essere UTF-8 valido
$ws->sendBinary($binaryData);  // i dati binari non hanno vincoli di codifica
```

Di solito queste funzioni ritornano subito. Se il client legge lentamente e il buffer di invio si
riempie, la coroutine si sospende e riprende quando il client svuota un po' di buffer. Se
l'attesa supera `write_timeout_ms`, viene lanciata `WebSocketBackpressureException`, e l'handler
decide cosa fare: scartare il messaggio, chiudere la connessione o riprovare.

Per il broadcast di un messaggio a molti client, dove un client lento non deve rallentare gli
altri, esistono varianti non bloccanti:

```php
if (!$ws->trySend($text)) {
    // il buffer di questo client è pieno, il messaggio NON è stato inviato, il client è indietro
}
```

`trySend()`/`trySendBinary()` non sospendono mai la coroutine: ritornano subito `true` se il
messaggio è stato accettato, e `false` se il buffer è pieno (in tal caso il messaggio semplicemente
non viene inviato). La dimensione del buffer è impostata da
[`HttpServerConfig::setStreamWriteBufferBytes()`](/it/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(`0` disattiva il limite: `trySend()` invia sempre e restituisce sempre `true`).

## Chiusura di una connessione: `close()`, `isClosed()`

```php
$ws->close(WebSocketCloseCode::NORMAL, 'bye');
```

Avvia la chiusura della connessione. Sicura da chiamare più volte: le chiamate successive sono
no-op. Il codice di chiusura è un valore
[`WebSocketCloseCode`](/it/docs/reference/server/websocket.html#websocketclosecode) oppure un
intero nell'intervallo `4000..4999` (riservato ai codici specifici dell'applicazione). `$reason`
accetta testo UTF-8, fino a 123 byte.

`isClosed()` restituisce `true` dopo `close()`, o dopo che il client ha inviato il proprio segnale
di chiusura.

## Ping e keepalive

```php
$ws->ping('optional payload');   // fino a 125 byte, RFC 6455 §5.5
```

Il codice applicativo raramente ha bisogno di chiamarlo a mano: il timer di keepalive del server
(`HttpServerConfig::setWsPingIntervalMs()`) invia PING automaticamente. Se il client non risponde
in tempo (`setWsPongTimeoutMs()`), il server chiude la connessione da solo. Vedi
[Configurazione](/it/docs/server/configuration.html#websocket) per i dettagli.

## Negoziazione del subprotocollo e rifiuto: `WebSocketUpgrade`

Per impostazione predefinita l'handler riceve solo `WebSocket $ws`. Per decidere da soli se
accettare la connessione e quale subprotocollo scegliere, registra l'handler con tre parametri: il
server rileva il numero di parametri e, in tal caso, passa un terzo oggetto, `WebSocketUpgrade`:

```php
use TrueAsync\WebSocket;
use TrueAsync\HttpRequest;
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    $offered = $u->getOfferedSubprotocols();   // dall'header Sec-WebSocket-Protocol

    if (!in_array('chat.v2', $offered, true)) {
        $u->reject(400, 'unsupported subprotocol');
        return;
    }

    $u->setSubprotocol('chat.v2');   // deve essere chiamato prima del return o di reject()

    foreach ($ws as $msg) {
        // ...
    }
});
```

`WebSocketUpgrade` vive dal momento in cui l'handler viene invocato fino a `reject()` o a un
`return` con successo (momento in cui il server completa l'handshake con il subprotocollo scelto).
Dopo di che, qualsiasi chiamata su questo oggetto lancia un'eccezione: la risposta è già sulla rete
e il subprotocollo non può più cambiare.

`getOfferedExtensions()` restituisce l'elenco delle estensioni offerte dal client. permessage-deflate
(RFC 7692, compressione dei messaggi) viene negoziata dal server stesso tramite
`HttpServerConfig::setWsPermessageDeflate()`; gli altri valori offerti sono solo informativi.

## Codici di chiusura ed eccezioni

`WebSocketCloseCode` è un enum con i codici di chiusura standard di RFC 6455 (`NORMAL`,
`GOING_AWAY`, `PROTOCOL_ERROR`, `MESSAGE_TOO_BIG` e altri). La gerarchia delle eccezioni:

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // il client non legge abbastanza in fretta
              └── WebSocketConcurrentReadException  // secondo recv() in parallelo
```

Una chiusura pulita da parte del client si presenta come `null` da `recv()`, non come
un'eccezione. Un'eccezione viene lanciata solo per un errore di protocollo o una chiusura con un
codice di errore esplicito; `$closeCode`/`$closeReason` portano il motivo. Vedi il
[riferimento](/it/docs/reference/server/websocket.html) per i dettagli.

## Configurazione

| Metodo | Predefinito | Scopo |
|--------|-------------|-------|
| `setWsMaxMessageSize($bytes)` | 1 MiB | dimensione massima del messaggio riassemblato, altrimenti `1009` |
| `setWsMaxFrameSize($bytes)` | 1 MiB | dimensione massima di un singolo frame, protegge da un flood di frammenti minuscoli |
| `setWsPingIntervalMs($ms)` | 30000 | ogni quanto il server pinga una connessione idle, `0` lo disattiva |
| `setWsPongTimeoutMs($ms)` | 60000 | quanto attendere il PONG prima di chiudere (`1001`) |
| `setWsPermessageDeflate($bool)` | `false` | RFC 7692, opt-in per via del costo in CPU |

Vedi [Configurazione](/it/docs/server/configuration.html#websocket) per maggiori dettagli.

## Vedi anche

- [`TrueAsync\WebSocket` e le classi correlate](/it/docs/reference/server/websocket.html): il
  riferimento completo
- [`HttpServer::addWebSocketHandler()`](/it/docs/reference/server/http-server.html#addwebsockethandler)
- [Configurazione: WebSocket](/it/docs/server/configuration.html#websocket)
