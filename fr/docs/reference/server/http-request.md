---
layout: docs
lang: fr
path_key: "/docs/reference/server/http-request.html"
nav_active: docs
permalink: /fr/docs/reference/server/http-request.html
page_title: "TrueAsync\\HttpRequest"
description: "TrueAsync\\HttpRequest — représentation read-only d'une requête HTTP : méthode, URI, en-têtes, corps, query, multipart, W3C Trace Context, body streaming."
---

# TrueAsync\HttpRequest

(PHP 8.6+, true_async_server 0.6+)

Objet read-only passé en premier paramètre au handler. Créé par le serveur — pas instancié par
l'utilisateur.

```php
namespace TrueAsync;

final class HttpRequest
{
    // --- général ---
    public function getMethod(): string;
    public function getUri(): string;
    public function getPath(): string;
    public function getHttpVersion(): string;
    public function isKeepAlive(): bool;

    // --- query ---
    public function getQuery(): array;
    public function getQueryParam(string $name, mixed $default = null): mixed;

    // --- en-têtes ---
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function getContentType(): ?string;
    public function getContentLength(): ?int;

    // --- corps ---
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

## Général

### getMethod

```php
public HttpRequest::getMethod(): string
```

`"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, etc.

### getUri

```php
public HttpRequest::getUri(): string
```

URI complète de la requête — path + query string.

### getPath

```php
public HttpRequest::getPath(): string
```

Path sans query-string. Par exemple `/search` à partir de `/search?q=hello`. Uniforme pour
HTTP/1.1, HTTP/2 (`:path` pseudo-header) et HTTP/3. Avec `getQuery()`, partage un parse paresseux —
l'URI est splittée en path/query au premier accès et cachée dans la struct request.

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

Tous les paramètres query sous forme de tableau associatif — équivalent de `$_GET`. Supporte le
percent-decoding, `+`-as-space, la notation PHP array (`foo[]`, `foo[bar]`). Le parsing est
délégué à `php_default_treat_data(PARSE_STRING, ...)` — la même fonction qui remplit `$_GET`.

### getQueryParam

```php
public HttpRequest::getQueryParam(string $name, mixed $default = null): mixed
```

Un paramètre par nom, ou `$default` (par défaut `null`) s'il est absent.

## En-têtes

### hasHeader

```php
public HttpRequest::hasHeader(string $name): bool
```

Case-insensitive.

### getHeader

```php
public HttpRequest::getHeader(string $name): ?string
```

Une valeur, case-insensitive. `null` s'il n'y en a pas.

### getHeaderLine

```php
public HttpRequest::getHeaderLine(string $name): string
```

Toutes les valeurs jointes par une virgule. Chaîne vide s'il n'y en a pas.

### getHeaders

```php
public HttpRequest::getHeaders(): array
```

Tous les en-têtes. Noms en **minuscules**.

### getContentType

```php
public HttpRequest::getContentType(): ?string
```

Valeur de `Content-Type`, ou `null`.

### getContentLength

```php
public HttpRequest::getContentLength(): ?int
```

`Content-Length` ou `null` (absent ou invalide).

## Corps

### getBody

```php
public HttpRequest::getBody(): string
```

Corps de la requête. Chaîne vide s'il n'y a pas de body.

> En mode streaming-body (`HttpServerConfig::setBodyStreamingEnabled(true)`), `getBody()` lève —
> il faut lire via `readBody()`.

### hasBody

```php
public HttpRequest::hasBody(): bool
```

### awaitBody

```php
public HttpRequest::awaitBody(): static
```

Attendre le corps complet. Depuis Phase 6 Step 3+, le handler peut être appelé **immédiatement
après parsed-headers**, avant la réception du corps. `awaitBody()` suspend la coroutine jusqu'au
message-complete.

Quand le corps est déjà entièrement en buffer (le défaut actuel), retourne immédiatement sans
suspend.

### readBody

```php
public HttpRequest::readBody(int $maxLen = 65536): ?string
```

Streaming pull-based du corps (issue #26). Renvoie **un** chunk fourni par le parseur :

- frame DATA H2 (≈ 16 KiB) ;
- slice `on_body` llhttp (limité par le read-buffer H1 = 8 KiB).

Comportement :

- File vide → la coroutine s'endort sur le trigger event par requête.
- EOF → `null` (idempotent).
- Erreur stream (peer reset, dépassement de `max_body_size`) → `\Exception`.
- `$maxLen` est réservé à une future optimisation de coalesce et est actuellement ignoré. La
  signature reste binary-compatible avec la finalisation à venir.

Disponible **uniquement** quand `HttpServerConfig::setBodyStreamingEnabled(true)`.

Voir [Streaming](/fr/docs/server/streaming.html).

## Multipart / form

### getPost

```php
public HttpRequest::getPost(): array
```

Données POST depuis `multipart/form-data` ou `application/x-www-form-urlencoded`. Supporte les
tableaux à la PHP : `name[]`, `user[name]`, `matrix[0][1]`.

### getFiles

```php
public HttpRequest::getFiles(): array
```

Tous les fichiers téléversés. Plusieurs fichiers avec un même nom :
`['photos' => [UploadedFile, UploadedFile, ...]]`.

### getFile

```php
public HttpRequest::getFile(string $name): ?UploadedFile
```

Un seul fichier par nom. Pour `photos[]` — le premier du tableau. `null` s'il n'y en a pas.

Voir [`UploadedFile`](/fr/docs/reference/server/uploaded-file.html).

## W3C Trace Context

Nécessite `HttpServerConfig::setTelemetryEnabled(true)`.

### getTraceParent

```php
public HttpRequest::getTraceParent(): ?string
```

`traceparent` brut tel qu'arrivé. `null` si absent / malformed / télémétrie désactivée.

### getTraceState

```php
public HttpRequest::getTraceState(): ?string
```

`tracestate` brut. `null` si absent / télémétrie désactivée.

### getTraceId

```php
public HttpRequest::getTraceId(): ?string
```

trace-id décodé sur 32 caractères hex minuscule, ou `null`.

### getSpanId

```php
public HttpRequest::getSpanId(): ?string
```

parent span-id décodé sur 16 caractères hex minuscule, ou `null`.

### getTraceFlags

```php
public HttpRequest::getTraceFlags(): ?int
```

Octet de flags décodé sur 8 bits (par ex. `0x01` = sampled), ou `null`.

## Exemple

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

## Voir aussi

- [`TrueAsync\HttpResponse`](/fr/docs/reference/server/http-response.html)
- [`TrueAsync\UploadedFile`](/fr/docs/reference/server/uploaded-file.html)
- [Streaming](/fr/docs/server/streaming.html)
