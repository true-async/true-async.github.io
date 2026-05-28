---
layout: docs
lang: it
path_key: "/docs/reference/server/http-request.html"
nav_active: docs
permalink: /it/docs/reference/server/http-request.html
page_title: "TrueAsync\\HttpRequest"
description: "TrueAsync\\HttpRequest: rappresentazione read-only di una richiesta HTTP: metodo, URI, header, corpo, query, multipart, W3C Trace Context, streaming del corpo."
---

# TrueAsync\HttpRequest

(PHP 8.6+, true_async_server 0.6+)

Oggetto read-only passato come primo parametro all'handler. È creato dal server e non viene costruito
dall'utente.

```php
namespace TrueAsync;

final class HttpRequest
{
    // --- generali ---
    public function getMethod(): string;
    public function getUri(): string;
    public function getPath(): string;
    public function getHttpVersion(): string;
    public function isKeepAlive(): bool;

    // --- query ---
    public function getQuery(): array;
    public function getQueryParam(string $name, mixed $default = null): mixed;

    // --- header ---
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function getContentType(): ?string;
    public function getContentLength(): ?int;

    // --- corpo ---
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

## Generali

### getMethod

```php
public HttpRequest::getMethod(): string
```

`"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, ecc.

### getUri

```php
public HttpRequest::getUri(): string
```

URI completo della richiesta: path + query string.

### getPath

```php
public HttpRequest::getPath(): string
```

Path senza la query string. Ad esempio `/search` da `/search?q=hello`. Uniforme per HTTP/1.1,
HTTP/2 (pseudo-header `:path`) e HTTP/3. Insieme a `getQuery()` usa un singolo parsing lazy: l'URI
viene separato in path/query alla prima richiesta e messo in cache nella request-struct.

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

Tutti i parametri di query come array associativo: equivalente a `$_GET`. Supporta percent-decoding,
`+`-come-spazio, notazione array di PHP (`foo[]`, `foo[bar]`). Il parsing è delegato a
`php_default_treat_data(PARSE_STRING, ...)`, la stessa funzione che popola `$_GET`.

### getQueryParam

```php
public HttpRequest::getQueryParam(string $name, mixed $default = null): mixed
```

Un singolo parametro per nome, oppure `$default` (predefinito `null`) se assente.

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

Un valore, case-insensitive. `null` se assente.

### getHeaderLine

```php
public HttpRequest::getHeaderLine(string $name): string
```

Tutti i valori uniti da virgola. Stringa vuota se assente.

### getHeaders

```php
public HttpRequest::getHeaders(): array
```

Tutti gli header. Nomi in **lowercase**.

### getContentType

```php
public HttpRequest::getContentType(): ?string
```

Valore di `Content-Type`, oppure `null`.

### getContentLength

```php
public HttpRequest::getContentLength(): ?int
```

`Content-Length` oppure `null` (assente o non valido).

## Corpo

### getBody

```php
public HttpRequest::getBody(): string
```

Corpo della richiesta. Stringa vuota se non c'è corpo.

> In modalità streaming del corpo (`HttpServerConfig::setBodyStreamingEnabled(true)`) `getBody()`
> lancia un'eccezione: leggi tramite `readBody()`.

### hasBody

```php
public HttpRequest::hasBody(): bool
```

### awaitBody

```php
public HttpRequest::awaitBody(): static
```

Attende il corpo completo. Dal Phase 6 Step 3+ l'handler può essere chiamato **subito dopo gli
header parsati**, prima della ricezione del corpo. `awaitBody()` sospende la coroutine fino al
message-complete.

Quando il corpo è già interamente nel buffer (default attuale), ritorna subito senza sospendere.

### readBody

```php
public HttpRequest::readBody(int $maxLen = 65536): ?string
```

Stream pull-based del corpo (issue #26). Restituisce **un** blocco fornito dal parser per chiamata:

- frame DATA H2 (≈ 16 KiB);
- slice da `on_body` di llhttp (limitato al read buffer H1: 8 KiB).

Comportamento:

- Coda vuota → la coroutine si sospende su un trigger event della richiesta.
- EOF → `null` (idempotente).
- Errore di stream (peer reset, superamento di `max_body_size`) → `\Exception`.
- `$maxLen` è riservato a una futura coalesce-optimization, ora viene ignorato. La firma resta
  binary-compatible con gli sviluppi futuri.

Disponibile **solo** con `HttpServerConfig::setBodyStreamingEnabled(true)`.

Vedi [Streaming](/it/docs/server/streaming.html).

## Multipart / form

### getPost

```php
public HttpRequest::getPost(): array
```

Dati POST da `multipart/form-data` o `application/x-www-form-urlencoded`. Supporta gli array stile
PHP: `name[]`, `user[name]`, `matrix[0][1]`.

### getFiles

```php
public HttpRequest::getFiles(): array
```

Tutti i file caricati. Più file con lo stesso nome:
`['photos' => [UploadedFile, UploadedFile, ...]]`.

### getFile

```php
public HttpRequest::getFile(string $name): ?UploadedFile
```

Un singolo file per nome. Per `photos[]`: il primo dell'array. `null` se assente.

Vedi [`UploadedFile`](/it/docs/reference/server/uploaded-file.html).

## W3C Trace Context

Richiede `HttpServerConfig::setTelemetryEnabled(true)`.

### getTraceParent

```php
public HttpRequest::getTraceParent(): ?string
```

`traceparent` grezzo, così com'è arrivato. `null` se assente / malformato / telemetria disattivata.

### getTraceState

```php
public HttpRequest::getTraceState(): ?string
```

`tracestate` grezzo. `null` se assente / telemetria disattivata.

### getTraceId

```php
public HttpRequest::getTraceId(): ?string
```

Trace-id decodificato (32 caratteri lower-hex), oppure `null`.

### getSpanId

```php
public HttpRequest::getSpanId(): ?string
```

Parent span-id decodificato (16 caratteri lower-hex), oppure `null`.

### getTraceFlags

```php
public HttpRequest::getTraceFlags(): ?int
```

Byte di flags decodificato a 8 bit (ad esempio `0x01` = sampled), oppure `null`.

## Esempio

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

## Vedi anche

- [`TrueAsync\HttpResponse`](/it/docs/reference/server/http-response.html)
- [`TrueAsync\UploadedFile`](/it/docs/reference/server/uploaded-file.html)
- [Streaming](/it/docs/server/streaming.html)
