---
layout: docs
lang: it
path_key: "/docs/server/sse.html"
nav_active: docs
permalink: /it/docs/server/sse.html
page_title: "TrueAsync Server: Server-Sent Events"
description: "sseStart()/sseEvent()/sseComment()/sseRetry(): helper pronti per text/event-stream su HTTP/1.1, HTTP/2 e HTTP/3."
---

# Server-Sent Events

(PHP 8.6+, true_async_server 0.8+)

SSE (Server-Sent Events) è un modo semplice per trasmettere eventi testuali al browser su una
normale connessione HTTP, in una sola direzione: dal server al browser. A differenza di
WebSocket, non serve un protocollo separato né un handshake Upgrade: il server tiene semplicemente
la risposta aperta e aggiunge nuovi eventi man mano che sono pronti. Il browser li consuma con
l'API integrata `EventSource`, senza librerie aggiuntive.

`HttpResponse` mette a disposizione quattro metodi per `text/event-stream`: `sseStart()`,
`sseEvent()`, `sseComment()` e `sseRetry()`. È uno strato di formattazione leggero sopra la stessa
[pipeline `send()`](/it/docs/server/streaming.html), quindi lo stesso handler funziona senza
modifiche su HTTP/1.1, HTTP/2 e HTTP/3, ed è il client a scegliere il protocollo.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\delay;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWriteTimeout(0);   // stream a vita lunga: nessuna deadline di scrittura

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) {
    $res->sseStart();          // opzionale: anche il primo sseEvent()/sseComment() avvia lo stream
    $res->sseRetry(3000);      // suggerisce al browser di riconnettersi dopo 3s in caso di caduta
    $res->sseComment('stream open');   // heartbeat, evita che i proxy considerino la connessione idle

    for ($i = 1; $i <= 10; $i++) {
        $res->sseEvent(
            data:  json_encode(['n' => $i, 'at' => time()]),
            event: 'tick',
            id:    (string) $i,
        );

        if (!$res->sendable()) {   // il client non c'è più, inutile aspettare
            break;
        }

        delay(1000);
    }

    $res->sseEvent('bye');
    $res->end();
});

$server->start();
```

Lato browser:

```js
const es = new EventSource('/events');
es.onmessage = e => console.log('message', e.data);
es.addEventListener('tick', e => console.log('tick', e.data, e.lastEventId));
```

## sseStart()

Passa la risposta in modalità SSE e blocca gli header: `Content-Type: text/event-stream`,
`Cache-Control: no-cache, no-transform` e `X-Accel-Buffering: no` (quest'ultimo dice a nginx di
non bufferizzare la risposta; senza di esso, gli eventi resterebbero bloccati dietro il buffer del
proxy finché non si riempie). La risposta viene inoltre marcata come non comprimibile: uno stream
gzip con buffering vanificherebbe lo scopo della consegna in tempo reale.

La chiamata è opzionale: il primo `sseEvent()`/`sseComment()` avvia lo stream da solo. Ma
`sseStart()` da sola **non** invia sulla rete la status line e gli header: il commit è lazy e
avviene al primo evento reale. Per aprire lo stream subito (ad esempio per sbloccare l'`onopen`
del browser prima che ci sia un evento vero e proprio), invia un `sseComment()` vuoto: questo sia
avvia lo stream sia esegue subito il commit degli header.

Lancia `HttpServerInvalidArgumentException` se l'handler ha già impostato un proprio
`Content-Type`, e `HttpServerRuntimeException` se la risposta sta già facendo streaming, è chiusa
o è occupata da `sendFile()`.

## sseEvent()

```php
$res->sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null,
): static
```

Formatta e invia un evento SSE, avviando lo stream se necessario. Un `$data` multilinea viene
diviso su `\n` / `\r\n` / `\r` e inviato come più campi `data:` (WHATWG §9.2). `$event`, `$id` e
`$retry` sono inclusi solo quando non sono `null`. Il record termina con una riga vuota così il
browser dispatcha subito l'evento.

- `$event` e `$id` non devono contenere `\r`/`\n` (altrimenti il parser li leggerebbe come
  separatore di campo/record), e `$id` non deve contenere NUL (per WHATWG, un NUL fa ignorare
  l'intero id al parser): le violazioni lanciano `HttpServerInvalidArgumentException`.
- `$retry` deve essere non negativo.
- Anche una stringa vuota `$data === ''` è un valore valido, dispatcha un `MessageEvent` vuoto.
- Tutti e quattro gli argomenti a `null` è un no-op. Il parser di `EventSource` salta
  silenziosamente un evento senza né `data` né `retry`.

## sseComment()

```php
$res->sseComment(string $text = ''): static
```

Invia una riga di commento (un record che inizia con `:`). I browser ignorano i commenti, ma
mantengono viva la connessione attraverso i timeout di idle dei proxy intermedi (il
`proxy_read_timeout` di nginx, 60s di default). Chiamalo periodicamente come heartbeat. Il payload
canonico è una stringa vuota, che sulla rete diventa `:\n\n`. `$text` non deve contenere `\r`/`\n`.

## sseRetry()

```php
$res->sseRetry(int $milliseconds): static
```

Invia una direttiva `retry:` che dice al browser quanti millisecondi attendere prima di
riconnettersi dopo la caduta dello stream. Zucchero sintattico per `sseEvent(retry: $milliseconds)`
senza payload.

## Contropressione: `sendable()`

Come `send()`, ogni metodo SSE sospende la coroutine dell'handler solo in caso di reale
contropressione, cioè quando il buffer intermedio dello stream è pieno. Il controllo `sendable()`
è non bloccante e informativo: `false` significa che la prossima chiamata si sospenderebbe, che la
risposta è già chiusa, oppure che questo tipo di risposta non supporta affatto lo streaming. Utile
per non dover attendere un client lento quando c'è altro lavoro da fare.

## Vedi anche

- [`HttpResponse::sseStart()`](/it/docs/reference/server/http-response.html#ssestart) e gli altri
  metodi SSE nel riferimento
- [Streaming](/it/docs/server/streaming.html): il `send()`/`sendable()` di basso livello su cui è
  costruito SSE
- [Esempi](/it/docs/server/examples.html#sse-server-sent-events)
