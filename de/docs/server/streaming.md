---
layout: docs
lang: de
path_key: "/docs/server/streaming.html"
nav_active: docs
permalink: /de/docs/server/streaming.html
page_title: "TrueAsync Server: Request- und Response-Streaming"
description: "readBody(): pull-basiertes Streaming des Request-Bodys. send()/sendable(): chunked Response-Streaming mit Backpressure. Trailers HTTP/2."
---

# Request- und Response-Streaming

(PHP 8.6+, true_async_server 0.6+)

## Request-Body streamen: `readBody()`

Standardmäßig erhält der Handler den bereits vollständig gelesenen Body (`HttpRequest::getBody()`).
Mit `HttpServerConfig::setBodyStreamingEnabled(true)` legen die H1/H2-Parser DATA-Chunks in eine
Per-Request-FIFO, und der Handler liest sie einzeln über `HttpRequest::readBody()`.

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

### Semantik

- Ein `readBody()`-Aufruf liefert **einen** parser-supplied Chunk:
  - H2 DATA-Frame (per Default bis 16 KiB),
  - llhttp `on_body` Slice (begrenzt durch den H1-Read-Buffer = 8 KiB).
- Bei leerer Queue parkt die Coroutine auf einem Per-Request-Trigger-Event.
- Bei EOF wird `null` zurückgegeben (idempotent).
- Bei Stream-Fehler (Peer-Reset, Überschreitung von `max_body_size`) wird `\Exception` geworfen.
- Der Parameter `$maxLen` ist derzeit für zukünftiges Coalesce reserviert und wird ignoriert. Die
  Signatur bleibt binary-compatible mit dem kommenden Refinement (Issue #26).

### Wann aktivieren

- Große Uploads (Logs, Medien, Backups)
- Streaming-Parsing (NDJSON, MessagePack Stream)
- Services, deren Tail-Latency unter Body-im-RAM-Halten leidet
- Multipart streamt **immer**, unabhängig von `setBodyStreamingEnabled()`

Wann **nicht** aktivieren: REST-Endpoints, bei denen der Body kompakt ist und der Umgang mit
`getBody()`/`getPost()`/`getQuery()` als Ganzes bequemer ist. Ein Combined-Mode (Stream nur, wenn
Body > X) wird nicht unterstützt; `getBody()` im Streaming-Modus wirft `LogicException` (in der
Roadmap eingeplant).

### Memory Footprint

Bei 50 parallelen 20-MiB-POSTs (h2load, WSL2): Peak-RSS fällt von 1170 MiB auf **197 MiB** (×6).
Der Durchsatz steigt von 36 req/s auf **100 req/s** (×2.7), weil der Handler-Dispatch nicht mehr
auf den vollständigen Body wartet.

## Response streamen: `send()` / `sendable()`

Die einfachste Antwort über `setBody()` / `json()` / `html()` / `redirect()` wird in einem Stück
gesendet.

Für eine Streaming-Antwort (chunked H1, DATA-Frames H2) wird `send($chunk)` verwendet:

```php
$server->addHttpHandler(function ($req, $res) {
    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setNoCompression();   // SSE: Events sollen den Client sofort erreichen

    // Der erste send() committet Status + Header (die danach nicht mehr änderbar sind)
    foreach (generateEvents() as $event) {
        $res->send("data: " . json_encode($event) . "\n\n");
    }
});
```

### Backpressure

`send()` blockiert die Handler-Coroutine **nur** unter Backpressure: wenn der Per-Stream-Staging-Buffer
voll ist. Im Normalfall kehrt sie sofort zurück.

HTTP/2: Backpressure greift bei vollen Ring-Slots **oder** bei Überschreitung von
`HttpServerConfig::setStreamWriteBufferBytes()` (Default 256 KiB).
HTTP/1 chunked: nutzt den Kernel-Send-Buffer.

### `sendable()`

Advisory Non-Blocking-Check: gibt `true` zurück, wenn `send()` einen Chunk ohne Suspend der Coroutine
annimmt. `false` bedeutet: `send()` würde blockieren, oder die Response wurde von `sendFile()`
versiegelt / geschlossen, oder es handelt sich um keinen streaming-fähigen Antworttyp.

```php
foreach ($events as $event) {
    if (!$res->sendable()) {
        // wir wollen nicht auf einen langsamen Client warten, machen anderes
        $event->save();   // in die DB schreiben
        continue;
    }
    $res->send($event->encode());
}
```

`send()` ist **immer** sicher aufrufbar, unabhängig von `sendable()`. Letzteres gibt dem Handler
lediglich die Möglichkeit, andere Arbeit zu erledigen, statt auf einem langsamen Peer zu blockieren.

## HTTP/2 Trailers

HTTP/2 unterstützt einen HEADERS-Frame nach dem Body (Trailers). Kanonischer Consumer ist gRPC
(`grpc-status` im Trailer).

```php
$res->setStatusCode(200);
$res->send($body);
$res->setTrailer('grpc-status', '0');
$res->setTrailer('grpc-message', 'OK');
```

Bulk-Set:

```php
$res->setTrailers(['grpc-status' => '0', 'grpc-message' => 'OK']);
$res->resetTrailers();   // alle entfernen
$res->getTrailers();
```

Auf HTTP/1.1 wird der Wert **stillschweigend ignoriert**: Trailer-Emission via Chunked Encoding ist
nicht Teil von Step 5b.

> Trailer-Namen werden in Kleinbuchstaben geschrieben (RFC 9113 §8.2.2); Großbuchstaben werden
> automatisch konvertiert.

## Siehe auch

- [`HttpServerConfig::setBodyStreamingEnabled()`](/de/docs/reference/server/http-server-config.html#setbodystreamingenabled)
- [`HttpServerConfig::setStreamWriteBufferBytes()`](/de/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
- [`HttpRequest::readBody()`](/de/docs/reference/server/http-request.html#readbody)
- [`HttpResponse::send()`](/de/docs/reference/server/http-response.html#send)
- [`HttpResponse::sendable()`](/de/docs/reference/server/http-response.html#sendable)
- [`HttpResponse::setTrailer()`](/de/docs/reference/server/http-response.html#settrailer)
