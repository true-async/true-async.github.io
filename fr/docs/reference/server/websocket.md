---
layout: docs
lang: fr
path_key: "/docs/reference/server/websocket.html"
nav_active: docs
permalink: /fr/docs/reference/server/websocket.html
page_title: "TrueAsync\\WebSocket"
description: "TrueAsync\\WebSocket, WebSocketMessage, WebSocketUpgrade, WebSocketCloseCode, et la hiérarchie d'exceptions WebSocket."
---

# TrueAsync\WebSocket

(PHP 8.6+, true_async_server 0.9+)

Les classes derrière les connexions full-duplex sur RFC 6455. Guide avec exemples :
[WebSocket](/fr/docs/server/websocket.html).

## TrueAsync\WebSocket

Une connexion WebSocket. Créée par le serveur juste après le commit du handshake d'upgrade et
passée en premier argument au handler enregistré via
[`HttpServer::addWebSocketHandler()`](/fr/docs/reference/server/http-server.html#addwebsockethandler).

```php
namespace TrueAsync;

final class WebSocket implements \Iterator
{
    public function recv(): ?WebSocketMessage;

    public function send(string $text): void;
    public function sendBinary(string $data): void;
    public function trySend(string $text): bool;
    public function trySendBinary(string $data): bool;

    public function ping(string $payload = ''): void;
    public function close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void;

    public function isClosed(): bool;
    public function getSubprotocol(): ?string;
    public function getRemoteAddress(): string;

    // Iterator
    public function current(): ?WebSocketMessage;
    public function key(): int;
    public function next(): void;
    public function rewind(): void;
    public function valid(): bool;
}
```

Les instances ne sont construites que par le serveur ; `new WebSocket` n'est pas disponible au
code utilisateur.

### Cycle de vie

La connexion est liée à la coroutine du handler. Quand le handler rend la main pour quelque raison
que ce soit, y compris un `return` depuis une boucle `recv()` sur `null`, le serveur ferme la
connexion avec le code `1000 Normal`. Un `close()` explicite avant `return` n'est nécessaire que
pour un code non par défaut ou un texte de raison.

### Modèle de concurrence

- `send()`, `sendBinary()` et `ping()` sont sûres à appeler depuis n'importe quelle coroutine sur
  le même thread. Les producteurs enfilent atomiquement des frames sérialisées ; un unique
  flusher coopératif les écrit sur le socket une par une, donc les frames de différents appelants
  ne s'entrelacent jamais.
- `recv()` est mono-lecteur : un second appel `recv()` concurrent lève
  `WebSocketConcurrentReadException`, parce que la connexion est un unique flux d'octets et qu'il
  n'existe pas de sémantique définie pour plusieurs lecteurs.
- `close()` est idempotent et peut être appelé depuis n'importe quelle coroutine.

### recv

```php
public WebSocket::recv(): ?WebSocketMessage
```

Reçoit le prochain message texte ou binaire. Suspend la coroutine appelante jusqu'à ce qu'un
message complet arrive ou que la connexion se ferme.

Renvoie un [`WebSocketMessage`](#websocketmessage) ou `null` quand le client a fermé proprement :
un code CLOSE normal (`1000`/`1001`/`1005`) ou une simple déconnexion sans frame CLOSE. Boucle
typique : `while (($m = $ws->recv()) !== null) { ... }`.

La méthode lève :

- `WebSocketClosedException` sur une erreur de protocole ou un code de fermeture d'erreur
  explicite ; `$closeCode`/`$closeReason` portent le code et la raison RFC 6455.
- `WebSocketConcurrentReadException` si une autre coroutine attend déjà dans `recv()` sur cette
  connexion.

### send

```php
public WebSocket::send(string $text): void
```

Envoie une frame texte. `$text` **doit** être de l'UTF-8 valide : les données invalides sont
rejetées en amont pour que le récepteur ne voie jamais une frame qui viole la RFC 6455 §5.6.

Rend la main immédiatement dans le cas courant, tant que le buffer d'envoi n'est pas plein.
Suspend la coroutine appelante une fois le buffer plein, et reprend une fois que le client a lu
suffisamment pour libérer de la place. Si la suspension dépasse `write_timeout_ms`, la méthode
lève `WebSocketBackpressureException`, et le handler peut alors abandonner le message, fermer la
connexion, ou réessayer.

La méthode lève aussi `WebSocketClosedException` si la connexion est déjà fermée.

### sendBinary

```php
public WebSocket::sendBinary(string $data): void
```

Envoie une frame binaire. Les payloads binaires n'ont aucune contrainte UTF-8. Le comportement de
backpressure est identique à `send()`.

### trySend

```php
public WebSocket::trySend(string $text): bool
```

Envoi non bloquant. Enfile une frame texte et renvoie `true` quand le buffer d'envoi n'est pas
plein ; renvoie `false` sans rien enfiler quand le buffer est plein, pour que l'appelant puisse
abandonner le message, ralentir, ou fermer la connexion. Contrairement à `send()`, `trySend()` ne
suspend jamais la coroutine appelante, ce qui en fait le bon outil pour une boucle de diffusion où
un client lent ne doit pas bloquer la livraison aux autres.

La taille du buffer est fixée par
[`HttpServerConfig::setStreamWriteBufferBytes()`](/fr/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(`0` désactive la limite : `trySend()` enfile alors toujours la frame et renvoie `true`).

La fonction renvoie `true` si le message a été accepté dans la file, et `false` si le buffer
d'envoi est plein et que le client ne suit pas. Lève `WebSocketClosedException` si la connexion
est déjà fermée.

### trySendBinary

```php
public WebSocket::trySendBinary(string $data): bool
```

Envoi binaire non bloquant. Se comporte comme `trySend()`.

### ping

```php
public WebSocket::ping(string $payload = ''): void
```

Envoie une frame PING. Selon RFC 6455 §5.5.2, le pair est tenu de répondre avec PONG. Le code
applicatif a rarement besoin d'appeler ceci à la main : le timer keepalive du serveur
(`HttpServerConfig::setWsPingIntervalMs()`) envoie des pings automatiquement quand configuré.

`$payload` accepte jusqu'à 125 octets (RFC 6455 §5.5).

### close

```php
public WebSocket::close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void
```

Démarre le handshake de fermeture et démonte la connexion. Idempotent : les appels répétés sont
des no-ops.

- `$code` est une valeur `WebSocketCloseCode`, ou un entier brut dans `4000..4999` (réservé aux
  codes spécifiques à l'application, RFC 6455 §7.4.2).
- `$reason` est du texte UTF-8, jusqu'à 123 octets.

### isClosed

```php
public WebSocket::isClosed(): bool
```

`true` après l'appel de `close()`, ou après le traitement de la frame CLOSE du client.

### getSubprotocol

```php
public WebSocket::getSubprotocol(): ?string
```

Le sous-protocole négocié pendant l'upgrade, ou `null` si aucun n'a été sélectionné.

### getRemoteAddress

```php
public WebSocket::getRemoteAddress(): string
```

L'adresse du pair sous la forme `host:port` (IPv4) ou `[host]:port` (IPv6) pour les connexions
TCP. Une chaîne vide pour les connexions sur socket Unix.

### Iterator

```php
public WebSocket::current(): ?WebSocketMessage
public WebSocket::key(): int
public WebSocket::next(): void
public WebSocket::rewind(): void
public WebSocket::valid(): bool
```

Permet d'écrire `foreach ($ws as $msg)` au lieu d'une boucle `recv()` manuelle. À chaque étape la
boucle tire le prochain message ; une fermeture propre termine simplement le `foreach`, et une
fermeture avec erreur lève `WebSocketClosedException` directement hors de la boucle.

## TrueAsync\WebSocketMessage {#websocketmessage}

```php
namespace TrueAsync;

final class WebSocketMessage
{
    public readonly string $data;
    public readonly bool $binary;
}
```

Un message entièrement réassemblé, tel que livré par `WebSocket::recv()`. Les messages texte ont
déjà été validés comme UTF-8, donc `$data` peut être utilisé tel quel sans revérification.

- **`$data`** — le payload du message. Pour les messages texte, c'est une chaîne UTF-8 valide.
- **`$binary`** — `true` si le message a été envoyé comme frame binaire, `false` pour une frame
  texte.

Les instances ne sont construites que par le serveur. Vous les obtenez via `WebSocket::recv()` ;
il n'y a aucun moyen de construire vous-même un `new WebSocketMessage`.

## TrueAsync\WebSocketUpgrade

```php
namespace TrueAsync;

final class WebSocketUpgrade
{
    public function reject(int $status, string $reason = ''): void;
    public function setSubprotocol(string $name): void;
    public function getOfferedSubprotocols(): array;
    public function getOfferedExtensions(): array;
}
```

Le handle sur une négociation d'upgrade en cours. Existe depuis le moment où le handler est
invoqué jusqu'à ce que `reject()` soit appelé ou que le handler retourne avec succès (auquel cas
le serveur envoie `101` avec le sous-protocole choisi via `setSubprotocol()`).

Disponible uniquement pour les handlers enregistrés avec trois paramètres :

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    // ...
});
```

Le serveur vérifie le nombre de paramètres déclarés par le handler ; un handler à deux paramètres
saute entièrement cet objet et l'upgrade est acceptée avec les réglages par défaut.

Une fois le handshake commité, tout appel sur cet objet lève une exception : `Sec-WebSocket-Protocol`
est déjà sur le câble et le sous-protocole ne peut plus changer.

### reject

```php
public WebSocketUpgrade::reject(int $status, string $reason = ''): void
```

Rejette l'upgrade avec le statut HTTP donné. La réponse `101` n'est jamais envoyée ; le client
reçoit le statut choisi à la place, et la connexion se ferme. Après `reject()` le handler doit
retourner immédiatement : aucune I/O supplémentaire n'est autorisée.

- `$status` — le code de statut HTTP (doit être 4xx ou 5xx).
- `$reason` — un corps de réponse optionnel.

### setSubprotocol

```php
public WebSocketUpgrade::setSubprotocol(string $name): void
```

Choisit un sous-protocole parmi la liste offerte par le client. La valeur choisie est renvoyée
dans l'en-tête de réponse `Sec-WebSocket-Protocol`. Doit être appelé avant que le handler ne
retourne et avant `reject()`. Le serveur ne vérifie pas que la valeur choisie était effectivement
dans `getOfferedSubprotocols()` ; c'est au handler de le garantir.

### getOfferedSubprotocols

```php
public WebSocketUpgrade::getOfferedSubprotocols(): array
```

Renvoie les sous-protocoles (`string[]`) envoyés par le client dans l'en-tête
`Sec-WebSocket-Protocol`, dans l'ordre de préférence du client. Un tableau vide si le client n'en
a offert aucun.

### getOfferedExtensions

```php
public WebSocketUpgrade::getOfferedExtensions(): array
```

Renvoie les extensions (`string[]`) issues de l'en-tête `Sec-WebSocket-Extensions`, dans l'ordre
de préférence du client. permessage-deflate (RFC 7692, compression de message) est négocié par le
serveur lui-même via `HttpServerConfig::setWsPermessageDeflate()` ; le reste des valeurs offertes
est purement informatif. Un tableau vide si le client n'en a offert aucune.

## TrueAsync\WebSocketCloseCode

```php
namespace TrueAsync;

enum WebSocketCloseCode: int
{
    case NORMAL                = 1000;
    case GOING_AWAY            = 1001;
    case PROTOCOL_ERROR        = 1002;
    case UNSUPPORTED_DATA      = 1003;
    case NO_STATUS             = 1005;  // RESERVED
    case ABNORMAL_CLOSURE      = 1006;  // RESERVED
    case INVALID_FRAME_PAYLOAD = 1007;
    case POLICY_VIOLATION      = 1008;
    case MESSAGE_TOO_BIG       = 1009;
    case MANDATORY_EXTENSION   = 1010;
    case INTERNAL_SERVER_ERROR = 1011;
    case TLS_HANDSHAKE         = 1015;  // RESERVED
}
```

Le registre des codes de fermeture RFC 6455 §7.4.1. Les codes spécifiques à l'application
(`4000..4999`, RFC 6455 §7.4.2) restent aussi disponibles : `WebSocket::close()` accepte un `int`
brut en plus de cette enum.

## Exceptions

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // final
              ├── WebSocketBackpressureException    // final
              └── WebSocketConcurrentReadException  // final
```

### TrueAsync\WebSocketException

```php
class WebSocketException extends HttpServerException {}
```

L'exception de base pour toutes les erreurs WebSocket. Étend `HttpServerException`, commune à
tout le projet, donc les handlers catch-all existants continuent de fonctionner.

### TrueAsync\WebSocketClosedException

```php
final class WebSocketClosedException extends WebSocketException
{
    public readonly int $closeCode;
    public readonly string $closeReason;
}
```

La connexion a été fermée pour une raison autre qu'un handshake normal initié par le client : une
erreur de protocole, ou un code d'erreur explicite venant du client. `$closeCode` porte le code de
fermeture RFC 6455 (ou `1006 Abnormal Closure` si aucune frame CLOSE n'est arrivée du tout, par
exemple lors d'une coupure réseau). `$closeReason` porte le texte de raison UTF-8 de la frame
CLOSE du client, ou une chaîne vide si aucune n'a été donnée.

Une fermeture propre par le client (code `1000`) ne lève pas d'exception : `WebSocket::recv()`
renvoie simplement `null` dans ce cas.

### TrueAsync\WebSocketBackpressureException

```php
final class WebSocketBackpressureException extends WebSocketException {}
```

Levée depuis `send()`/`sendBinary()` quand le buffer d'envoi reste plein plus longtemps que
`write_timeout_ms`. C'est le signal, pour l'application, que le client lit trop lentement :
fermez la connexion, ou abandonnez le message et continuez.

### TrueAsync\WebSocketConcurrentReadException

```php
final class WebSocketConcurrentReadException extends WebSocketException {}
```

Une erreur de programmation : une seconde coroutine a appelé `recv()` alors qu'une autre attendait
déjà dans `recv()` sur le même `WebSocket`. Une seule connexion ne peut être lue que depuis un
seul endroit à la fois ; si vous devez distribuer les messages à plusieurs handlers, construisez
une seule boucle `recv()` et dispatchez les messages vous-même depuis celle-ci.

## Voir aussi

- [Guide : WebSocket](/fr/docs/server/websocket.html)
- [`HttpServer::addWebSocketHandler()`](/fr/docs/reference/server/http-server.html#addwebsockethandler)
- [`HttpServerConfig` : options WebSocket](/fr/docs/reference/server/http-server-config.html#websocket)
- [Exceptions TrueAsync Server](/fr/docs/reference/server/exceptions.html)
