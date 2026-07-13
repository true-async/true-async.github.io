---
layout: tutorial
lang: fr
path_key: "/tutors-server/10-grpc.html"
nav_active: docs
permalink: /fr/tutors-server/10-grpc.html
page_title: "gRPC"
description: "addGrpcHandler() : unary et streaming, readMessage/writeMessage, trailers et deadlines."
---

# gRPC

Jusqu'ici, seuls les navigateurs ont parlé à notre serveur. Mais
`ProfileService` a d'autres interlocuteurs aussi : `UserDirectory`,
`GeoDirectory`, la facturation. Les services se parlent depuis longtemps
entre eux non pas via REST mais via gRPC : des contrats stricts, du streaming
dans les deux directions, des deadlines et des codes d'erreur d'emblée.

Habituellement, un serveur séparé est lancé pour gRPC sur un port séparé.
Posez-vous la question : pourquoi, au fait ? gRPC est un protocole au-dessus
de HTTP/2 et HTTP/3. Au-dessus de ce qui écoute déjà pour nous. Le serveur a
juste besoin de distinguer de telles requêtes par le content-type
`application/grpc` et de les remettre à un handler séparé. Et c'est
exactement ce qu'il fait.

## Le contrat d'abord

Une conversation gRPC ne commence pas par du code. Elle commence par un
contrat, et c'est peut-être la principale différence culturelle avec REST.
Décrivons le service de profil dans `profile.proto` :

```protobuf
syntax = "proto3";
package profile;

service ProfileService {
  rpc GetProfile (GetProfileRequest) returns (Profile);
}

message GetProfileRequest { int64 user_id = 1; }

message Profile {
  int64  id     = 1;
  string name   = 2;
  string region = 3;
}
```

Le compilateur protobuf génère des classes PHP à partir de ceci, et le
runtime s'installe avec Composer :

```bash
$ composer require google/protobuf
$ protoc --php_out=src/Generated profile.proto
```

Maintenant le projet a `Profile\GetProfileRequest` et `Profile\Profile` : des
getters typés, des setters, la sérialisation. Et protoc générera exactement
les mêmes classes pour un client en Go, Java ou Python. C'est tout l'intérêt
: un contrat, n'importe quels langages.

## Des messages au lieu de corps

En quoi un handler gRPC diffère-t-il d'un handler HTTP ? Dans l'unité de
communication. Là, nous avions un « corps de requête » et un « corps de
réponse », un de chaque. Ici, c'est un flux de messages dans chaque
direction : `readMessage()` renvoie les octets du prochain entrant ou `null`
à la fin, et `writeMessage()` envoie un sortant. Le serveur est responsable
du framing gRPC, des longueurs et des flags. Les classes générées sont
responsables du contenu :

```php
use Profile\GetProfileRequest;
use Profile\Profile;

$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    // le chemin de la requête nomme la méthode du contrat
    if ($req->getPath() !== '/profile.ProfileService/GetProfile') {
        $res->setTrailer('grpc-status', '12'); // UNIMPLEMENTED
        return;
    }

    $getProfile = new GetProfileRequest();
    $getProfile->mergeFromString($req->readMessage()); // octets -> objet

    $profile = (new Profile())
        ->setId($getProfile->getUserId())
        ->setName(fetchName($getProfile->getUserId()))
        ->setRegion(fetchRegion($getProfile->getUserId()));

    $res->writeMessage($profile->serializeToString()); // objet -> octets
});
```

Le routage ici n'est que le chemin : package, service, méthode. Un client
dans n'importe quel langage, appelant `GetProfile`, envoie un POST à
`/profile.ProfileService/GetProfile`. Et le handler lui-même vit à côté des
routes REST et voit le même pool préchauffé et le même contexte de requête.

Les quatre formes de gRPC sortent de cette même API et ne diffèrent que par
le nombre d'appels :

```php
// Unary : un message là, un en retour
$getProfile->mergeFromString($req->readMessage());
$res->writeMessage($reply->serializeToString());

// Server streaming : un là, plusieurs en retour
$getHistory->mergeFromString($req->readMessage());
foreach (loadHistory($getHistory->getUserId()) as $event) {
    $res->writeMessage($event->serializeToString());
}

// Full duplex : lecture et réponse entrelacées
while (($bytes = $req->readMessage()) !== null) {
    $msg = new ChatMessage();
    $msg->mergeFromString($bytes);
    $res->writeMessage(process($msg)->serializeToString());
}
```

`readMessage()` endort la coroutine jusqu'au prochain message, et
`writeMessage()` répond tout de suite, sans attendre la fin du flux entrant.
Le même duplex que WebSocket, seulement avec un contrat et selon le standard.

## Transmettre les erreurs

gRPC a son propre système de codes d'erreur, et il vit dans un endroit qui
prête d'abord à confusion. Le statut HTTP de la réponse est toujours 200.
Toujours. Le vrai résultat voyage dans les trailers, des en-têtes que HTTP/2
envoie après le corps. Nous les avons entrevus dans le chapitre sur le
streaming, et voici leur principal consommateur :

```php
$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    $data = $req->readMessage();

    if (!authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        $res->setTrailer('grpc-message', 'access denied');
        return;
    }

    $res->writeMessage(process($data));
    // un return propre : le serveur ajoute lui-même grpc-status: 0 (OK)
});
```

Les crashs sont gérés aussi : une exception qui s'échappe du handler se
transforme en `grpc-status: 13` (INTERNAL), plutôt qu'en connexion
abandonnée.

## Deadlines

Vous vous souvenez de combien de chapitres de la première série nous avons
passés sur l'idée que « toute attente doit avoir une limite » ? Eh bien, dans
gRPC cette idée est élevée au rang de standard de protocole. Le client passe
sa deadline directement dans la requête, via l'en-tête `grpc-timeout`, et le
serveur la remet au handler :

```php
$deadline = $req->getGrpcTimeout(); // millisecondes ou null

$result = $group->all()->await(timeout($deadline ?? 5000));
```

Réfléchissez à quel point cette mécanique est juste. Le client a deux cents
millisecondes de patience restantes ? Alors il est inutile d'aller vers
`GeoDirectory` avec un timeout de deux secondes. La deadline est enfilée à
travers toutes les attentes internes, à travers tous les services de la
chaîne, et tout le système respecte la patience du tout premier appelant.

## La fin de la deuxième série

Voilà tout le parcours. Jetons un dernier coup d'œil en arrière.

Les quinze chapitres de la première série construisaient un vocabulaire :
coroutines, annulation, `Future`, channels, scope, groupes, pools, threads,
contexte. Honnêtement, par endroits, on a pu avoir l'impression que le
vocabulaire était excessif. Et puis la deuxième série est arrivée, et il
s'est avéré que le serveur n'est qu'une phrase composée de ces mêmes mots.
Chaque requête est une coroutine. Le pool protège la base de données. Le
scope nettoie après la requête. Le backpressure tient la surcharge à
distance. Les threads occupent les cœurs. Et par-dessus, le statique, le SSE,
le WebSocket et le gRPC sur un seul port.

Notez aussi ce qui n'était dans aucune des deux séries : les callbacks, les
chaînes `.then()`, les mots-clés `async` et `await` une ligne sur deux, la
gestion manuelle de la boucle d'événements. Tout le code est du PHP séquentiel
ordinaire. Il a juste cessé d'attendre pour rien.

À partir d'ici, vous êtes seul. Prenez le service qui réclame depuis
longtemps une refonte, et commencez par un seul handler. La référence des
classes est dans la [documentation du serveur](/fr/docs/server/index.html),
et les rouages internes sont dans l'[architecture](/fr/architecture/server.html).
Et si quelque chose se comporte différemment de ce que ces chapitres ont
promis, vous en savez maintenant assez pour rédiger un bon rapport de bug.
