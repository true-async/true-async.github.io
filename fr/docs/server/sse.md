---
layout: docs
lang: fr
path_key: "/docs/server/sse.html"
nav_active: docs
permalink: /fr/docs/server/sse.html
page_title: "TrueAsync Server : Server-Sent Events"
description: "sseStart()/sseEvent()/sseComment()/sseRetry() : helpers text/event-stream prêts à l'emploi sur HTTP/1.1, HTTP/2 et HTTP/3."
---

# Server-Sent Events

(PHP 8.6+, true_async_server 0.8+)

SSE (Server-Sent Events) est un moyen simple de diffuser des événements texte vers le navigateur
sur une connexion HTTP classique, dans un seul sens : du serveur vers le navigateur. Contrairement
à WebSocket, cela ne nécessite ni protocole séparé ni handshake Upgrade : le serveur garde
simplement la réponse ouverte et ajoute de nouveaux événements au fur et à mesure. Le navigateur
les consomme avec l'API `EventSource` intégrée, sans bibliothèque supplémentaire.

`HttpResponse` fournit quatre méthodes pour `text/event-stream` : `sseStart()`, `sseEvent()`,
`sseComment()` et `sseRetry()`. C'est une fine couche de formatage au-dessus du même
[pipeline `send()`](/fr/docs/server/streaming.html), donc le même handler fonctionne sans
modification sur HTTP/1.1, HTTP/2 et HTTP/3, le protocole étant choisi par le client.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\delay;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWriteTimeout(0);   // flux longue durée : pas de délai d'écriture

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) {
    $res->sseStart();          // optionnel : le premier sseEvent()/sseComment() démarre aussi le flux
    $res->sseRetry(3000);      // indique au navigateur de se reconnecter après 3s en cas de coupure
    $res->sseComment('stream open');   // heartbeat, empêche les proxies de considérer la connexion idle

    for ($i = 1; $i <= 10; $i++) {
        $res->sseEvent(
            data:  json_encode(['n' => $i, 'at' => time()]),
            event: 'tick',
            id:    (string) $i,
        );

        if (!$res->sendable()) {   // le client est parti, inutile d'attendre
            break;
        }

        delay(1000);
    }

    $res->sseEvent('bye');
    $res->end();
});

$server->start();
```

Côté navigateur :

```js
const es = new EventSource('/events');
es.onmessage = e => console.log('message', e.data);
es.addEventListener('tick', e => console.log('tick', e.data, e.lastEventId));
```

## sseStart()

Bascule la réponse en mode SSE et fige les en-têtes : `Content-Type: text/event-stream`,
`Cache-Control: no-cache, no-transform`, et `X-Accel-Buffering: no` (ce dernier indique à nginx de
ne pas bufferiser la réponse ; sans lui, les événements stagnent derrière le buffer du proxy
jusqu'à ce qu'il se remplisse). La réponse est aussi marquée non compressible : un flux gzip
bufferisé irait à l'encontre de la livraison en temps réel.

L'appel est optionnel : le premier `sseEvent()`/`sseComment()` démarre le flux de lui-même. Mais
`sseStart()` seul ne flushe **pas** la ligne de statut et les en-têtes sur le câble, le commit est
paresseux et a lieu au premier événement réel. Pour ouvrir le flux immédiatement (par exemple pour
débloquer le `onopen` du navigateur avant qu'un événement réel soit prêt), envoyez un
`sseComment()` vide : cela démarre le flux et commit les en-têtes immédiatement.

Lève `HttpServerInvalidArgumentException` si le handler a déjà positionné son propre `Content-Type`,
et `HttpServerRuntimeException` si la réponse est déjà en streaming, fermée, ou occupée par
`sendFile()`.

## sseEvent()

```php
$res->sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null,
): static
```

Formate et envoie un événement SSE, en démarrant le flux si nécessaire. Un `$data` multiligne est
découpé sur `\n` / `\r\n` / `\r` et envoyé en plusieurs champs `data:` (WHATWG §9.2). `$event`,
`$id` et `$retry` ne sont inclus que lorsqu'ils ne sont pas `null`. L'enregistrement se termine par
une ligne vide pour que le navigateur dispatche l'événement immédiatement.

- `$event` et `$id` ne doivent pas contenir `\r`/`\n` (sinon le parseur les lirait comme un
  séparateur de champ/enregistrement), et `$id` ne doit pas contenir de NUL (selon WHATWG, un NUL
  fait ignorer l'id entier par le parseur) : toute violation lève
  `HttpServerInvalidArgumentException`.
- `$retry` doit être non négatif.
- Une chaîne vide `$data === ''` est aussi une valeur valide, elle dispatche un `MessageEvent` vide.
- Les quatre arguments à `null` sont un no-op. Le parseur `EventSource` ignore silencieusement un
  événement sans `data` ni `retry`.

## sseComment()

```php
$res->sseComment(string $text = ''): static
```

Envoie une ligne de commentaire (un enregistrement commençant par `:`). Les navigateurs ignorent
les commentaires, mais ils maintiennent la connexion vivante à travers les timeouts d'inactivité
des proxies intermédiaires (`proxy_read_timeout` de nginx, 60s par défaut). Appelez-la
périodiquement comme heartbeat. Le payload canonique est une chaîne vide, qui devient `:\n\n` sur
le câble. `$text` ne doit pas contenir `\r`/`\n`.

## sseRetry()

```php
$res->sseRetry(int $milliseconds): static
```

Envoie une directive `retry:` indiquant au navigateur combien de millisecondes attendre avant de
se reconnecter après une coupure du flux. Sucre syntaxique pour `sseEvent(retry: $milliseconds)`
sans payload.

## Backpressure : `sendable()`

Comme `send()`, chaque méthode SSE ne suspend la coroutine du handler que sous backpressure réelle,
c'est-à-dire quand le buffer intermédiaire du flux est plein. La vérification `sendable()` est non
bloquante et advisory : `false` signifie que le prochain appel suspendrait, que la réponse est déjà
fermée, ou que ce type de réponse ne supporte pas le streaming du tout. Pratique pour ne pas
attendre un client lent quand il y a d'autre travail à faire.

## Voir aussi

- [`HttpResponse::sseStart()`](/fr/docs/reference/server/http-response.html#ssestart) et les
  autres méthodes SSE dans la référence
- [Streaming](/fr/docs/server/streaming.html) : le `send()`/`sendable()` bas niveau sur lequel SSE
  est construit
- [Exemples](/fr/docs/server/examples.html#sse-server-sent-events)
