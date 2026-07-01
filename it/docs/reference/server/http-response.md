---
layout: docs
lang: it
path_key: "/docs/reference/server/http-response.html"
nav_active: docs
permalink: /it/docs/reference/server/http-response.html
page_title: "TrueAsync\\HttpResponse"
description: "TrueAsync\\HttpResponse: stato, header, corpo, streaming tramite send()/sendable(), trailer HTTP/2, sendFile(), json(), html(), redirect()."
---

# TrueAsync\HttpResponse

(PHP 8.6+, true_async_server 0.6+)

Oggetto risposta con interfaccia fluent. Passato come secondo parametro all'handler. È creato dal
server e non viene costruito dall'utente.

```php
namespace TrueAsync;

final class HttpResponse
{
    // stato
    public function setStatusCode(int $code): static;
    public function getStatusCode(): int;
    public function setReasonPhrase(string $phrase): static;
    public function getReasonPhrase(): string;

    // header
    public function setHeader(string $name, string|array $value): static;
    public function addHeader(string $name, string|array $value): static;
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function resetHeaders(): static;

    // trailer (HTTP/2)
    public function setTrailer(string $name, string $value): static;
    public function setTrailers(array $trailers): static;
    public function resetTrailers(): static;
    public function getTrailers(): array;

    // introspezione del protocollo
    public function getProtocolName(): string;
    public function getProtocolVersion(): string;

    // corpo
    public function write(string $data): static;
    public function send(string $chunk): static;
    public function sendable(): bool;
    public function setNoCompression(): static;
    public function getBody(): string;
    public function setBody(string $body): static;
    public function getBodyStream(): mixed;       // TODO
    public function setBodyStream(mixed $stream): static;  // TODO

    // helper
    public function json(array|string|object|null|int|float|bool $data, int $status = 200, int $flags = 0): static;
    public function html(string $html): static;
    public function redirect(string $url, int $status = 302): static;

    // send / stato
    public function end(?string $data = null): void;
    public function sendFile(string $path, ?SendFileOptions $options = null): void;

    // Server-Sent Events (text/event-stream)
    public function sseStart(): static;
    public function sseEvent(?string $data = null, ?string $event = null, ?string $id = null, ?int $retry = null): static;
    public function sseComment(string $text = ""): static;
    public function sseRetry(int $milliseconds): static;

    public function isHeadersSent(): bool;
    public function isClosed(): bool;
}
```

## Stato

### setStatusCode

```php
public HttpResponse::setStatusCode(int $code): static
```

Codice HTTP 100..599.

### getStatusCode

```php
public HttpResponse::getStatusCode(): int
```

### setReasonPhrase / getReasonPhrase

```php
public HttpResponse::setReasonPhrase(string $phrase): static
public HttpResponse::getReasonPhrase(): string
```

`"OK"`, `"Not Found"`, ecc.

## Header

### setHeader

```php
public HttpResponse::setHeader(string $name, string|array $value): static
```

Imposta un header, sostituendo i valori precedenti.

### addHeader

```php
public HttpResponse::addHeader(string $name, string|array $value): static
```

Aggiunge un valore agli esistenti (es. `Set-Cookie`).

### hasHeader / getHeader / getHeaderLine / getHeaders

```php
public HttpResponse::hasHeader(string $name): bool
public HttpResponse::getHeader(string $name): ?string
public HttpResponse::getHeaderLine(string $name): string
public HttpResponse::getHeaders(): array
```

Lettura case-insensitive di quanto impostato dall'handler.

### resetHeaders

```php
public HttpResponse::resetHeaders(): static
```

Rimuove tutti gli header.

## Trailer (HTTP/2)

Frame HEADERS inviato dopo il corpo. Consumatore canonico: gRPC (`grpc-status`).
**Su HTTP/1.1 il valore viene ignorato silenziosamente**: l'emissione dei trailer nella codifica
chunked non rientra in Step 5b.

### setTrailer

```php
public HttpResponse::setTrailer(string $name, string $value): static
```

Nome in lowercase (RFC 9113 §8.2.2); il maiuscolo viene convertito automaticamente.

### setTrailers

```php
public HttpResponse::setTrailers(array $trailers): static
```

Set in blocco. I trailer esistenti vengono mantenuti: per uno stato pulito chiama prima
`resetTrailers()`.

### resetTrailers

```php
public HttpResponse::resetTrailers(): static
```

### getTrailers

```php
public HttpResponse::getTrailers(): array
```

## Protocollo

### getProtocolName / getProtocolVersion

```php
public HttpResponse::getProtocolName(): string     // sempre "HTTP"
public HttpResponse::getProtocolVersion(): string  // "1.1", "2", "3"
```

## Corpo

### write

```php
public HttpResponse::write(string $data): static
```

Append nel buffer del corpo. L'invio avviene su `end()` / automaticamente al ritorno dall'handler.

### send

```php
public HttpResponse::send(string $chunk): static
```

Invia un blocco al client (streaming).

- Il **primo** `send()` consolida stato + header: non sono più modificabili.
- I successivi aggiungono frame DATA (HTTP/2) o chunk (HTTP/1).
- Sospende la coroutine dell'handler **solo** in caso di contropressione (staging buffer per stream
  pieno). Soglia di contropressione predefinita: `setStreamWriteBufferBytes()` — 256 KiB.
- In condizioni normali ritorna subito.

### sendable

```php
public HttpResponse::sendable(): bool
```

Controllo informativo non bloccante:

- `true`: `send()` accetterà un blocco senza sospendere la coroutine.
- `false`: `send()` si bloccherà per contropressione, oppure la risposta è già sigillata da
  `sendFile()` / chiusa, oppure il tipo di risposta non è capace di streaming.

`send()` è **sempre** sicuro da chiamare: `sendable()` dà solo all'handler la possibilità di
occuparsi di altro lavoro invece di bloccarsi su un peer lento.

### setNoCompression

```php
public HttpResponse::setNoCompression(): static
```

Disattiva la compressione per questa risposta: ha la precedenza su Accept-Encoding, whitelist MIME e
soglia di dimensione. Da usare su endpoint sensibili a BREACH (segreti + input utente riflesso),
payload con `Content-Encoding` già impostato, corpi che il server non deve incapsulare. Idempotente.

### getBody / setBody

```php
public HttpResponse::getBody(): string
public HttpResponse::setBody(string $body): static
```

Get/set del contenuto corrente del buffer.

## Helper

### json

```php
public HttpResponse::json(
    array|string|object|null|int|float|bool $data,
    int $status = 200,
    int $flags  = 0
): static
```

Serializzazione JSON tramite `php_json_encode_ex` (lo stesso path di `json_encode()`):

- `array` / `object` / scalare `$data` → codificato.
- `string` `$data` → inviato **così com'è** (JSON in cache, byte già pronti). Niente ricodifica.

`Content-Type: application/json` viene impostato **solo** se l'handler non ne ha già impostato uno —
incatena `setHeader('Content-Type', 'application/problem+json')->json($payload)` per un media-type
diverso.

`$flags`: bitmask `JSON_*`. `0`: default del server da
[`HttpServerConfig::setJsonEncodeFlags()`](/it/docs/reference/server/http-server-config.html#setjsonencodeflags-getjsonencodeflags)
(`JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES` di fabbrica).

`JSON_THROW_ON_ERROR` viene rimosso silenziosamente: un errore di encode produce un `500` di errore
JSON, l'eccezione non viene propagata. L'handler non deve mai avvolgere `json()` in try/catch.

### html

```php
public HttpResponse::html(string $html): static
```

Imposta `Content-Type: text/html`.

### redirect

```php
public HttpResponse::redirect(string $url, int $status = 302): static
```

## Invio

### end

```php
public HttpResponse::end(?string $data = null): void
```

Termina la risposta e la invia al client. Dopo `end()` non si può più scrivere nulla.

### sendFile

```php
public HttpResponse::sendFile(string $path, ?SendFileOptions $options = null): void
```

Consegna del file pilotata dall'handler. Registra path + options sulla risposta e **ritorna subito**:
il trasferimento avviene in fase di dispose tramite la stessa FSM di `StaticHandler` (MIME, ETag,
IMF-date, Range, GET condizionali, sidecar precompressi).

**Dopo `sendFile()` la risposta è sigillata**: `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` / un altro `sendFile()` lanciano
`HttpServerRuntimeException`.

Il path è **fidato** (l'handler ha già deciso sull'accesso). Gli errori di open/fstat (`ENOENT`,
`EACCES`, oversize, non regolare) producono 500, perché gli header non sono ancora sulla rete.

Il middleware di compressione viene bypassato per i corpi sendFile (pipeline di consegna dedicata).

> Il path HTTP/3 per `sendFile()` è in lavorazione; per ora il dispose-hook H3 rifiuta con 500.

Vedi [`SendFileOptions`](/it/docs/reference/server/send-file-options.html).

## Server-Sent Events (text/event-stream)

(true_async_server 0.8+). Guida con esempi: [SSE](/it/docs/server/sse.html).

### sseStart

```php
public HttpResponse::sseStart(): static
```

Passa la risposta in modalità SSE e blocca gli header: `Content-Type: text/event-stream`,
`Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, e marca la risposta come non
comprimibile. La risposta entra in modalità streaming allo stesso modo del primo `send()`: lo
stato e gli header vengono consolidati e non possono più cambiare, ma il payload dell'evento vero
e proprio non è ancora sulla rete.

La chiamata è opzionale: il primo `sseEvent()`/`sseComment()` avvia lo stream da solo.
`sseStart()` da sola **non** invia sulla rete la status line e gli header: il commit è lazy e
avviene al primo `sseEvent()`/`sseComment()`/`sseRetry()` (se non viene mai chiamato nessuno, alla
chiusura della risposta viene inviato un `200 text/event-stream` vuoto). Per aprire lo stream
subito, ad esempio per sbloccare l'`onopen` del browser prima che ci sia un evento vero e proprio
pronto, invia un `sseComment()` iniziale.

Lancia `HttpServerInvalidArgumentException` se l'handler ha già impostato un `Content-Type`
diverso da `text/event-stream`, e `HttpServerRuntimeException` se la risposta sta già facendo
streaming, è chiusa o è occupata da `sendFile()`.

### sseEvent

```php
public HttpResponse::sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null
): static
```

Formatta e invia un evento SSE, avviando lo stream se necessario. Un `$data` multilinea viene
diviso su `\n`/`\r\n`/`\r` e inviato come più campi `data:` (WHATWG §9.2). `$event`, `$id` e
`$retry` sono inclusi solo quando non sono `null`. Il record termina con una riga vuota così il
browser dispatcha subito l'evento.

`$event` e `$id` non devono contenere `\r`/`\n` (altrimenti il parser li leggerebbe come
separatore di campo/record), e `$id` non deve contenere NUL: le violazioni lanciano
`HttpServerInvalidArgumentException`. `$retry` deve essere non negativo.

Anche `$data === ""` è un valore valido, dispatcha un `MessageEvent` vuoto. Tutti e quattro gli
argomenti a `null` è un no-op; il parser di `EventSource` salta un evento senza né `data` né
`retry`.

### sseComment

```php
public HttpResponse::sseComment(string $text = ""): static
```

Invia una riga di commento (un record che inizia con `:`). I browser ignorano i commenti, ma
mantengono viva la connessione attraverso i timeout di idle dei proxy intermedi
(`proxy_read_timeout` di nginx, 60s di default). Il payload canonico è una stringa vuota (`:\n\n`
sulla rete). `$text` non deve contenere `\r`/`\n`. Avvia lo stream se non è ancora in esecuzione.

### sseRetry

```php
public HttpResponse::sseRetry(int $milliseconds): static
```

Invia una direttiva `retry:` a sé stante che dice al browser quanti millisecondi attendere prima
di riconnettersi dopo la caduta dello stream. Zucchero sintattico per
`sseEvent(retry: $milliseconds)` senza payload. Avvia lo stream se non è ancora in esecuzione.

## Stato

### isHeadersSent

```php
public HttpResponse::isHeadersSent(): bool
```

### isClosed

```php
public HttpResponse::isClosed(): bool
```

## Esempio

```php
use TrueAsync\HttpResponse;
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, HttpResponse $res) {
    // SSE
    if ($req->getPath() === '/events') {
        foreach (loadEvents() as $event) {
            $res->sseEvent(json_encode($event));
        }
        $res->end();
        return;
    }

    // sendFile
    if ($req->getPath() === '/report.pdf') {
        $res->sendFile('/var/reports/q1.pdf', new SendFileOptions(
            disposition:  SendFileDisposition::ATTACHMENT,
            downloadName: 'Q1-Report.pdf',
        ));
        return;
    }

    // JSON
    $res->json(['ok' => true]);
});
```

## Vedi anche

- [`TrueAsync\HttpRequest`](/it/docs/reference/server/http-request.html)
- [`TrueAsync\SendFileOptions`](/it/docs/reference/server/send-file-options.html)
- [SSE](/it/docs/server/sse.html)
- [Streaming](/it/docs/server/streaming.html)
- [Compressione](/it/docs/server/compression.html)
