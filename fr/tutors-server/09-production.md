---
layout: tutorial
lang: fr
path_key: "/tutors-server/09-production.html"
nav_active: docs
permalink: /fr/tutors-server/09-production.html
page_title: "Production"
description: "Timeouts, limites, backpressure sur accept, compression, logs et arrêt gracieux."
---

# Production

Un bon serveur ne se distingue pas d'une démo par sa façon de fonctionner.
Par sa façon de tomber en panne. Tout le monde fonctionne quand l'humeur est
bonne ; la production commence là où arrive le mauvais jour : un pic de
trafic, des clients lents, un déploiement au moment le plus inopportun. Ce
chapitre est entièrement consacré aux mauvais jours.

## Timeouts : personne n'attend éternellement

De la première série, nous avons tiré une règle de fer : toute attente doit
avoir une limite. Voyons où une connexion comporte même des attentes. Le
client envoie une requête, ça fait une. Prend la réponse, ça fait deux. Reste
suspendu entre les requêtes sur le keep-alive, ça fait trois. Chaque étape a
sa propre limite :

```php
$config
    ->setReadTimeout(30)       // la requête met plus de 30 secondes à s'envoyer ? au revoir
    ->setWriteTimeout(60)      // et la réponse met plus d'une minute à se récupérer ? ça aussi
    ->setKeepAliveTimeout(15); // une connexion inactive vit au maximum 15 secondes
```

Le read timeout ne concerne pas seulement l'internet lent. Il existe une
attaque au nom merveilleux, slowloris : le client envoie une requête un octet
par minute et occupe la connexion pour toujours. Une centaine de tels clients
et un serveur sans timeouts est fini. Avec un timeout, ce n'est qu'une
centaine de connexions abandonnées.

La seule exception légitime, que vous connaissez déjà du chapitre SSE : pour
les flux, le write timeout est désactivé, `setWriteTimeout(0)`.

## Limites : refuser à bas coût

Maintenant, à propos de la surcharge. La question n'est pas « si », la
question est « quand ». Et à ce moment-là, le serveur a exactement deux
voies. Voie un : accepter tout le monde, empiler une file, ralentir, et au
final tout le monde reçoit des timeouts, y compris ceux qui auraient pu être
servis. Voie deux : dire aux surnuméraires « occupé » tout de suite, et
servir les autres comme si de rien n'était.

La seconde voie se configure comme ceci :

```php
$config
    ->setMaxConnections(10_000)          // limite dure de connexions
    ->setMaxInflightRequests(1_000)      // requêtes traitées de manière concurrente
    ->setMaxBodySize(10 * 1024 * 1024);  // corps supérieur à 10 Mio ? 413
```

Regardez de près `setMaxInflightRequests`. Vous le reconnaissez ? C'est notre
vieil ami, la limite de concurrence : `POOL_MAX`, `concurrency` sur les
groupes, maintenant au niveau d'un serveur entier. Une requête en trop reçoit
un `503 Retry-After: 1` instantané. Instantané est le mot clé : le client
apprend la vérité en une milliseconde et réessaiera plus tard, au lieu de
rester suspendu dans une file pendant une minute à attendre un timeout.

Il y a aussi une troisième ligne de défense, la plus élégante. Le serveur
lui-même mesure combien de temps les requêtes attendent dans la file.
L'attente croît-elle systématiquement ? Alors nous ne suivons pas, et le
serveur cesse temporairement d'accepter de nouvelles connexions jusqu'à ce
qu'il rattrape. L'algorithme s'appelle CoDel, mais vous le connaissez sous un
autre nom : c'est le backpressure du chapitre sur les channels, appliqué à
`accept()`. Internet est le producteur, les handlers sont le consommateur, et
le producteur est ralenti. Il y a un seul réglage :

```php
$config->setBackpressureTargetMs(20); // quel temps d'attente dans la file considérer comme normal
```

## Compression

Bonne nouvelle : la compression des réponses fonctionne déjà. Le serveur
négocie avec le client via `Accept-Encoding` et choisit le meilleur des
codecs disponibles : zstd, brotli, gzip. Habituellement, il n'y a rien à
faire ici, mais trois leviers valent la peine d'être connus :

```php
$config
    ->setCompressionMinSize(1024)   // ne pas compresser les petites choses : le surcoût coûte plus cher
    ->setZstdLevel(3)               // équilibre vitesse/ratio par codec
    ->setCompressionMimeTypes([...]); // liste blanche : le texte est compressé, le jpeg ne l'est déjà pas
```

Plus un levier côté réponse : `$res->setNoCompression()` pour les endpoints
où la compression est nuisible. Les helpers SSE, d'ailleurs, l'appellent
eux-mêmes ; un gzip qui met en tampon tuerait toute l'instantanéité de la
livraison.

## Logs

Tant que tout va bien, le serveur se tait. D'accord, nous préférerions
entendre parler des ennuis pas par les utilisateurs :

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::WARN)
    ->setLogStream(STDERR);
```

`WARN` couvre les handshakes TLS ratés, les clients abandonnés, les
exceptions avalées. `INFO` ajoute le cycle de vie : démarrage, ports,
workers. Le puits est un flux PHP ordinaire : stderr pour systemd et Docker,
un fichier, ce que vous voulez.

## Un arrêt gracieux

Et le dernier mauvais jour, qui en réalité en est un bon : le déploiement.
Un tableau digne de la peinture à l'huile : le serveur a mille connexions
vivantes, une centaine d'entre elles en pleine écriture vers la base de
données, et voici que débarque la nouvelle version. `kill -9` ? Profitez de
cent transactions avortées et d'une foule d'utilisateurs aux uploads cassés.

La version gracieuse ressemble à ceci :

```php
$config->setShutdownTimeout(30);
```

À la réception de `stop()` ou de SIGTERM, le serveur cesse d'abord d'accepter
les nouvelles, et laisse les actuelles vivre leur vie, jusqu'à trente
secondes. Celles qui n'y sont pas arrivées seront annulées. Et ici, pour la
dernière fois de cette série, la discipline de scope paie : l'annulation
passe coopérativement à travers l'arbre de chaque requête, les blocs
`finally` libèrent les ressources, le pool annule les transactions non
fermées. L'arrêt gracieux n'a pas été écrit comme une fonctionnalité. Il est
tombé de l'architecture.

Pour les connexions à longue durée de vie derrière un load balancer, il y a
encore une touche, `setMaxConnectionAgeMs()` : une connexion plus vieille que
l'âge donné est fermée gracieusement (`Connection: close`, GOAWAY), afin que
les clients se redistribuent entre les machines au lieu de rester suspendus
sur une seule pendant des années.

Voilà, c'est ça la production. La surcharge rencontre un refus rapide, les
clients lents butent sur des timeouts, un déploiement ne déchire pas les
transactions, et le serveur signale lui-même ses problèmes. Il reste une
dernière frontière pour toute la série : jusqu'ici, seuls les navigateurs et
curl ont parlé à notre serveur. Il est temps de laisser entrer d'autres
interlocuteurs, les services voisins, dans leur langue natale.
