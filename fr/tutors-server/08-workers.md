---
layout: tutorial
lang: fr
path_key: "/tutors-server/08-workers.html"
nav_active: docs
permalink: /fr/tutors-server/08-workers.html
page_title: "Workers et HTTP/3"
description: "setWorkers() : les threads de la première série sous le capot du serveur, le bootloader et HTTP/3 sur le même port."
---

# Workers et HTTP/3

Ouvrez un htop quelconque sur le serveur en charge. Notre processus s'échine,
des milliers de requêtes en vol... et sur huit cœurs, un seul est occupé.
Sept au repos. Agaçant ? Agaçant.

Il n'y a rien de nouveau là-dedans, nous l'avons couvert dans le chapitre
sur les threads : pendant que les tâches attendent sur l'I/O, un seul cœur
suffit à tous. Mais sous un trafic réel, le serveur ne fait pas qu'attendre.
Le parsing HTTP, les handshakes TLS, la sérialisation JSON, ce sont des
calculs, et ils se heurtent à ce seul et unique cœur.

La recette de ce même chapitre : donnez des threads au calcul. Le serveur
l'applique en une seule ligne :

```php
$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(Async\available_parallelism());
```

`setWorkers(N)` lance N workers, et c'est littéralement `Async\ThreadPool` du
chapitre quatorze. Pas un « mécanisme similaire », mais exactement le même.
Ce qui veut dire que vous connaissez déjà les règles aussi : chaque worker
est un thread du système d'exploitation à part avec son propre environnement
PHP, sa propre boucle d'événements, ses propres pools. La configuration et
les handlers sont copiés dans chaque worker selon les règles habituelles de
passage entre threads. `start()` dans le parent attend qu'ils soient tous
prêts.

Reste une question : qui distribue les connexions entrantes aux workers ? Et
voici la plus belle partie. Personne. Chaque worker ouvre le même port avec
le flag `SO_REUSEPORT`, et à partir de là c'est le noyau Linux lui-même qui
répartit les connexions entre eux. Pas de dispatcher, pas de file, pas de
verrous. Huit serveurs indépendants cachés derrière un seul port.

## Bootloader : préchauffer chaque worker

Dans la première série, ThreadPool avait un bootloader, et là il ressemblait
à une commodité optionnelle. Ici, il devient la figure centrale. Voici
pourquoi : tout ce que nous avons fait dans le premier chapitre « une fois,
avant `start()` » doit maintenant se produire dans chaque worker. Chacun a sa
propre mémoire, après tout.

```php
$config
    ->setWorkers(8)
    ->setBootloader(function () {
        require __DIR__ . '/vendor/autoload.php';

        Database::initPool(min: 4, max: 16); // son propre PDO Pool dans chaque worker
        Router::compile();
    });
```

La closure s'exécute une fois par worker, avant la première requête. Une
exception à l'intérieur arrête tout le pool. Dur ? Correct : un serveur avec
un worker mal préchauffé sur huit est une machine qui balance des erreurs à
un client sur huit. Mieux vaut qu'il ne démarre pas du tout.

## Le chat rencontre les workers

Et maintenant l'explosion promise. Dans le chapitre précédent, nous avons
construit un chat sur la formule « l'état partagé dans la mémoire du
processus ». Relisez la formule lentement. Dans la mémoire. Du processus.

Lequel des huit ?

Le noyau disperse les connexions comme bon lui semble. Alice a atterri dans
le worker 3, Bob dans le worker 5. Chaque worker a sa propre mémoire, et donc
son propre `$room`. Deux salles du même nom qui ne sauront jamais l'une de
l'autre. Alice écrit dans le vide, Bob se tait dans un autre vide. Pas de
courses, pas d'erreurs, le chat a juste cessé tranquillement d'être un chat.

Le correctif classique consiste à déplacer l'état partagé hors du processus,
dans un pub/sub Redis, et à laisser les workers communiquer à travers lui. Ça
marche, mais voilà qu'un chat a besoin d'un second service tournant à côté
juste pour faire passer des messages entre les threads d'un même serveur.

Alors le serveur porte sa propre réponse : les **topics**. Une connexion
s'abonne à un nom, un message est publié vers ce nom, et le serveur le délivre
à chaque abonné — sur chaque worker. Pas de tableau de connexions, pas de
Redis.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = $req->getQueryParam('room', 'lobby');
    $name = $req->getQueryParam('name', 'guest');

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", "$name: {$msg->data}");
    }
});
```

Comparez avec la salle du chapitre précédent. Le `SplObjectStorage` a disparu,
et avec lui la boucle de diffusion manuelle et le `finally` qui balayait les
fantômes. `subscribe()` place cette connexion dans la salle ; `publish()`
envoie une ligne à tous ceux qui s'y trouvent. Une connexion qui se ferme
quitte ses salles d'elle-même. Et là où l'ancienne salle vivait dans la
mémoire d'un seul worker, un topic les embrasse tous : Alice dans le worker 3
et Bob dans le worker 5 sont de nouveau dans le même `chat/general`.

`publish()` ne bloque jamais — un pair dont le buffer est plein perd la ligne
au lieu de figer la salle, le même compromis que faisait `trySend()`. Il
renvoie le nombre d'abonnés locaux qu'il a atteints ; la livraison aux autres
workers se fait en coulisses. Le nom n'est pas qu'une simple chaîne, c'est un
[filtre MQTT](/fr/docs/server/websocket.html#topics-publishsubscribe-across-every-worker) :
abonnez-vous à `chat/+/typing` et vous recevez le signal de frappe de chaque
salle à la fois.

`setWorkers(1)` reste une réponse honnête pour un petit système — un worker
tient sans peine des milliers de connexions WebSocket qui attendent la plupart
du temps. Mais vous n'avez plus à le choisir juste pour qu'un chat continue de
fonctionner. Une règle à retenir : l'état de la requête vit dans le scope de la
requête, l'état du processus dans le worker, et l'état partagé soit dans un
topic, soit dans un stockage externe.

## HTTP/3 : les mêmes handlers, un transport différent

Puisque nous mettons déjà à l'échelle, amenons la stack à la modernité. À
propos de HTTP/3, il suffit de savoir trois choses. Il fonctionne non pas
sur TCP mais sur QUIC au-dessus d'UDP. Il établit une connexion plus vite et
ne laisse pas un seul paquet perdu bloquer tous les flux à la fois. Et il est
obligatoire de l'apprendre, parce que les navigateurs le préfèrent déjà.

Ça ressemble à un grand chantier de construction ? Regardez :

```php
$config = (new HttpServerConfig())
    ->setWorkers(Async\available_parallelism())
    ->setCertificate('/etc/tls/profile.crt')
    ->setPrivateKey('/etc/tls/profile.key')
    ->addListener('0.0.0.0', 443, tls: true)  // TCP : HTTP/1.1 et HTTP/2
    ->addHttp3Listener('0.0.0.0', 443);       // UDP : HTTP/3
```

Une seule ligne, `addHttp3Listener`. Le même port, et il n'y a aucun
conflit : 443/TCP écoute HTTP/1.1 et HTTP/2, tandis que 443/UDP va à QUIC. Il
n'a pas de flag TLS séparé, parce que selon la spec QUIC n'existe pas sans
TLS ; les certificats sont pris sur le serveur.

Comment les clients apprennent-ils l'existence de l'entrée UDP ? Tout seuls.
À chaque réponse sur TCP, le serveur ajoute un en-tête `Alt-Svc: h3=":443"`.
Le navigateur le voit et envoie les requêtes suivantes sur HTTP/3. Première
visite sur HTTP/2, puis QUIC, et personne n'a rien configuré.

```bash
$ curl --http3 -I https://profile.example.com/
HTTP/3 200
alt-svc: h3=":443"; ma=86400
```

Vous savez ce que j'aime le plus dans ce chapitre ? Ce qui n'y est pas. Nous
avons activé huit threads et la troisième version de HTTP, et pas une seule
ligne n'a changé dans les handlers. Le routage du chapitre deux, le SSE du
chapitre six, le chat du chapitre sept, aucun d'eux n'est au courant que le
monde autour d'eux est devenu multithreadé et s'est mis à parler QUIC. La
mise à l'échelle est partie dans la config, là où est sa place.

Le serveur est devenu rapide. L'étape suivante est de le rendre insubmersible
: que faire face à la surcharge, aux clients lents, au déploiement en plein
trafic. Un chapitre sur les mauvais jours.
