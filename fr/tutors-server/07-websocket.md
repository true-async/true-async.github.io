---
layout: tutorial
lang: fr
path_key: "/tutors-server/07-websocket.html"
nav_active: docs
permalink: /fr/tutors-server/07-websocket.html
page_title: "WebSocket"
description: "WebSocket : la boucle recv, une salle de chat, l'envoi depuis d'autres coroutines et trySend face aux clients lents."
---

# WebSocket

Dans un chat de support, les deux côtés écrivent. L'utilisateur pose une
question, l'opérateur répond, et aucun n'attend l'autre : les messages
circulent dans les deux sens dès qu'ils sont écrits.

Peut-on assembler un tel chat à partir d'outils que nous connaissons déjà ?
Vers le bas, du serveur au navigateur, SSE le portera, nous savons faire ça
depuis le chapitre d'hier. Et vers le haut ? Vers le haut, il faudrait
envoyer un POST séparé pour chaque ligne de l'utilisateur. Une nouvelle
requête, des en-têtes, une réponse, une déconnexion. Et ainsi de suite pour
chaque « merci, ça a aidé ». Ça marcherait, mais pas particulièrement bien.

Pour une conversation à double sens, il existe un protocole séparé,
WebSocket.

Il est construit avec une modestie surprenante. Le client envoie une requête
HTTP ordinaire avec un en-tête `Upgrade` : une proposition de basculer vers
un autre protocole. Le serveur accepte : `101 Switching Protocols`. C'est
tout, HTTP est terminé. Sur la même connexion TCP, les messages voyagent
désormais dans les deux directions, sans requêtes et sans réponses.

```php
use TrueAsync\WebSocket;

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});
```

Le serveur prend entièrement le handshake à sa charge : le handler est
appelé une fois que la connexion est déjà basculée, et il reçoit un objet
tout prêt. Le modèle est familier : une connexion, une coroutine. `WebSocket`
implémente `Iterator`, et c'est l'itérateur qui endort la coroutine jusqu'au
prochain message. Le client est parti, la boucle s'est terminée, le serveur
a fermé la connexion lui-même avec le code `1000 Normal`. Et les handlers
HTTP ordinaires continuent de fonctionner à côté, sur le même port.

## Une salle de chat

L'echo est un échauffement. Dans un vrai chat, le message d'un participant
doit atteindre tous les autres. Arrêtez-vous une seconde sur ce que cela
signifie techniquement : la coroutine qui sert une connexion doit écrire
dans les autres. Ça ressemble à une source de problèmes ? Regardez :

```php
use TrueAsync\HttpRequest;

/** @var SplObjectStorage<WebSocket, string> $room */
$room = new SplObjectStorage();

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) use ($room) {
    $name = $req->getQueryParam('name', 'guest');
    $room->attach($ws, $name);
    $ws->send("Bienvenue, personnes dans la salle : {$room->count()}");

    try {
        foreach ($ws as $msg) {
            foreach ($room as $peer) {
                if ($peer !== $ws) {
                    $peer->trySend("$name: {$msg->data}");
                }
            }
        }
    } finally {
        $room->detach($ws);
    }
});
```

Trente lignes, et à l'intérieur trois fils de la première série se
rejoignent d'un coup. Ne passez pas trop vite, chacun mérite une pause.

Le premier : la salle n'est qu'un objet. Un `SplObjectStorage` ordinaire,
partagé entre toutes les coroutines, sans le moindre verrou. Le chapitre sur
les channels avait promis qu'au sein d'un seul thread c'est autorisé, et le
voici en action.

Le deuxième : `finally`. Un participant peut partir proprement, peut
disparaître avec le Wi-Fi, ou la coroutine peut être annulée par le serveur
lui-même à l'arrêt. Trois scénarios, un seul `finally`, et un fantôme est
garanti de ne pas s'attarder dans la salle. L'annulation coopérative telle
qu'elle est.

Le troisième : écrire dans la connexion d'autrui est autorisé depuis
n'importe quelle coroutine. `send()` et `trySend()` sont sûrs pour cela ; le
serveur lui-même veille à ce que les frames de différents expéditeurs ne se
mélangent pas sur le fil. La lecture, en revanche, ne se fait que depuis une
seule. Un second `recv()` concurrent sur la même connexion reçoit une
exception, et à juste titre : un flux d'octets n'a aucune sémantique
significative pour deux lecteurs.

## Un client lent n'arrêtera pas la salle

Avez-vous remarqué que la diffusion utilise `trySend`, pas `send` ? Ce n'est
pas une faute de frappe, c'est une décision, et il vaut la peine d'en
parler.

Que fait `send()` sur un buffer plein ? Exactement, du backpressure : il
endort la coroutine jusqu'à ce que le client résorbe l'arriéré. Pour une
réponse personnelle, c'est justement ce que vous voulez. Maintenant
imaginez-le dans une boucle de diffusion. Un participant est entré dans un
tunnel avec son internet mobile, son buffer est plein, et... toute la salle
attend. Cent personnes ne reçoivent aucun message parce qu'une seule a une
mauvaise réception.

`trySend()` n'attend jamais. Soit le message est accepté dans le buffer et
`true`, soit le buffer est plein et `false`, le message abandonné. Le chat
sacrifie délibérément les messages du traînard pour ne pas punir tout le
monde. Cruel ? Pour un chat, non : une ligne manquée dans une salle n'est
pas une tragédie. Si la perte n'est pas permise dans votre tâche, utilisez
`send()` et supportez les pauses, ou construisez une file par client. Les
deux stratégies sont honnêtes, le choix est vôtre.

En dernier recours, il y a aussi un garde-fou : si `send()` est resté en
attente plus longtemps que le timeout d'écriture, il lève
`WebSocketBackpressureException`. Cela concerne un client qui maintient la
connexion ouverte mais ne lit pas du tout.

## Qui les a laissés entrer dans le chat ?

Pour l'instant, n'importe qui peut entrer dans la salle. Si vous voulez
contrôler à la porte, déclarez un troisième paramètre sur le handler, et le
serveur transmettra l'objet du handshake :

```php
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(
    function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade) use ($room) {
        if (authenticate($req) === null) {
            $upgrade->reject(401, 'auth required');
            return;
        }

        // ... la salle ...
    }
);
```

`reject()` répond avec une erreur HTTP ordinaire au lieu de basculer le
protocole. À travers le même objet, un sous-protocole est également négocié,
si le client en propose un.

Le chat est prêt : la salle en mémoire, la diffusion instantanée, les
traînards ne ralentissent personne. Retenez la formule sur laquelle tout
repose : « l'état partagé dans la mémoire du processus ». Retenez-la bien.
Dans le prochain chapitre, nous activerons plusieurs workers pour occuper
tous les cœurs de la machine, et cette formule innocente sera la première à
exploser.
