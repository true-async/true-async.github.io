---
layout: docs
lang: fr
path_key: "/docs/server/streaming.html"
nav_active: docs
permalink: /fr/docs/server/streaming.html
page_title: "TrueAsync Server : streaming de requête et de réponse"
description: "readBody() : streaming pull-based du corps de requête. send()/sendable() : streaming chunked de la réponse avec backpressure. Trailers HTTP/2."
---

# Streaming de requête et de réponse

(PHP 8.6+, true_async_server 0.6+)

## Streaming du corps de requête : `readBody()`

Par défaut le handler reçoit un corps déjà entièrement lu (`HttpRequest::getBody()`).
Avec `HttpServerConfig::setBodyStreamingEnabled(true)`, les parseurs H1/H2 déposent les chunks
DATA dans une FIFO par requête, et le handler les lit un par un via `HttpRequest::readBody()`.

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

### Sémantique

- Un appel à `readBody()` renvoie **un** chunk fourni par le parseur :
  - frame DATA H2 (par défaut jusqu'à 16 KiB),
  - slice `on_body` llhttp (limité par le read-buffer H1 = 8 KiB).
- Si la file est vide, la coroutine s'endort sur le trigger event par requête.
- À EOF, `null` est retourné (idempotent).
- En cas d'erreur stream (peer reset, dépassement de `max_body_size`), une `\Exception` est levée.
- Le paramètre `$maxLen` est pour l'instant réservé au futur coalesce et ignoré. La signature est
  gardée binary-compatible avec la finalisation à venir (issue #26).

### Quand l'activer

- Gros uploads (logs, médias, backups)
- Streaming parsing (NDJSON, MessagePack stream)
- Services dont la tail-latency se dégrade à cause de la rétention du corps en RAM
- Le multipart est **toujours** en streaming, indépendamment de `setBodyStreamingEnabled()`

Quand **ne pas** l'activer : les endpoints REST où le corps est compact et où il est plus pratique
de travailler avec `getBody()`/`getPost()`/`getQuery()` en entier. Le mode combiné (streaming
seulement quand le corps > X) n'est pas supporté ; `getBody()` en mode streaming lève
`LogicException` (planifié dans la roadmap).

### Empreinte mémoire

Sur 50 POST parallèles de 20 MiB (h2load, WSL2) : peak RSS chute de 1170 MiB à **197 MiB** (×6).
Le débit passe de 36 req/s à **100 req/s** (×2.7), parce que le dispatch du handler n'attend plus
le corps complet.

## Streaming de réponse : `send()` / `sendable()`

La réponse simple via `setBody()` / `json()` / `html()` / `redirect()` est envoyée en un seul morceau.

Pour une réponse en streaming (chunked H1, frames DATA H2) on utilise `send($chunk)` :

```php
$server->addHttpHandler(function ($req, $res) {
    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setNoCompression();   // SSE : les événements doivent atteindre le client immédiatement

    // Le premier send() commit statut + en-têtes (impossibles à changer après)
    foreach (generateEvents() as $event) {
        $res->send("data: " . json_encode($event) . "\n\n");
    }
});
```

### Backpressure

`send()` ne bloque la coroutine du handler **que** sous backpressure : staging buffer par stream
plein. En cas normal, il retourne immédiatement.

HTTP/2 : le backpressure s'enclenche au remplissage des ring-slots **ou** au dépassement de
`HttpServerConfig::setStreamWriteBufferBytes()` (défaut 256 KiB).
HTTP/1 chunked : utilise le send-buffer du kernel.

### `sendable()`

Vérification non bloquante advisory : renvoie `true` si `send()` acceptera un chunk sans suspendre
la coroutine. `false` signifie : `send()` va bloquer, ou la réponse est fermée / sealed par
`sendFile()`, ou ce n'est pas un type de réponse capable de streaming.

```php
foreach ($events as $event) {
    if (!$res->sendable()) {
        // on ne veut pas attendre un client lent, on s'occupe d'autre chose
        $event->save();   // l'écrire en BD
        continue;
    }
    $res->send($event->encode());
}
```

`send()` est **toujours** sûr à appeler, indépendamment de `sendable()`. Ce dernier ne fait que
donner au handler une chance de faire autre chose au lieu de bloquer sur un peer lent.

## Trailers HTTP/2

HTTP/2 prend en charge une frame HEADERS après le corps (trailers). Le consommateur canonique est
gRPC (`grpc-status` dans le trailer).

```php
$res->setStatusCode(200);
$res->send($body);
$res->setTrailer('grpc-status', '0');
$res->setTrailer('grpc-message', 'OK');
```

Set en bloc :

```php
$res->setTrailers(['grpc-status' => '0', 'grpc-message' => 'OK']);
$res->resetTrailers();   // tout retirer
$res->getTrailers();
```

Sur HTTP/1.1 la valeur est **silencieusement ignorée** : l'émission de trailers en chunked-encoding
n'est pas dans le scope du Step 5b.

> Les noms de trailers s'écrivent en minuscules (RFC 9113 §8.2.2) ; les majuscules sont
> automatiquement normalisées.

## Voir aussi

- [`HttpServerConfig::setBodyStreamingEnabled()`](/fr/docs/reference/server/http-server-config.html#setbodystreamingenabled)
- [`HttpServerConfig::setStreamWriteBufferBytes()`](/fr/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
- [`HttpRequest::readBody()`](/fr/docs/reference/server/http-request.html#readbody)
- [`HttpResponse::send()`](/fr/docs/reference/server/http-response.html#send)
- [`HttpResponse::sendable()`](/fr/docs/reference/server/http-response.html#sendable)
- [`HttpResponse::setTrailer()`](/fr/docs/reference/server/http-response.html#settrailer)
