---
layout: docs
lang: de
path_key: "/docs/reference/server/http-request.html"
nav_active: docs
permalink: /de/docs/reference/server/http-request.html
page_title: "TrueAsync\\HttpRequest"
description: "TrueAsync\\HttpRequest — read-only Repräsentation einer HTTP-Anfrage: Methode, URI, Header, Body, Query, Multipart, W3C Trace Context, Body Streaming."
---

# TrueAsync\HttpRequest

(PHP 8.6+, true_async_server 0.6+)

Read-only Objekt, das als erster Parameter an den Handler übergeben wird. Wird vom Server erzeugt —
nicht vom Benutzer konstruiert.

```php
namespace TrueAsync;

final class HttpRequest
{
    // --- allgemein ---
    public function getMethod(): string;
    public function getUri(): string;
    public function getPath(): string;
    public function getHttpVersion(): string;
    public function isKeepAlive(): bool;

    // --- query ---
    public function getQuery(): array;
    public function getQueryParam(string $name, mixed $default = null): mixed;

    // --- headers ---
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function getContentType(): ?string;
    public function getContentLength(): ?int;

    // --- body ---
    public function getBody(): string;
    public function hasBody(): bool;
    public function awaitBody(): static;
    public function readBody(int $maxLen = 65536): ?string;

    // --- multipart / form ---
    public function getPost(): array;
    public function getFiles(): array;
    public function getFile(string $name): ?UploadedFile;

    // --- W3C Trace Context ---
    public function getTraceParent(): ?string;
    public function getTraceState(): ?string;
    public function getTraceId(): ?string;
    public function getSpanId(): ?string;
    public function getTraceFlags(): ?int;
}
```

## Allgemein

### getMethod

```php
public HttpRequest::getMethod(): string
```

`"GET"`, `"POST"`, `"PUT"`, `"DELETE"` usw.

### getUri

```php
public HttpRequest::getUri(): string
```

Vollständige Request-URI — Pfad + Query-String.

### getPath

```php
public HttpRequest::getPath(): string
```

Pfad ohne Query-String. Beispiel: `/search` aus `/search?q=hello`. Einheitlich für HTTP/1.1, HTTP/2
(`:path` Pseudo-Header) und HTTP/3. Gemeinsam mit `getQuery()` nutzt es einen lazy Parse — die URI
wird beim ersten Zugriff in Path/Query gesplittet und in der Request-Struct gecacht.

### getHttpVersion

```php
public HttpRequest::getHttpVersion(): string
```

`"1.1"`, `"2"`, `"3"`.

### isKeepAlive

```php
public HttpRequest::isKeepAlive(): bool
```

## Query

### getQuery

```php
public HttpRequest::getQuery(): array
```

Alle Query-Parameter als assoziatives Array — Pendant zu `$_GET`. Unterstützt Percent-Decoding,
`+`-as-space, PHP-Array-Notation (`foo[]`, `foo[bar]`). Parsing delegiert an
`php_default_treat_data(PARSE_STRING, ...)` — dieselbe Funktion, die `$_GET` befüllt.

### getQueryParam

```php
public HttpRequest::getQueryParam(string $name, mixed $default = null): mixed
```

Ein Parameter per Name oder `$default` (Default `null`) falls nicht vorhanden.

## Header

### hasHeader

```php
public HttpRequest::hasHeader(string $name): bool
```

Case-insensitive.

### getHeader

```php
public HttpRequest::getHeader(string $name): ?string
```

Ein Wert, case-insensitive. `null` falls nicht vorhanden.

### getHeaderLine

```php
public HttpRequest::getHeaderLine(string $name): string
```

Alle Werte durch Komma verbunden. Leerer String falls nicht vorhanden.

### getHeaders

```php
public HttpRequest::getHeaders(): array
```

Alle Header. Namen in **lowercase**.

### getContentType

```php
public HttpRequest::getContentType(): ?string
```

Wert von `Content-Type` oder `null`.

### getContentLength

```php
public HttpRequest::getContentLength(): ?int
```

`Content-Length` oder `null` (nicht vorhanden oder ungültig).

## Body

### getBody

```php
public HttpRequest::getBody(): string
```

Request-Body. Leerer String, wenn kein Body.

> Im Streaming-Body-Modus (`HttpServerConfig::setBodyStreamingEnabled(true)`) wirft `getBody()` —
> über `readBody()` lesen.

### hasBody

```php
public HttpRequest::hasBody(): bool
```

### awaitBody

```php
public HttpRequest::awaitBody(): static
```

Auf den vollständigen Body warten. Seit Phase 6 Step 3+ kann der Handler **sofort nach Parsed-Headers**
aufgerufen werden, vor Empfang des Bodys. `awaitBody()` suspendiert die Coroutine bis Message-Complete.

Liegt der Body bereits vollständig im Buffer (aktueller Default), kehrt es sofort ohne Suspend zurück.

### readBody

```php
public HttpRequest::readBody(int $maxLen = 65536): ?string
```

Pull-basiertes Streaming des Bodys (Issue #26). Liefert **einen** parser-supplied Chunk pro Aufruf:

- H2 DATA-Frame (≈ 16 KiB);
- llhttp `on_body`-Slice (begrenzt durch H1-Read-Buffer — 8 KiB).

Verhalten:

- Leere Queue → Coroutine parkt auf einem Per-Request-Trigger-Event.
- EOF → `null` (idempotent).
- Stream-Fehler (Peer-Reset, Überschreitung von `max_body_size`) → `\Exception`.
- `$maxLen` ist für ein künftiges Coalesce-Refinement reserviert und wird derzeit ignoriert. Die
  Signatur bleibt binary-compatible mit dem geplanten Refinement.

Verfügbar **nur** bei `HttpServerConfig::setBodyStreamingEnabled(true)`.

Siehe [Streaming](/de/docs/server/streaming.html).

## Multipart / Form

### getPost

```php
public HttpRequest::getPost(): array
```

POST-Daten aus `multipart/form-data` oder `application/x-www-form-urlencoded`. Unterstützt
PHP-Style-Arrays: `name[]`, `user[name]`, `matrix[0][1]`.

### getFiles

```php
public HttpRequest::getFiles(): array
```

Alle hochgeladenen Dateien. Mehrere Dateien mit demselben Namen:
`['photos' => [UploadedFile, UploadedFile, ...]]`.

### getFile

```php
public HttpRequest::getFile(string $name): ?UploadedFile
```

Eine Datei per Name. Für `photos[]` — die erste aus dem Array. `null` falls nicht vorhanden.

Siehe [`UploadedFile`](/de/docs/reference/server/uploaded-file.html).

## W3C Trace Context

Benötigt `HttpServerConfig::setTelemetryEnabled(true)`.

### getTraceParent

```php
public HttpRequest::getTraceParent(): ?string
```

Rohes `traceparent`, wie es ankam. `null` falls nicht vorhanden / malformed / Telemetry aus.

### getTraceState

```php
public HttpRequest::getTraceState(): ?string
```

Rohes `tracestate`. `null` falls nicht vorhanden / Telemetry aus.

### getTraceId

```php
public HttpRequest::getTraceId(): ?string
```

Dekodierte 32-Zeichen-lower-hex Trace-ID oder `null`.

### getSpanId

```php
public HttpRequest::getSpanId(): ?string
```

Dekodierte 16-Zeichen-lower-hex Parent-Span-ID oder `null`.

### getTraceFlags

```php
public HttpRequest::getTraceFlags(): ?int
```

Dekodiertes 8-Bit Flags-Byte (z. B. `0x01` — sampled) oder `null`.

## Beispiel

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    error_log(sprintf(
        "[%s] %s %s (HTTP/%s, body=%s, traceid=%s)",
        $req->getMethod(),
        $req->getPath(),
        $req->getQuery() ? json_encode($req->getQuery()) : '-',
        $req->getHttpVersion(),
        $req->getContentLength() ?? 'n/a',
        $req->getTraceId() ?? '-'
    ));

    if ($req->getMethod() === 'POST' && $req->getContentType() === 'application/json') {
        $body = json_decode($req->getBody(), true);
        // ...
    }

    $res->json(['ok' => true]);
});
```

## Siehe auch

- [`TrueAsync\HttpResponse`](/de/docs/reference/server/http-response.html)
- [`TrueAsync\UploadedFile`](/de/docs/reference/server/uploaded-file.html)
- [Streaming](/de/docs/server/streaming.html)
