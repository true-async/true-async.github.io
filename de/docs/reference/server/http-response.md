---
layout: docs
lang: de
path_key: "/docs/reference/server/http-response.html"
nav_active: docs
permalink: /de/docs/reference/server/http-response.html
page_title: "TrueAsync\\HttpResponse"
description: "TrueAsync\\HttpResponse — Status, Header, Body, Streaming via send()/sendable(), Trailers HTTP/2, sendFile(), json(), html(), redirect()."
---

# TrueAsync\HttpResponse

(PHP 8.6+, true_async_server 0.6+)

Response-Objekt mit Fluent-Interface. Wird als zweiter Parameter an den Handler übergeben. Wird vom
Server erzeugt — nicht vom Benutzer konstruiert.

```php
namespace TrueAsync;

final class HttpResponse
{
    // status
    public function setStatusCode(int $code): static;
    public function getStatusCode(): int;
    public function setReasonPhrase(string $phrase): static;
    public function getReasonPhrase(): string;

    // headers
    public function setHeader(string $name, string|array $value): static;
    public function addHeader(string $name, string|array $value): static;
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function resetHeaders(): static;

    // trailers (HTTP/2)
    public function setTrailer(string $name, string $value): static;
    public function setTrailers(array $trailers): static;
    public function resetTrailers(): static;
    public function getTrailers(): array;

    // protocol introspection
    public function getProtocolName(): string;
    public function getProtocolVersion(): string;

    // body
    public function write(string $data): static;
    public function send(string $chunk): static;
    public function sendable(): bool;
    public function setNoCompression(): static;
    public function getBody(): string;
    public function setBody(string $body): static;
    public function getBodyStream(): mixed;       // TODO
    public function setBodyStream(mixed $stream): static;  // TODO

    // helpers
    public function json(array|string|object|null|int|float|bool $data, int $status = 200, int $flags = 0): static;
    public function html(string $html): static;
    public function redirect(string $url, int $status = 302): static;

    // send / state
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

## Status

### setStatusCode

```php
public HttpResponse::setStatusCode(int $code): static
```

HTTP-Code 100..599.

### getStatusCode

```php
public HttpResponse::getStatusCode(): int
```

### setReasonPhrase / getReasonPhrase

```php
public HttpResponse::setReasonPhrase(string $phrase): static
public HttpResponse::getReasonPhrase(): string
```

`"OK"`, `"Not Found"` usw.

## Header

### setHeader

```php
public HttpResponse::setHeader(string $name, string|array $value): static
```

Header setzen und vorhandene Werte ersetzen.

### addHeader

```php
public HttpResponse::addHeader(string $name, string|array $value): static
```

Wert zu vorhandenen hinzufügen (z. B. `Set-Cookie`).

### hasHeader / getHeader / getHeaderLine / getHeaders

```php
public HttpResponse::hasHeader(string $name): bool
public HttpResponse::getHeader(string $name): ?string
public HttpResponse::getHeaderLine(string $name): string
public HttpResponse::getHeaders(): array
```

Case-insensitives Lesen dessen, was der Handler gesetzt hat.

### resetHeaders

```php
public HttpResponse::resetHeaders(): static
```

Alle Header entfernen.

## Trailers (HTTP/2)

HEADERS-Frame, der nach dem Body gesendet wird. Kanonischer Consumer ist gRPC (`grpc-status`).
**Auf HTTP/1.1 wird der Wert stillschweigend ignoriert** — Trailer-Emission via Chunked Encoding ist
nicht im Scope von Step 5b.

### setTrailer

```php
public HttpResponse::setTrailer(string $name, string $value): static
```

Name — lowercase (RFC 9113 §8.2.2); Großbuchstaben werden automatisch konvertiert.

### setTrailers

```php
public HttpResponse::setTrailers(array $trailers): static
```

Bulk-Set. Vorhandene Trailers bleiben erhalten — für einen Clean Slate vorher `resetTrailers()` aufrufen.

### resetTrailers

```php
public HttpResponse::resetTrailers(): static
```

### getTrailers

```php
public HttpResponse::getTrailers(): array
```

## Protokoll

### getProtocolName / getProtocolVersion

```php
public HttpResponse::getProtocolName(): string     // immer "HTTP"
public HttpResponse::getProtocolVersion(): string  // "1.1", "2", "3"
```

## Body

### write

```php
public HttpResponse::write(string $data): static
```

Append in den internen Body-Buffer. Versendet wird bei `end()` / automatisch beim Rückkehr aus dem
Handler.

### send

```php
public HttpResponse::send(string $chunk): static
```

Chunk an den Client senden (Streaming).

- Der **erste** `send()` committet Status + Header — danach nicht mehr änderbar.
- Folgende — Append von DATA-Frames (HTTP/2) oder chunked Segments (HTTP/1).
- Blockiert die Handler-Coroutine **nur** unter Backpressure (Per-Stream-Staging-Buffer voll).
  Default-Schwelle: `setStreamWriteBufferBytes()` — 256 KiB.
- Im Normalfall kehrt es sofort zurück.

### sendable

```php
public HttpResponse::sendable(): bool
```

Advisory Non-Blocking-Check:

- `true` — `send()` nimmt den Chunk ohne Suspend an.
- `false` — `send()` blockiert auf Backpressure, oder die Response wurde von `sendFile()` versiegelt /
  ist geschlossen, oder es ist kein streaming-fähiger Antworttyp.

`send()` ist **immer** sicher aufrufbar — `sendable()` gibt dem Handler nur die Möglichkeit, andere
Arbeit zu erledigen, statt auf einem langsamen Peer zu blockieren.

### setNoCompression

```php
public HttpResponse::setNoCompression(): static
```

Komprimierung für diese Response verbieten — überschreibt Accept-Encoding, MIME-Whitelist und
Size-Threshold. Anwenden bei: BREACH-sensiblen Endpoints (Secrets + reflected User-Input), Payloads
mit bereits gesetztem `Content-Encoding`, Bodies, die der Server nicht wrappen soll. Idempotent.

### getBody / setBody

```php
public HttpResponse::getBody(): string
public HttpResponse::setBody(string $body): static
```

Get/Set des aktuellen Buffer-Inhalts.

## Helpers

### json

```php
public HttpResponse::json(
    array|string|object|null|int|float|bool $data,
    int $status = 200,
    int $flags  = 0
): static
```

JSON-Serialisierung über `php_json_encode_ex` (derselbe Pfad wie `json_encode()`):

- `array` / `object` / Skalar-`$data` → encoded.
- `string` `$data` → wird **wie es ist** gesendet (cached JSON, pre-built Bytes). Spart Re-Encoding.

`Content-Type: application/json` wird **nur** gesetzt, wenn der Handler keinen eigenen vergeben hat —
chainen Sie `setHeader('Content-Type', 'application/problem+json')->json($payload)` für einen
anderen Media-Type.

`$flags` — `JSON_*`-Bitmask. `0` — Server-Defaults aus
[`HttpServerConfig::setJsonEncodeFlags()`](/de/docs/reference/server/http-server-config.html#setjsonencodeflags-getjsonencodeflags)
(`JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES` out of the box).

`JSON_THROW_ON_ERROR` wird stillschweigend entfernt: ein Encoding-Fehler liefert eine `500` mit
JSON-Fehlerbody, eine Exception wird nicht durchgereicht. Der Handler sollte `json()` nie in einen
try/catch wrappen.

### html

```php
public HttpResponse::html(string $html): static
```

Setzt `Content-Type: text/html`.

### redirect

```php
public HttpResponse::redirect(string $url, int $status = 302): static
```

## Senden

### end

```php
public HttpResponse::end(?string $data = null): void
```

Antwort abschließen und an den Client senden. Nach `end()` darf nichts mehr geschrieben werden.

### sendFile

```php
public HttpResponse::sendFile(string $path, ?SendFileOptions $options = null): void
```

Handler-gesteuerte Dateiauslieferung. Schreibt Pfad + Optionen auf die Response und kehrt **sofort
zurück** — die Übertragung läuft in der Dispose-Phase über dieselbe FSM wie `StaticHandler` (MIME,
ETag, IMF-Date, Range, Conditional GET, Precompressed Sidecars).

**Nach `sendFile()` ist die Response sealed**: `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` / erneutes `sendFile()` werfen
`HttpServerRuntimeException`.

Der Pfad ist **vertrauenswürdig** (Handler hat über den Zugriff entschieden). Open/fstat-Fehler
(`ENOENT`, `EACCES`, oversize, non-regular) — 500, da die Header noch nicht auf dem Draht sind.

Compression Middleware wird für sendFile-Bodies umgangen (eigene Delivery-Pipeline).

> Der HTTP/3-Pfad für `sendFile()` ist noch in Arbeit; aktuell weist der H3-Dispose-Hook mit 500 zurück.

Siehe [`SendFileOptions`](/de/docs/reference/server/send-file-options.html).

## Server-Sent Events (text/event-stream)

(true_async_server 0.8+). Guide mit Beispielen: [SSE](/de/docs/server/sse.html).

### sseStart

```php
public HttpResponse::sseStart(): static
```

Schaltet die Antwort in den SSE-Modus und schreibt die Header fest: `Content-Type:
text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, und markiert
die Antwort als nicht komprimierbar. Die Antwort geht in den Streaming-Modus über, genau wie es
das erste `send()` tun würde: Status und Header werden committet und können nicht mehr geändert
werden, aber der Event-Payload selbst ist noch nicht auf dem Draht.

Der Aufruf ist optional: der erste `sseEvent()`/`sseComment()` startet den Stream ebenfalls von
sich aus. `sseStart()` allein flusht Statuszeile und Header **nicht**: das Commit ist lazy und
erfolgt beim ersten `sseEvent()`/`sseComment()`/`sseRetry()` (wird nie einer davon aufgerufen,
wird beim Ende der Antwort ein leeres `200 text/event-stream` geflusht). Um den Stream sofort zu
öffnen, zum Beispiel um das `onopen` des Browsers freizuschalten, bevor ein echtes Event bereit
ist, senden Sie ein initiales `sseComment()`.

Wirft `HttpServerInvalidArgumentException`, wenn der Handler bereits einen anderen `Content-Type`
als `text/event-stream` gesetzt hat, und `HttpServerRuntimeException`, wenn die Antwort bereits
streamt, geschlossen ist oder mit `sendFile()` beschäftigt ist.

### sseEvent

```php
public HttpResponse::sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null
): static
```

Formatiert und sendet ein SSE-Event, startet den Stream bei Bedarf. Mehrzeiliges `$data` wird an
`\n`/`\r\n`/`\r` aufgeteilt und als mehrere `data:`-Felder gesendet (WHATWG §9.2). `$event`, `$id`
und `$retry` werden nur eingefügt, wenn sie nicht `null` sind. Der Datensatz endet mit einer
Leerzeile, damit der Browser das Event sofort verarbeitet.

`$event` und `$id` dürfen kein `\r`/`\n` enthalten (sonst würde der Parser das als
Feld-/Datensatztrenner lesen), und `$id` darf kein NUL enthalten: Verstöße werfen
`HttpServerInvalidArgumentException`. `$retry` muss nicht-negativ sein.

`$data === ""` ist ebenfalls ein gültiger Wert, er löst ein leeres `MessageEvent` aus. Alle vier
Argumente auf `null` gesetzt ist ein No-op; der `EventSource`-Parser überspringt ein Event ohne
`data` und ohne `retry`.

### sseComment

```php
public HttpResponse::sseComment(string $text = ""): static
```

Sendet eine Kommentarzeile (ein Datensatz, der mit `:` beginnt). Browser ignorieren Kommentare,
aber sie halten die Verbindung durch die Idle-Timeouts zwischengeschalteter Proxys am Leben
(nginx' `proxy_read_timeout`, standardmäßig 60s). Der kanonische Payload ist ein leerer String
(`:\n\n` auf dem Draht). `$text` darf kein `\r`/`\n` enthalten. Startet den Stream, falls er noch
nicht läuft.

### sseRetry

```php
public HttpResponse::sseRetry(int $milliseconds): static
```

Sendet eine bloße `retry:`-Direktive, die dem Browser mitteilt, wie viele Millisekunden er warten
soll, bevor er nach einem Abbruch des Streams erneut verbindet. Zucker für
`sseEvent(retry: $milliseconds)` ohne Payload. Startet den Stream, falls er noch nicht läuft.

## State

### isHeadersSent

```php
public HttpResponse::isHeadersSent(): bool
```

### isClosed

```php
public HttpResponse::isClosed(): bool
```

## Beispiel

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

## Siehe auch

- [`TrueAsync\HttpRequest`](/de/docs/reference/server/http-request.html)
- [`TrueAsync\SendFileOptions`](/de/docs/reference/server/send-file-options.html)
- [SSE](/de/docs/server/sse.html)
- [Streaming](/de/docs/server/streaming.html)
- [Komprimierung](/de/docs/server/compression.html)
