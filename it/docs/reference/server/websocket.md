---
layout: docs
lang: it
path_key: "/docs/reference/server/websocket.html"
nav_active: docs
permalink: /it/docs/reference/server/websocket.html
page_title: "TrueAsync\\WebSocket"
description: "TrueAsync\\WebSocket, WebSocketMessage, WebSocketUpgrade, WebSocketCloseCode e la gerarchia delle eccezioni WebSocket."
---

# TrueAsync\WebSocket

(PHP 8.6+, true_async_server 0.9+)

Le classi dietro le connessioni full-duplex su RFC 6455. Guida con esempi:
[WebSocket](/it/docs/server/websocket.html).

## TrueAsync\WebSocket

Una connessione WebSocket. Creata dal server subito dopo il commit dell'handshake di upgrade e
passata come primo argomento all'handler registrato tramite
[`HttpServer::addWebSocketHandler()`](/it/docs/reference/server/http-server.html#addwebsockethandler).

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

Le istanze vengono costruite solo dal server; `new WebSocket` non è disponibile al codice utente.

### Ciclo di vita

La connessione è legata alla coroutine dell'handler. Quando l'handler restituisce il controllo per
qualsiasi motivo, incluso un `return` da un loop `recv()` su `null`, il server chiude la
connessione con il codice `1000 Normal`. Una `close()` esplicita prima del `return` serve solo per
un codice non predefinito o un testo di motivo personalizzato.

### Modello di concorrenza

- `send()`, `sendBinary()` e `ping()` sono sicuri da chiamare da qualsiasi coroutine sullo stesso
  thread. I produttori mettono in coda in modo atomico i frame serializzati; un unico flusher
  cooperativo li scrive sul socket uno alla volta, quindi i frame di chiamanti diversi non si
  intrecciano mai.
- `recv()` è a lettore singolo: una seconda chiamata concorrente a `recv()` lancia
  `WebSocketConcurrentReadException`, perché la connessione è un unico flusso di byte e non esiste
  una semantica definita per più lettori.
- `close()` è idempotente e può essere chiamata da qualsiasi coroutine.

### recv

```php
public WebSocket::recv(): ?WebSocketMessage
```

Riceve il prossimo messaggio testuale o binario. Sospende la coroutine chiamante finché non arriva
un messaggio completo o la connessione si chiude.

Restituisce un [`WebSocketMessage`](#websocketmessage) oppure `null` quando il client chiude in
modo pulito: un codice CLOSE normale (`1000`/`1001`/`1005`) o una disconnessione semplice senza
frame CLOSE. Loop tipico: `while (($m = $ws->recv()) !== null) { ... }`.

Il metodo lancia:

- `WebSocketClosedException` per un errore di protocollo o un codice di chiusura d'errore
  esplicito; `$closeCode`/`$closeReason` portano il codice e il motivo RFC 6455.
- `WebSocketConcurrentReadException` se un'altra coroutine è già in attesa dentro `recv()` su
  questa connessione.

### send

```php
public WebSocket::send(string $text): void
```

Invia un frame di testo. `$text` **deve** essere UTF-8 valido: i dati non validi vengono respinti
subito così il ricevente non vede mai un frame che viola RFC 6455 §5.6.

Restituisce il controllo subito nel caso comune, mentre il buffer di invio non è pieno. Sospende
la coroutine chiamante quando il buffer si riempie, e riprende quando il client ha letto abbastanza
da fare nuovamente spazio. Se la sospensione supera `write_timeout_ms`, il metodo lancia
`WebSocketBackpressureException`, e l'handler può quindi scartare il messaggio, chiudere la
connessione o riprovare.

Il metodo lancia anche `WebSocketClosedException` se la connessione è già chiusa.

### sendBinary

```php
public WebSocket::sendBinary(string $data): void
```

Invia un frame binario. I payload binari non hanno vincoli UTF-8. Il comportamento di
contropressione è identico a `send()`.

### trySend

```php
public WebSocket::trySend(string $text): bool
```

Invio non bloccante. Mette in coda un frame di testo e restituisce `true` quando il buffer di
invio non è pieno; restituisce `false` senza mettere in coda nulla se il buffer è pieno, così il
chiamante può scartare il messaggio, rallentare o chiudere la connessione. A differenza di
`send()`, `trySend()` non sospende mai la coroutine chiamante, il che lo rende lo strumento giusto
per un loop di broadcast dove un client lento non deve bloccare la consegna agli altri.

La dimensione del buffer è impostata da
[`HttpServerConfig::setStreamWriteBufferBytes()`](/it/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(`0` disattiva il limite: `trySend()` allora mette sempre in coda il frame e restituisce sempre
`true`).

La funzione restituisce `true` se il messaggio è stato accettato in coda, e `false` se il buffer
di invio è pieno e il client non sta tenendo il passo. Lancia `WebSocketClosedException` se la
connessione è già chiusa.

### trySendBinary

```php
public WebSocket::trySendBinary(string $data): bool
```

Invio binario non bloccante. Si comporta come `trySend()`.

### ping

```php
public WebSocket::ping(string $payload = ''): void
```

Invia un frame PING. Secondo RFC 6455 §5.5.2 il peer è tenuto a rispondere con PONG. Il codice
applicativo raramente ha bisogno di chiamarlo a mano: il timer di keepalive del server
(`HttpServerConfig::setWsPingIntervalMs()`) invia i ping automaticamente quando configurato.

`$payload` accetta fino a 125 byte (RFC 6455 §5.5).

### close

```php
public WebSocket::close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void
```

Avvia l'handshake di chiusura e smonta la connessione. Idempotente: le chiamate ripetute sono
no-op.

- `$code` è un valore `WebSocketCloseCode`, o un intero grezzo in `4000..4999` (riservato ai codici
  specifici dell'applicazione, RFC 6455 §7.4.2).
- `$reason` è testo UTF-8, fino a 123 byte.

### isClosed

```php
public WebSocket::isClosed(): bool
```

`true` dopo che `close()` è stato chiamato, o dopo che il frame CLOSE del client è stato elaborato.

### getSubprotocol

```php
public WebSocket::getSubprotocol(): ?string
```

Il subprotocollo negoziato durante l'upgrade, o `null` se non ne è stato scelto nessuno.

### getRemoteAddress

```php
public WebSocket::getRemoteAddress(): string
```

L'indirizzo del peer in forma `host:port` (IPv4) o `[host]:port` (IPv6) per connessioni TCP. Una
stringa vuota per connessioni su socket Unix.

### Iterator

```php
public WebSocket::current(): ?WebSocketMessage
public WebSocket::key(): int
public WebSocket::next(): void
public WebSocket::rewind(): void
public WebSocket::valid(): bool
```

Permette di scrivere `foreach ($ws as $msg)` invece di un loop `recv()` manuale. A ogni passo il
loop preleva il messaggio successivo; una chiusura pulita termina semplicemente il `foreach`, e
una chiusura con errore lancia `WebSocketClosedException` direttamente fuori dal loop.

## TrueAsync\WebSocketMessage {#websocketmessage}

```php
namespace TrueAsync;

final class WebSocketMessage
{
    public readonly string $data;
    public readonly bool $binary;
}
```

Un messaggio completamente riassemblato, come consegnato da `WebSocket::recv()`. I messaggi di
testo sono già stati validati come UTF-8, quindi puoi usare `$data` così com'è senza ricontrollarlo.

- **`$data`**: il payload del messaggio. Per i messaggi di testo è una stringa UTF-8 valida.
- **`$binary`**: `true` se il messaggio è stato inviato come frame binario, `false` per un frame
  di testo.

Le istanze vengono costruite solo dal server. Le ottieni tramite `WebSocket::recv()`; non c'è modo
di costruire `new WebSocketMessage` da soli.

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

L'handle su una negoziazione di upgrade in corso. Esiste dal momento in cui l'handler viene
invocato fino a quando viene chiamato `reject()` oppure l'handler ritorna con successo (nel qual
caso il server invia `101` con il subprotocollo scelto tramite `setSubprotocol()`).

Disponibile solo per gli handler registrati con tre parametri:

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    // ...
});
```

Il server rileva quanti parametri dichiara l'handler; un handler a due parametri salta del tutto
questo oggetto e l'upgrade viene accettato con le impostazioni predefinite.

Una volta completato l'handshake, qualsiasi chiamata su questo oggetto lancia un'eccezione:
`Sec-WebSocket-Protocol` è già sulla rete e il subprotocollo non può più cambiare.

### reject

```php
public WebSocketUpgrade::reject(int $status, string $reason = ''): void
```

Rifiuta l'upgrade con lo stato HTTP indicato. La risposta `101` non viene mai inviata; il client
riceve invece lo stato scelto, e la connessione si chiude. Dopo `reject()` l'handler dovrebbe
ritornare subito: non è consentito ulteriore I/O.

- `$status`: il codice di stato HTTP (deve essere 4xx o 5xx).
- `$reason`: un corpo di risposta opzionale.

### setSubprotocol

```php
public WebSocketUpgrade::setSubprotocol(string $name): void
```

Sceglie un subprotocollo dall'elenco offerto dal client. Il valore scelto viene rimandato
nell'header di risposta `Sec-WebSocket-Protocol`. Deve essere chiamato prima che l'handler ritorni
e prima di `reject()`. Il server non verifica che il valore scelto fosse effettivamente in
`getOfferedSubprotocols()`: è responsabilità dell'handler.

### getOfferedSubprotocols

```php
public WebSocketUpgrade::getOfferedSubprotocols(): array
```

Restituisce i subprotocolli (`string[]`) inviati dal client nell'header `Sec-WebSocket-Protocol`,
nell'ordine di preferenza del client. Un array vuoto se il client non ne ha offerto nessuno.

### getOfferedExtensions

```php
public WebSocketUpgrade::getOfferedExtensions(): array
```

Restituisce le estensioni (`string[]`) dall'header `Sec-WebSocket-Extensions`, nell'ordine di
preferenza del client. permessage-deflate (RFC 7692, compressione dei messaggi) viene negoziata
dal server stesso tramite `HttpServerConfig::setWsPermessageDeflate()`; gli altri valori offerti
sono solo informativi. Un array vuoto se il client non ne ha offerto nessuna.

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

Il registro dei codici di chiusura di RFC 6455 §7.4.1. Restano disponibili anche i codici
specifici dell'applicazione (`4000..4999`, RFC 6455 §7.4.2): `WebSocket::close()` accetta un `int`
grezzo insieme a questo enum.

## Eccezioni

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

L'eccezione base per tutti gli errori WebSocket. Estende la `HttpServerException` a livello di
progetto, così gli handler catch-all esistenti continuano a funzionare.

### TrueAsync\WebSocketClosedException

```php
final class WebSocketClosedException extends WebSocketException
{
    public readonly int $closeCode;
    public readonly string $closeReason;
}
```

La connessione è stata chiusa per un motivo diverso da un normale handshake avviato dal client: un
errore di protocollo, o un codice di errore esplicito dal client. `$closeCode` porta il codice di
chiusura RFC 6455 (o `1006 Abnormal Closure` se non è arrivato nessun frame CLOSE, ad esempio in
caso di caduta di rete). `$closeReason` porta il testo del motivo UTF-8 dal frame CLOSE del
client, o una stringa vuota se non ne è stato fornito nessuno.

Una chiusura pulita da parte del client (codice `1000`) non lancia un'eccezione:
`WebSocket::recv()` restituisce semplicemente `null` in quel caso.

### TrueAsync\WebSocketBackpressureException

```php
final class WebSocketBackpressureException extends WebSocketException {}
```

Lanciata da `send()`/`sendBinary()` quando il buffer di invio resta pieno più a lungo di
`write_timeout_ms`. È il segnale per l'applicazione che il client sta leggendo troppo lentamente:
chiudi la connessione, oppure scarta il messaggio e continua.

### TrueAsync\WebSocketConcurrentReadException

```php
final class WebSocketConcurrentReadException extends WebSocketException {}
```

Un errore del programmatore: una seconda coroutine ha chiamato `recv()` mentre un'altra era già in
attesa dentro `recv()` sullo stesso `WebSocket`. Una singola connessione può essere letta da un
solo punto alla volta; se devi distribuire i messaggi a più handler, costruisci un solo loop
`recv()` e distribuisci da lì i messaggi tu stesso.

## Vedi anche

- [Guida: WebSocket](/it/docs/server/websocket.html)
- [`HttpServer::addWebSocketHandler()`](/it/docs/reference/server/http-server.html#addwebsockethandler)
- [`HttpServerConfig`: opzioni WebSocket](/it/docs/reference/server/http-server-config.html#websocket)
- [Eccezioni di TrueAsync Server](/it/docs/reference/server/exceptions.html)
