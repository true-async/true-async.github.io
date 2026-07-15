---
layout: docs
lang: fr
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /fr/docs/server/websocket.html
page_title: "TrueAsync Server : WebSocket"
description: "addWebSocketHandler() : connexions full-duplex sur RFC 6455, topics pub/sub cross-worker, backpressure, keepalive, négociation de sous-protocole, permessage-deflate."
---

# WebSocket

(PHP 8.6+, true_async_server 0.9+)

`HttpServer::addWebSocketHandler()` enregistre un handler pour des connexions full-duplex sur
RFC 6455.

Une connexion démarre comme une requête HTTP classique, puis le client demande au serveur de la
basculer vers un protocole différent sur cette même connexion TCP : c'est ce qu'est un Upgrade.
Le serveur répond avec le statut `101 Switching Protocols`, et à partir de là la même connexion
transporte du WebSocket, plus du HTTP. Pris en charge :

- Upgrade depuis HTTP/1.1 (l'en-tête classique `Connection: Upgrade`).
- Upgrade depuis HTTP/2 (RFC 8441 Extended CONNECT).
- `wss://` (WebSocket sur TLS).
- permessage-deflate (RFC 7692), compression au niveau message.
- [Topics pub/sub](#topics-publishsubscribe-across-every-worker) qui atteignent chaque worker du
  processus, si bien qu'un chat n'a besoin ni d'un serveur mono-worker ni d'un broker externe.

> L'implémentation est vérifiée contre la suite de conformité Autobahn|Testsuite et passe les 246
> tests de la catégorie `behavior`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\WebSocket;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
);

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});

// Obligatoire : le serveur refuse de démarrer sans handler HTTP, et c'est lui
// qui répond aux requêtes qui ne sont pas des upgrades.
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(404)->end();
});

$server->start();
```

Enregistrer le handler, c'est ce qui active WebSocket — il n'y a pas d'interrupteur séparé à
basculer.

> `HttpServerConfig::enableWebSocket()` ressemble à cet interrupteur, mais c'est un stub non
> implémenté qui lève `HttpServerRuntimeException` quand on lui passe `true`, et
> `isWebSocketEnabled()` renvoie `false` alors même que WebSocket sert des connexions. N'appelez
> ni l'un ni l'autre ([server#134](https://github.com/true-async/server/issues/134)).

Chaque connexion est servie par sa propre coroutine, le même modèle per-request que pour HTTP.
Un handler qui lève une exception n'emporte pas le worker avec lui : l'exception est journalisée,
et le pair est prévenu dans le protocole — un statut HTTP si le throw précède l'upgrade, un
`CLOSE 1011` une fois la session établie.

Le handler est toujours appelé avec trois arguments, et PHP écarte ceux que vous n'avez pas
déclarés — donc `function (WebSocket $ws)`, `function (WebSocket $ws, HttpRequest $req)` et la
forme à trois paramètres sont toutes valides. Ne déclarez que ce que vous utilisez.

## Cycle de vie

Une connexion reste ouverte jusqu'à ce que la coroutine du handler retourne. Si le handler se
termine simplement (par exemple, la boucle `recv()`/`foreach` a reçu `null` à la fin), le serveur
ferme la connexion avec le code `1000 Normal` automatiquement. Un `close()` explicite avant
`return` n'est nécessaire que pour un code différent ou un texte de raison personnalisé.

## Réception de messages : `recv()` et `foreach`

```php
public WebSocket::recv(): ?WebSocketMessage
```

Suspend la coroutine jusqu'à ce que le prochain message arrive ou que la connexion se ferme.
Renvoie un [`WebSocketMessage`](/fr/docs/reference/server/websocket.html#websocketmessage) ou
`null` quand le client a fermé la connexion proprement (un code de fermeture normal, ou une
déconnexion sans frame CLOSE explicite) :

```php
while (($msg = $ws->recv()) !== null) {
    handle($msg->data, $msg->binary);
}
```

`WebSocket` implémente `\Iterator`, donc la même boucle peut s'écrire plus succinctement
`foreach ($ws as $msg) { ... }`. Une fermeture propre termine simplement le `foreach` ; une
fermeture avec erreur lève `WebSocketClosedException` directement hors de la boucle.

Lisez les messages depuis un seul endroit : si vous appelez `recv()` depuis deux coroutines en
parallèle sur la même connexion, le second appel lève `WebSocketConcurrentReadException`. Si vous
devez distribuer les messages à plusieurs handlers, gardez une seule boucle `recv()` et dispatchez
vous-même depuis celle-ci.

## Envoi de messages : `send()`, `trySend()`

`send()` et `sendBinary()` sont sûres à appeler depuis n'importe quelle coroutine, y compris
plusieurs à la fois : le serveur s'assure que les données de différents appels ne se mélangent
jamais sur le câble.

```php
$ws->send('text frame');       // le texte DOIT être de l'UTF-8 valide
$ws->sendBinary($binaryData);  // les données binaires n'ont aucune contrainte d'encodage
```

En général ces fonctions retournent immédiatement. Si le client lit lentement et que le buffer
d'envoi se remplit, la coroutine se suspend et reprend une fois que le client a vidé une partie du
buffer. Si l'attente dépasse `write_timeout_ms`, une `WebSocketBackpressureException` est levée, et
le handler décide de la suite : abandonner le message, fermer la connexion, ou réessayer.

Pour diffuser un message à de nombreux clients, où un client lent ne doit pas ralentir les autres,
il existe des variantes non bloquantes :

```php
if (!$ws->trySend($text)) {
    // le buffer de ce client est plein, le message n'a PAS été envoyé, le client prend du retard
}
```

`trySend()`/`trySendBinary()` ne suspendent jamais la coroutine : elles renvoient `true`
immédiatement si le message a été accepté, et `false` si le buffer est plein (auquel cas le
message n'est simplement pas envoyé). La taille du buffer est fixée par
[`HttpServerConfig::setStreamWriteBufferBytes()`](/fr/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(`0` désactive la limite : `trySend()` envoie alors toujours et renvoie `true`).

## Topics : publish/subscribe sur tous les workers {#topics-publishsubscribe-across-every-worker}

Un worker est un thread avec son propre contexte PHP. Donc la façon évidente de construire un
chat — garder un tableau de connexions et boucler dessus — ne peut jamais atteindre que les pairs
d'*un seul* worker, ce qui explique pourquoi un tel chat devait tourner en `setWorkers(1)`.

Les topics corrigent cela. Ils vivent dans le serveur, pas dans votre handler : chaque worker
indexe les connexions qu'il possède, et un `publish()` est transmis à chaque worker, qui délivre
ensuite sur ses propres sockets. Pas de Redis, pas de message broker, pas de serveur mono-worker.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = ltrim($req->getPath(), '/') ?: 'lobby';

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", $msg->data);   // atteint les abonnés sur TOUS les workers
    }
});
```

Un topic est adressé par **nom, au point d'appel**. Il n'y a pas d'objet topic à obtenir, tenir
ou passer à un handler.

### Les filtres suivent MQTT

Les niveaux sont séparés par `/`, `+` correspond à exactement un niveau, et un `#` final
correspond au reste :

| Filtre | Reçoit |
|--------|--------|
| `chat/general` | exactement ce topic |
| `chat/+/typing` | `chat/general/typing`, `chat/random/typing` — un niveau, n'importe quelle valeur |
| `user/42/#` | `user/42`, `user/42/presence`, `user/42/dm/7` — tout le sous-arbre |

Les wildcards appartiennent aux *abonnements*. Un **topic de publish doit être concret** : un
message diffusé vers un pattern n'a pas de destination bien définie, donc
`publish('chat/+/typing', …)` lève `WebSocketException`. Les filtres peuvent aller jusqu'à 128
niveaux de profondeur.

### L'API

```php
$ws->subscribe('chat/+/typing');            // idempotent
$ws->unsubscribe('chat/+/typing');          // idempotent
$ws->getTopics();                           // string[] — les filtres de cette connexion

$ws->publish('chat/general', $text);        // texte, à chaque worker
$ws->publishBinary('chat/general', $bytes); // pendant binaire

$ws->subscriberCount('chat/general');       // sur tous les workers, wildcards inclus
```

`publish()` **ne suspend jamais**. Un pair dont la file sortante est engorgée perd le message
plutôt que de bloquer la distribution au reste du topic — la même sémantique que `trySend()`.
Quand vous avez besoin d'une garantie de livraison, faites `send()` vers la connexion unique. Un
abonné qui correspond à plusieurs de ses propres filtres ne reçoit quand même qu'une seule copie.

`$excludeSelf` vaut `true` par défaut — le cas « tout le monde sauf l'émetteur » que veut un chat :

```php
$ws->publish('chat/general', $msg->data);                      // l'émetteur ne le reçoit pas
$ws->publish('chat/general', $msg->data, excludeSelf: false);  // l'émetteur le reçoit aussi
```

La valeur de retour est le nombre d'abonnés servis **sur le worker appelant uniquement**. La
livraison aux autres workers est asynchrone et ne peut pas être comptée au point d'appel, donc
c'est un nombre local, pas un nombre à l'échelle du processus. `subscriberCount()` est celui à
l'échelle du processus — mais comme chaque worker répond avec son propre compte et que les
réponses sont sommées, c'est un instantané plutôt qu'un compteur en direct, et un worker qui ne
répond pas à temps est laissé de côté.

Une connexion qui se ferme se désabonne de tout d'elle-même.

### Limites

Les deux sont désactivées par défaut, ce que livre chaque broker auto-hébergé (EMQX
`max_subscriptions` / `messages_rate`, NATS `max_subs`) : seule l'application sait combien de
topics il lui faut.

```php
$config
    ->setWsMaxSubscriptions(32)          // filtres distincts qu'une connexion peut tenir
    ->setWsPublishRateLimit(50, burst: 100);
```

Réglez `setWsMaxSubscriptions()` dès que de l'entrée cliente atteint `subscribe()` — disons
`$ws->subscribe($msg->data)` — pour qu'un pair ne puisse pas faire grossir sans fin l'arbre de
topics du worker. Au-delà du cap, `subscribe()` lève `WebSocketException` et la connexion reste
ouverte.

`setWsPublishRateLimit()` est un token bucket par connexion. `publish()` est le seul appel
WebSocket qu'un pair non privilégié peut transformer en travail sur *chaque* worker du processus —
`send()` et `trySend()` ne touchent jamais que son propre socket. Non mesuré, un client qui boucle
sur un message relayé remplit l'inbox de chaque worker, et les drops qui suivent emportent aussi
le trafic d'*autres* topics. Au-delà du débit, `publish()` lève `WebSocketBackpressureException`
et la connexion reste ouverte : l'émetteur est prévenu, plutôt que le message ne disparaisse dans
une mailbox pleine où personne ne peut le voir.

`$burst` est la profondeur du bucket en messages — de combien un handler peut prendre de l'avance
sur le débit soutenu. `0` vaut l'équivalent d'une seconde.

```php
try {
    $ws->publish("chat/$room", $msg->data);
} catch (WebSocketBackpressureException) {
    $ws->send('vous envoyez trop vite');
} catch (WebSocketException $e) {
    $ws->send('mauvais topic : ' . $e->getMessage());
}
```

### Ce que ça coûte

Chaque worker résume ses abonnements dans un counting Bloom filter de préfixes de topics, et un
publisher saute les workers qui ne détiennent prouvablement aucun abonné au lieu de les réveiller
tous. Un publish vers un topic que personne dans le processus n'écoute coûte zéro réveil
cross-worker. `HttpServer::getRuntimeStats()` en rapporte le résultat — `ws_topic_posted`,
`ws_topic_skipped` (le filtre qui gagne son pain) et `ws_topic_dropped` (la mailbox d'un worker
était pleine : celui-là est une perte de données).

Les topics fonctionnent sur tous les transports WebSocket, pas seulement HTTP/1 en clair — sur
TLS, sur HTTP/2 Extended CONNECT, et avec permessage-deflate, où un même `publish()` sert côte à
côte un pair compressé et un pair en clair, chacun avec le framing qu'il a négocié.

## L'adresse du client

```php
$ws->getRemoteAddress();   // "203.0.113.7" ou "2001:db8::1" — IP nue, sans port
$ws->getRemotePort();      // 54321
```

`getRemoteAddress()` renvoie l'**IP nue** : pas de port, et pas de crochets autour d'un littéral
IPv6 — la même forme que `$_SERVER['REMOTE_ADDR']`, si bien qu'elle se branche directement sur
`filter_var(…, FILTER_VALIDATE_IP)`, une ACL, ou un rate limiter. Les deux renvoient `null` sur un
listener socket Unix, qui n'a pas de pair IP.

C'est le pair de la connexion TCP. Ce n'est **pas** dérivé de `X-Forwarded-For` — derrière un
proxy, parsez cet en-tête vous-même, et seulement quand vous faites confiance au proxy qui l'a
posé.

> **Changement cassant.** `getRemoteAddress()` renvoyait auparavant `"host:port"` (et `""` quand
> il n'y avait pas de pair IP). Elle renvoie désormais l'IP nue, et `null`. Utilisez
> `getRemotePort()` pour le port.

## Fermeture d'une connexion : `close()`, `isClosed()`

```php
$ws->close(WebSocketCloseCode::NORMAL, 'bye');
```

Démarre la fermeture de la connexion. Sûr à appeler plusieurs fois : les appels suivants sont des
no-ops. Le code de fermeture est une valeur de
[`WebSocketCloseCode`](/fr/docs/reference/server/websocket.html#websocketclosecode) ou un entier
dans la plage `4000..4999` (réservée aux codes spécifiques à l'application). `$reason` accepte du
texte UTF-8, jusqu'à 123 octets.

`isClosed()` renvoie `true` après `close()`, ou après que le client a envoyé son propre signal de
fermeture.

## Ping et keepalive

```php
$ws->ping('optional payload');   // jusqu'à 125 octets, RFC 6455 §5.5
```

Le code applicatif a rarement besoin d'appeler ceci à la main : le timer keepalive du serveur
(`HttpServerConfig::setWsPingIntervalMs()`) envoie des PING automatiquement. Si le client ne
répond pas à temps (`setWsPongTimeoutMs()`), le serveur ferme la connexion de lui-même. Voir
[Configuration](/fr/docs/server/configuration.html#websocket) pour les détails.

## Négociation de sous-protocole et rejet : `WebSocketUpgrade`

Par défaut, le handler ne reçoit que `WebSocket $ws`. Pour décider vous-même s'il faut accepter la
connexion et quel sous-protocole choisir, enregistrez le handler avec trois paramètres : le
serveur détecte le nombre de paramètres et, dans ce cas, passe un troisième objet,
`WebSocketUpgrade` :

```php
use TrueAsync\WebSocket;
use TrueAsync\HttpRequest;
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    $offered = $u->getOfferedSubprotocols();   // depuis l'en-tête Sec-WebSocket-Protocol

    if (!in_array('chat.v2', $offered, true)) {
        $u->reject(400, 'unsupported subprotocol');
        return;
    }

    $u->setSubprotocol('chat.v2');   // doit être appelé avant return ou reject()

    foreach ($ws as $msg) {
        // ...
    }
});
```

`WebSocketUpgrade` vit depuis le moment où le handler est appelé jusqu'à `reject()` ou un `return`
réussi (moment où le serveur termine le handshake avec le sous-protocole choisi). Après cela, tout
appel sur cet objet lève une exception : la réponse est déjà sur le câble et le sous-protocole ne
peut plus changer.

`getOfferedExtensions()` renvoie la liste des extensions offertes par le client. permessage-deflate
(RFC 7692, compression de message) est négocié par le serveur lui-même via
`HttpServerConfig::setWsPermessageDeflate()` ; le reste des valeurs offertes est purement
informatif.

## Codes de fermeture et exceptions

`WebSocketCloseCode` est une enum avec les codes de fermeture standard RFC 6455 (`NORMAL`,
`GOING_AWAY`, `PROTOCOL_ERROR`, `MESSAGE_TOO_BIG`, et d'autres). La hiérarchie d'exceptions :

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException            // aussi : mauvais filtre de topic, cap d'abonnements
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // lecteur lent — ou publish() au-delà de son rate limit
              └── WebSocketConcurrentReadException  // second recv() en parallèle
```

Une fermeture propre par le client apparaît comme `null` depuis `recv()`, pas comme une exception.
Une exception n'est levée que sur une erreur de protocole ou une fermeture avec un code d'erreur
explicite ; `$closeCode`/`$closeReason` portent la raison. Voir la
[référence](/fr/docs/reference/server/websocket.html) pour les détails.

## Configuration

| Méthode | Défaut | Rôle |
|---------|--------|------|
| `setWsMaxMessageSize($bytes)` | 1 MiB | taille max d'un message réassemblé, sinon `1009` |
| `setWsMaxFrameSize($bytes)` | 1 MiB | taille max d'une seule frame, protège contre un flot de fragments minuscules |
| `setWsPingIntervalMs($ms)` | 30000 | fréquence à laquelle le serveur ping une connexion idle, `0` le désactive |
| `setWsPongTimeoutMs($ms)` | 60000 | combien de temps attendre le PONG avant de fermer (`1001`) |
| `setWsPermessageDeflate($bool)` | `false` | RFC 7692, opt-in en raison de son coût CPU |
| `setWsMaxSubscriptions($count)` | `0` (sans limite) | filtres de topic distincts qu'une connexion peut tenir |
| `setWsPublishRateLimit($perSecond, $burst)` | `0` (off) | token bucket par connexion sur `publish()` |

Voir [Configuration](/fr/docs/server/configuration.html#websocket) pour plus de détails.

## Voir aussi

- [`TrueAsync\WebSocket` et classes associées](/fr/docs/reference/server/websocket.html) : la
  référence complète
- [`HttpServer::addWebSocketHandler()`](/fr/docs/reference/server/http-server.html#addwebsockethandler)
- [Configuration : WebSocket](/fr/docs/server/configuration.html#websocket)
