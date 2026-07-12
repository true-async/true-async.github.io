---
layout: tutorial
lang: fr
path_key: "/tutors-server/01-first-server.html"
nav_active: docs
permalink: /fr/tutors-server/01-first-server.html
page_title: "Votre premier serveur"
description: "Un serveur HTTP à l'intérieur de PHP : HttpServer, HttpServerConfig et votre premier gestionnaire."
---

# Votre premier serveur

Rappelons comment PHP sert habituellement une requête. Nginx accepte la
connexion et la transmet à PHP-FPM. FPM saisit un processus libre. Le
processus se réveille, charge les classes, ouvre une connexion à la base
de données, assemble la réponse, l'envoie. Puis il meurt. Tout ce qu'il
a réussi à construire, chaque connexion, chaque cache, tous ces pools si
soigneusement préchauffés de la première série, part à la poubelle. Une
milliseconde plus tard, la requête suivante arrive, et toute l'histoire
recommence à zéro. Cent fois par seconde. Mille.

Pendant ce temps, dans la première série, nous avons bâti tout un
arsenal de choses pour lesquelles une telle vie est contre-indiquée : un
pool de connexions est utile lorsqu'il vit longtemps, et un `Future`
mémoïsé n'a aucun sens s'il meurt en même temps que le processus.

Le plan de cette série est donc simple : supprimer les
intermédiaires. `TrueAsync Server` est une extension qui exécute un
serveur `HTTP` directement à l'intérieur du processus `PHP` :

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    new HttpServerConfig()->addListener('0.0.0.0', 8080)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

```bash
$ php server.php &
$ curl -i http://localhost:8080/
HTTP/1.1 200 OK
Content-Length: 13

Hello, World!
```

`addListener` ouvre un port, `addHttpHandler` enregistre une fonction
gestionnaire, et `start()` lance la boucle d'événements et ne revient
jamais. Chaque requête entrante exécute le gestionnaire.

## Un gestionnaire est une coroutine

Chaque invocation de gestionnaire s'exécute dans sa propre coroutine
(`spawn`). Qu'est-ce que cela signifie en pratique ? Faisons une
expérience. Ajoutons au serveur une route délibérément lente :

```php
use function Async\delay;

$server->addHttpHandler(function ($request, $response) {
    if ($request->getPath() === '/slow') {
        delay(5000); // cinq secondes de travail d'E/S « lourd »
        $response->setBody("was slow\n");
        return;
    }

    $response->setBody("fast\n");
});
```

Ouvrez maintenant deux terminaux. Dans le premier, demandez `/slow`. Il
reste suspendu, à attendre ses cinq secondes. Sans l'attendre, demandez
`/` dans le second terminal :

```bash
$ curl http://localhost:8080/
fast
```

Instantanément.

Si vous avez lu la première série, vous comprenez déjà ce qui s'est
passé. La coroutine `/slow` s'est endormie dans `delay`, l'ordonnanceur
a passé le relais, et le serveur a tranquillement servi la seconde
requête. Ce sont les mêmes compteurs « A » et « B » du tout premier
chapitre, sauf qu'ils s'appellent maintenant des requêtes HTTP. Un seul
thread. Une seule boucle d'événements. Des milliers de clients
concurrents.

Imaginez maintenant ce que ce même `/slow` ferait à un FPM classique.
Cinq secondes de sommeil, ce sont cinq secondes pendant lesquelles un
worker entier est hors service. Une douzaine de telles requêtes et le
pool de workers est épuisé. Tout le site reste planté à attendre pendant
que quelqu'un finit sa sieste.

## Un processus qui ne meurt pas

La seconde conséquence est plus intéressante que la première, même si
elle paraît banale. `start()` ne revient jamais. Ce qui signifie que
tout ce qui est créé avant lui vit aussi longtemps que le serveur :

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX     => 10,
]);

$directory = new RegionsDirectory(); // mémoïsation du chapitre six

$server->addHttpHandler(function ($request, $response) use ($pdo, $directory) {
    // le pool est déjà chaud, l'annuaire est déjà chargé
});

$server->start();
```

Le pool de connexions s'ouvre une seule fois. L'annuaire des régions se
charge une seule fois. Les routes se compilent une seule fois.
Souvenez-vous des efforts que la première série a consacrés à
l'outillage de réutilisation ? Voici l'endroit où tout cela trouve enfin
sa place. Le démarrage à froid n'est pas devenu plus rapide. Il a
disparu.

Pour être juste, une longue vie a un prix, et il vaut mieux le dire dès
le départ. Une fuite mémoire n'est plus pardonnée par la mort du
processus après la requête. Une variable globale n'est plus « pour une
seule requête », elle est pour toujours et pour tout le monde. Pas de
panique : le scope, les pools et le contexte de la première série ont
été inventés exactement pour cela, et nous couvrirons les détails
propres au serveur dans un chapitre à part.

Pour l'instant, notre serveur a un problème plus simple : il répond la
même chose à tout. `GET /profile/42`, `POST /profile/42/address`, une
faute de frappe dans l'URL, cela ne fait aucune différence. Un véritable
`ProfileService` devra apprendre à lire la requête. C'est ce que nous
aborderons ensuite.
