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

Que faire ? Les issues standard sont les suivantes. Pour un petit système,
un honnête `setWorkers(1)` : un worker tient parfaitement des milliers de
connexions WebSocket, puisqu'elles attendent la plupart du temps. Pour un
grand, déplacez l'état partagé à l'extérieur, généralement dans un pub/sub
Redis, et laissez les workers communiquer à travers lui. Une règle à
retenir : l'état de la requête vit dans le scope de la requête, l'état du
processus dans le worker, l'état partagé dans un stockage externe.

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
