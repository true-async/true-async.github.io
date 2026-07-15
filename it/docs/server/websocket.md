---
layout: docs
lang: it
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /it/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): connessioni full-duplex su RFC 6455, topic pub/sub cross-worker, contropressione, keepalive, negoziazione del subprotocollo, permessage-deflate."
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
- [Topic pub/sub](#topic-publishsubscribe-su-ogni-worker) che raggiungono ogni worker del
  processo, così una chat non richiede un server a singolo worker né un broker esterno.

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

// Obbligatorio: il server rifiuta di partire senza un handler HTTP, ed è lui a
// rispondere alle richieste che non sono upgrade.
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(404)->end();
});

$server->start();
```

Registrare l'handler è ciò che attiva WebSocket — non c'è un interruttore separato da
azionare.

> `HttpServerConfig::enableWebSocket()` sembra proprio quell'interruttore, ma è uno stub
> non implementato che lancia `HttpServerRuntimeException` quando gli si passa `true`, e
> `isWebSocketEnabled()` riporta `false` anche mentre WebSocket è in servizio. Non chiamare
> nessuno dei due ([server#134](https://github.com/true-async/server/issues/134)).

Ogni connessione viene servita dalla propria coroutine, lo stesso modello per richiesta usato per
HTTP. Un handler che lancia un'eccezione non porta giù il worker con sé: l'eccezione viene
registrata a log, e il peer viene informato nel protocollo — uno stato HTTP se il lancio
precede l'upgrade, un `CLOSE 1011` una volta che la sessione è attiva.

L'handler viene sempre chiamato con tre argomenti, e PHP scarta quelli che non hai
dichiarato — quindi `function (WebSocket $ws)`, `function (WebSocket $ws, HttpRequest $req)`
e la forma a tre parametri sono tutti validi. Dichiara solo ciò che usi.

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

## Topic: publish/subscribe su ogni worker

Un worker è un thread con il proprio contesto PHP. Quindi il modo ovvio di costruire una
chat — tenere un array di connessioni e iterarci sopra — può raggiungere soltanto i peer di
*un* worker, ed è per questo che una chat del genere doveva girare su `setWorkers(1)`.

I topic risolvono questo. Vivono nel server, non nel tuo handler: ogni worker indicizza le
connessioni che possiede, e una `publish()` viene consegnata a ogni worker, che poi la
recapita ai propri socket. Niente Redis, niente message broker, niente server a singolo
worker.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = ltrim($req->getPath(), '/') ?: 'lobby';

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", $msg->data);   // raggiunge gli iscritti su TUTTI i worker
    }
});
```

Un topic è indirizzato per **nome, nel punto di chiamata**. Non c'è nessun oggetto topic da
ottenere, conservare o passare a un handler.

### I filtri seguono MQTT

I livelli sono separati da `/`, `+` corrisponde esattamente a un livello, e un `#` finale
corrisponde al resto:

| Filtro | Riceve |
|--------|--------|
| `chat/general` | esattamente quel topic |
| `chat/+/typing` | `chat/general/typing`, `chat/random/typing` — un livello, qualsiasi valore |
| `user/42/#` | `user/42`, `user/42/presence`, `user/42/dm/7` — l'intero sottoalbero |

I wildcard appartengono alle *sottoscrizioni*. Un **topic di publish deve essere concreto**:
un messaggio diffuso verso un pattern non ha una destinazione ben definita, quindi
`publish('chat/+/typing', …)` lancia `WebSocketException`. I filtri possono essere profondi
fino a 128 livelli.

### L'API

```php
$ws->subscribe('chat/+/typing');            // idempotente
$ws->unsubscribe('chat/+/typing');          // idempotente
$ws->getTopics();                           // string[] — i filtri di questa connessione

$ws->publish('chat/general', $text);        // testo, a ogni worker
$ws->publishBinary('chat/general', $bytes); // controparte binaria

$ws->subscriberCount('chat/general');       // su tutti i worker, wildcard inclusi
```

`publish()` **non sospende mai**. Un peer la cui coda in uscita è congestionata scarta il
messaggio invece di bloccare la consegna al resto del topic — la stessa semantica di
`trySend()`. Quando serve una garanzia di consegna, usa `send()` verso la singola connessione.
Un iscritto individuato da più dei suoi stessi filtri riceve comunque esattamente una copia.

`$excludeSelf` vale `true` di default — il caso "tutti tranne il mittente" che una chat
vuole:

```php
$ws->publish('chat/general', $msg->data);                      // il mittente non lo riceve indietro
$ws->publish('chat/general', $msg->data, excludeSelf: false);  // lo riceve anche il mittente
```

Il valore di ritorno è il numero di iscritti serviti **solo sul worker chiamante**. La
consegna agli altri worker è asincrona e non può essere contata nel punto di chiamata,
quindi questo è un numero locale, non uno a livello di processo. `subscriberCount()` è quello
a livello di processo — ma poiché ogni worker risponde con il proprio conteggio e le risposte
vengono sommate, è uno snapshot più che un contatore live, e un worker che non risponde in
tempo viene escluso.

Una connessione in chiusura si disiscrive da tutto da sola.

### Limiti

Entrambi sono disattivati di default, che è ciò che ogni broker self-hosted spedisce (EMQX
`max_subscriptions` / `messages_rate`, NATS `max_subs`): solo l'applicazione sa quanti topic
le servono.

```php
$config
    ->setWsMaxSubscriptions(32)          // filtri distinti che una connessione può tenere
    ->setWsPublishRateLimit(50, burst: 100);
```

Imposta `setWsMaxSubscriptions()` ogni volta che input del client raggiunge `subscribe()` —
ad esempio `$ws->subscribe($msg->data)` — così un peer non può far crescere all'infinito
l'albero dei topic del worker. Oltre il limite, `subscribe()` lancia `WebSocketException` e
la connessione resta attiva.

`setWsPublishRateLimit()` è un token bucket per connessione. `publish()` è l'unica chiamata
WebSocket che un peer non privilegiato può trasformare in lavoro su *ogni* worker del
processo — `send()` e `trySend()` toccano sempre e solo il proprio socket. Senza misura, un
client che itera su un messaggio rilanciato riempie l'inbox di ogni worker, e gli scarti che
ne seguono colpiscono anche il traffico di *altri* topic. Oltre il rate, `publish()` lancia
`WebSocketBackpressureException` e la connessione resta attiva: il mittente viene informato,
invece che il messaggio svanisca in una mailbox piena dove nessuno può vederlo.

`$burst` è la profondità del bucket in messaggi — quanto un handler può correre avanti
rispetto al rate sostenuto. `0` significa il valore di un secondo.

```php
try {
    $ws->publish("chat/$room", $msg->data);
} catch (WebSocketBackpressureException) {
    $ws->send('you are sending too fast');
} catch (WebSocketException $e) {
    $ws->send('bad topic: ' . $e->getMessage());
}
```

### Quanto costa

Ogni worker riassume le proprie sottoscrizioni in un counting Bloom filter di prefissi di
topic, e un publisher salta i worker che provabilmente non hanno alcun iscritto invece di
svegliarli tutti. Una publish verso un topic che nessuno nel processo ascolta costa zero
risvegli cross-worker. `HttpServer::getRuntimeStats()` riporta l'esito — `ws_topic_posted`,
`ws_topic_skipped` (il filtro che si guadagna il pane) e `ws_topic_dropped` (la mailbox di un
worker era piena: quello è perdita di dati).

I topic funzionano su ogni transport WebSocket, non solo su HTTP/1 in plaintext — su TLS, su
HTTP/2 Extended CONNECT, e con permessage-deflate, dove una `publish()` serve fianco a fianco
un peer compresso e uno in chiaro, ciascuno con il framing che ha negoziato.

## L'indirizzo del client

```php
$ws->getRemoteAddress();   // "203.0.113.7" o "2001:db8::1" — IP nudo, senza porta
$ws->getRemotePort();      // 54321
```

`getRemoteAddress()` restituisce l'**IP nudo**: nessuna porta, e nessuna parentesi attorno a
un letterale IPv6 — la stessa forma di `$_SERVER['REMOTE_ADDR']`, così va dritto in
`filter_var(…, FILTER_VALIDATE_IP)`, in una ACL o in un rate limiter. Entrambi restituiscono
`null` su un listener Unix-socket, che non ha un peer IP.

Questo è il peer della connessione TCP. **Non** è derivato da `X-Forwarded-For` — dietro un
proxy, analizza quell'header tu stesso, e solo quando ti fidi del proxy che l'ha impostato.

> **Modifica breaking.** `getRemoteAddress()` restituiva `"host:port"` (e `""` quando non
> c'era un peer IP). Ora restituisce l'IP nudo, e `null`. Usa `getRemotePort()` per la porta.

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
        └── TrueAsync\WebSocketException            // anche: filtro topic errato, limite sottoscrizioni
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // lettore lento — o publish() oltre il suo rate limit
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
| `setWsMaxSubscriptions($count)` | `0` (nessun limite) | filtri topic distinti che una connessione può tenere |
| `setWsPublishRateLimit($perSecond, $burst)` | `0` (off) | token bucket per connessione su `publish()` |

Vedi [Configurazione](/it/docs/server/configuration.html#websocket) per maggiori dettagli.

## Vedi anche

- [`TrueAsync\WebSocket` e le classi correlate](/it/docs/reference/server/websocket.html): il
  riferimento completo
- [`HttpServer::addWebSocketHandler()`](/it/docs/reference/server/http-server.html#addwebsockethandler)
- [Configurazione: WebSocket](/it/docs/server/configuration.html#websocket)
