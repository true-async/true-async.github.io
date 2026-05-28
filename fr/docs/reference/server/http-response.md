---
layout: docs
lang: fr
path_key: "/docs/reference/server/http-response.html"
nav_active: docs
permalink: /fr/docs/reference/server/http-response.html
page_title: "TrueAsync\\HttpResponse"
description: "TrueAsync\\HttpResponse — statut, en-têtes, corps, streaming via send()/sendable(), trailers HTTP/2, sendFile(), json(), html(), redirect()."
---

# TrueAsync\HttpResponse

(PHP 8.6+, true_async_server 0.6+)

Objet réponse avec interface fluent. Passé en second paramètre au handler. Créé par le serveur —
pas instancié par l'utilisateur.

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
    public function isHeadersSent(): bool;
    public function isClosed(): bool;
}
```

## Statut

### setStatusCode

```php
public HttpResponse::setStatusCode(int $code): static
```

Code HTTP 100..599.

### getStatusCode

```php
public HttpResponse::getStatusCode(): int
```

### setReasonPhrase / getReasonPhrase

```php
public HttpResponse::setReasonPhrase(string $phrase): static
public HttpResponse::getReasonPhrase(): string
```

`"OK"`, `"Not Found"`, etc.

## En-têtes

### setHeader

```php
public HttpResponse::setHeader(string $name, string|array $value): static
```

Positionne un en-tête, en remplaçant les valeurs précédentes.

### addHeader

```php
public HttpResponse::addHeader(string $name, string|array $value): static
```

Ajoute une valeur aux existantes (par ex. `Set-Cookie`).

### hasHeader / getHeader / getHeaderLine / getHeaders

```php
public HttpResponse::hasHeader(string $name): bool
public HttpResponse::getHeader(string $name): ?string
public HttpResponse::getHeaderLine(string $name): string
public HttpResponse::getHeaders(): array
```

Lecture case-insensitive de ce que le handler a positionné.

### resetHeaders

```php
public HttpResponse::resetHeaders(): static
```

Retire tous les en-têtes.

## Trailers (HTTP/2)

Frame HEADERS envoyée après le corps. Consommateur canonique : gRPC (`grpc-status`).
**Sur HTTP/1.1 la valeur est silencieusement ignorée** — l'émission de trailers en chunked-encoding
n'est pas dans le scope du Step 5b.

### setTrailer

```php
public HttpResponse::setTrailer(string $name, string $value): static
```

Nom en minuscules (RFC 9113 §8.2.2) ; les majuscules sont automatiquement normalisées.

### setTrailers

```php
public HttpResponse::setTrailers(array $trailers): static
```

Set en bloc. Les trailers existants sont conservés — pour une clean slate, appelez `resetTrailers()`
d'abord.

### resetTrailers

```php
public HttpResponse::resetTrailers(): static
```

### getTrailers

```php
public HttpResponse::getTrailers(): array
```

## Protocole

### getProtocolName / getProtocolVersion

```php
public HttpResponse::getProtocolName(): string     // toujours "HTTP"
public HttpResponse::getProtocolVersion(): string  // "1.1", "2", "3"
```

## Corps

### write

```php
public HttpResponse::write(string $data): static
```

Append dans le body-buffer interne. L'envoi a lieu sur `end()` / automatiquement au retour du
handler.

### send

```php
public HttpResponse::send(string $chunk): static
```

Envoyer un chunk au client (streaming).

- Le **premier** `send()` commit le statut + les en-têtes — impossible de les changer après.
- Les suivants : append de frames DATA (HTTP/2) ou de chunked-segments (HTTP/1).
- Ne bloque la coroutine du handler **que** sous backpressure (staging buffer par stream plein).
  Seuil de backpressure par défaut : `setStreamWriteBufferBytes()` — 256 KiB.
- En cas normal, retourne immédiatement.

### sendable

```php
public HttpResponse::sendable(): bool
```

Vérification non bloquante advisory :

- `true` : `send()` acceptera un chunk sans suspendre la coroutine.
- `false` : `send()` bloquera sur backpressure, ou la réponse est déjà sealed par `sendFile()` /
  fermée, ou ce n'est pas un type de réponse capable de streaming.

`send()` est **toujours** sûr à appeler — `sendable()` permet juste au handler de s'occuper d'autre
chose plutôt que de bloquer sur un peer lent.

### setNoCompression

```php
public HttpResponse::setNoCompression(): static
```

Interdit la compression pour cette réponse — prime sur Accept-Encoding, whitelist MIME et seuil
de taille. À utiliser sur : les endpoints sensibles BREACH (secrets + reflected user input), les
payloads avec un `Content-Encoding` déjà positionné, les corps que le serveur ne doit pas envelopper.
Idempotent.

### getBody / setBody

```php
public HttpResponse::getBody(): string
public HttpResponse::setBody(string $body): static
```

Get/set du contenu courant du buffer.

## Helpers

### json

```php
public HttpResponse::json(
    array|string|object|null|int|float|bool $data,
    int $status = 200,
    int $flags  = 0
): static
```

Sérialisation JSON via `php_json_encode_ex` (le même chemin que `json_encode()`) :

- `array` / `object` / scalar `$data` → encodé.
- `string` `$data` → envoyé **tel quel** (JSON caché, pre-built bytes). Skip re-encoding.

`Content-Type: application/json` est positionné **uniquement** si le handler n'en a pas fixé — chain
`setHeader('Content-Type', 'application/problem+json')->json($payload)` pour un autre media-type.

`$flags` : bitmask `JSON_*`. `0` : défauts du serveur depuis
[`HttpServerConfig::setJsonEncodeFlags()`](/fr/docs/reference/server/http-server-config.html#setjsonencodeflags-getjsonencodeflags)
(`JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES` out-of-the-box).

`JSON_THROW_ON_ERROR` est silencieusement retiré : une erreur d'encode donne `500` JSON-erreur,
l'exception n'est pas propagée. Le handler ne doit jamais entourer `json()` d'un try/catch.

### html

```php
public HttpResponse::html(string $html): static
```

Positionne `Content-Type: text/html`.

### redirect

```php
public HttpResponse::redirect(string $url, int $status = 302): static
```

## Envoi

### end

```php
public HttpResponse::end(?string $data = null): void
```

Terminer la réponse et l'envoyer au client. Après `end()`, plus rien ne peut être écrit.

### sendFile

```php
public HttpResponse::sendFile(string $path, ?SendFileOptions $options = null): void
```

Livraison de fichier pilotée par le handler. Inscrit path + options sur la réponse et **retourne
immédiatement** — le transfert a lieu en phase dispose via la même FSM que `StaticHandler` (MIME,
ETag, IMF-date, Range, conditional GET, sidecars précompressés).

**Après `sendFile()` la réponse est sealed** : `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` / un second `sendFile()` lèvent
`HttpServerRuntimeException`.

Le chemin est **de confiance** (le handler a décidé de l'accès). Les erreurs open/fstat (`ENOENT`,
`EACCES`, oversize, non-regular) donnent 500, parce que les en-têtes ne sont pas encore sur le câble.

La middleware de compression est bypassée pour les corps sendFile (pipeline de livraison propre).

> Le chemin HTTP/3 pour `sendFile()` est en développement ; pour l'instant le hook dispose H3
> refuse avec 500.

Voir [`SendFileOptions`](/fr/docs/reference/server/send-file-options.html).

## État

### isHeadersSent

```php
public HttpResponse::isHeadersSent(): bool
```

### isClosed

```php
public HttpResponse::isClosed(): bool
```

## Exemple

```php
use TrueAsync\HttpResponse;
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, HttpResponse $res) {
    // SSE
    if ($req->getPath() === '/events') {
        $res
            ->setStatusCode(200)
            ->setHeader('Content-Type', 'text/event-stream')
            ->setHeader('Cache-Control', 'no-store')
            ->setNoCompression();

        foreach (loadEvents() as $event) {
            $res->send("data: " . json_encode($event) . "\n\n");
        }
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

## Voir aussi

- [`TrueAsync\HttpRequest`](/fr/docs/reference/server/http-request.html)
- [`TrueAsync\SendFileOptions`](/fr/docs/reference/server/send-file-options.html)
- [Streaming](/fr/docs/server/streaming.html)
- [Compression](/fr/docs/server/compression.html)
