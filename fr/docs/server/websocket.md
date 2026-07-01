---
layout: docs
lang: fr
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /fr/docs/server/websocket.html
page_title: "TrueAsync Server : WebSocket"
description: "addWebSocketHandler() : connexions full-duplex sur RFC 6455, backpressure, keepalive, négociation de sous-protocole, permessage-deflate."
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

$server->start();
```

Chaque connexion est servie par sa propre coroutine, le même modèle per-request que pour HTTP.

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
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // le client ne lit pas assez vite
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

Voir [Configuration](/fr/docs/server/configuration.html#websocket) pour plus de détails.

## Voir aussi

- [`TrueAsync\WebSocket` et classes associées](/fr/docs/reference/server/websocket.html) : la
  référence complète
- [`HttpServer::addWebSocketHandler()`](/fr/docs/reference/server/http-server.html#addwebsockethandler)
- [Configuration : WebSocket](/fr/docs/server/configuration.html#websocket)
