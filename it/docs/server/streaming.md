---
layout: docs
lang: it
path_key: "/docs/server/streaming.html"
nav_active: docs
permalink: /it/docs/server/streaming.html
page_title: "TrueAsync Server: trasferimento a blocchi di richiesta e risposta"
description: "readBody(): lettura del corpo della richiesta a blocchi. send()/sendable(): invio della risposta a blocchi con contropressione. Trailer HTTP/2."
---

# Trasferimento a blocchi di richiesta e risposta

(PHP 8.6+, true_async_server 0.6+)

## Lettura del corpo della richiesta a blocchi: `readBody()`

Per impostazione predefinita l'handler riceve il corpo già letto interamente
(`HttpRequest::getBody()`). Con `HttpServerConfig::setBodyStreamingEnabled(true)` i parser H1/H2
inseriscono i blocchi DATA in una coda FIFO legata alla richiesta, e l'handler li preleva uno alla
volta con `HttpRequest::readBody()`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setBodyStreamingEnabled(true)
);

$server->addHttpHandler(function ($req, $res) {
    $fp = fopen('/tmp/upload-' . bin2hex(random_bytes(8)), 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($fp, $chunk);
        $total += strlen($chunk);
    }
    fclose($fp);

    $res->json(['received' => $total]);
});

$server->start();
```

### Semantica

- Una chiamata a `readBody()` restituisce **un** blocco fornito dal parser:
  - un frame DATA H2 (predefinito fino a 16 KiB);
  - una porzione da `on_body` di llhttp (limitata al buffer di lettura H1 = 8 KiB).
- Quando la coda è vuota, la coroutine si sospende su un evento legato alla richiesta.
- Al raggiungimento della fine del flusso si ottiene `null` (idempotente).
- In caso di errore del flusso (peer reset, superamento di `max_body_size`) viene lanciata `\Exception`.
- Il parametro `$maxLen` è attualmente riservato a una futura fusione di blocchi e viene ignorato.
  La firma resta compatibile a livello binario con i miglioramenti previsti (issue #26).

### Quando abilitarlo

- Caricamenti di file grandi (log, media, backup).
- Parsing a blocchi (NDJSON, stream MessagePack).
- Servizi in cui la latenza di coda (p99) peggiora se si trattiene il corpo in memoria.
- Il multipart è **sempre** in modalità a blocchi, indipendentemente da `setBodyStreamingEnabled()`.

Quando **non** abilitarlo: endpoint REST in cui il corpo è compatto e conviene lavorare con
`getBody()`/`getPost()`/`getQuery()` per intero. La modalità combinata (blocchi solo quando il corpo
supera X) non è supportata; `getBody()` in modalità a blocchi lancia `LogicException` (è in roadmap).

### Consumo di memoria

Su 50 richieste POST parallele da 20 MiB (h2load, WSL2): l'RSS di picco cala da 1170 MiB a
**197 MiB** (6 volte meno). Il throughput sale da 36 req/s a **100 req/s** (×2.7), perché la
chiamata all'handler non attende più il corpo completo.

## Invio della risposta a blocchi: `send()` / `sendable()`

La risposta semplice tramite `setBody()` / `json()` / `html()` / `redirect()` parte in un unico
pezzo.

Per l'invio a blocchi (trasferimento chunked su H1, frame DATA su H2) si usa `send($chunk)`:

```php
$server->addHttpHandler(function ($req, $res) {
    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setNoCompression();   // SSE: gli eventi devono raggiungere il client subito

    // Il primo send() consolida lo stato + gli header (non sono più modificabili)
    foreach (generateEvents() as $event) {
        $res->send("data: " . json_encode($event) . "\n\n");
    }
});
```

### Contropressione

`send()` sospende la coroutine dell'handler **soltanto** in caso di contropressione: quando il
buffer intermedio dello stream è pieno. In condizioni normali la funzione ritorna subito.

HTTP/2: la contropressione scatta quando si riempiono gli slot del buffer circolare **oppure** quando
si supera `HttpServerConfig::setStreamWriteBufferBytes()` (predefinito 256 KiB).
HTTP/1 chunked usa il buffer di invio del kernel.

### `sendable()`

Controllo non bloccante a titolo informativo: restituisce `true` se `send()` accetta un blocco senza
sospendere la coroutine. `false` significa una di tre cose: `send()` si sospenderebbe, la risposta è
chiusa o sigillata da una chiamata a `sendFile()`, oppure il tipo di risposta non supporta il
trasferimento a blocchi.

```php
foreach ($events as $event) {
    if (!$res->sendable()) {
        // non vogliamo attendere un client lento — facciamo altro
        $event->save();   // salva sul DB
        continue;
    }
    $res->send($event->encode());
}
```

`send()` è **sempre** sicuro da chiamare, indipendentemente da `sendable()`. Quest'ultimo dà solo la
possibilità all'handler di occuparsi di altro lavoro invece di attendere un client lento.

## Trailer HTTP/2

HTTP/2 supporta un frame HEADERS dopo il corpo (trailer). Il consumatore canonico è gRPC
(`grpc-status` nel trailer).

```php
$res->setStatusCode(200);
$res->send($body);
$res->setTrailer('grpc-status', '0');
$res->setTrailer('grpc-message', 'OK');
```

Impostazione in blocco:

```php
$res->setTrailers(['grpc-status' => '0', 'grpc-message' => 'OK']);
$res->resetTrailers();   // rimuovi tutti
$res->getTrailers();
```

Su HTTP/1.1 il valore viene **ignorato silenziosamente**: l'invio dei trailer nella codifica chunked
non è ancora implementato (Step 5b).

> I nomi dei trailer si scrivono in minuscolo (RFC 9113 §8.2.2); il maiuscolo viene convertito
> automaticamente.

## Vedi anche

- [`HttpServerConfig::setBodyStreamingEnabled()`](/it/docs/reference/server/http-server-config.html#setbodystreamingenabled)
- [`HttpServerConfig::setStreamWriteBufferBytes()`](/it/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
- [`HttpRequest::readBody()`](/it/docs/reference/server/http-request.html#readbody)
- [`HttpResponse::send()`](/it/docs/reference/server/http-response.html#send)
- [`HttpResponse::sendable()`](/it/docs/reference/server/http-response.html#sendable)
- [`HttpResponse::setTrailer()`](/it/docs/reference/server/http-response.html#settrailer)
