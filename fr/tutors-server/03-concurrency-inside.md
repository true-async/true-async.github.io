---
layout: tutorial
lang: fr
path_key: "/tutors-server/03-concurrency-inside.html"
nav_active: docs
permalink: /fr/tutors-server/03-concurrency-inside.html
page_title: "La concurrence à l'intérieur d'une requête"
description: "TaskGroup dans un gestionnaire, le PDO Pool sous charge, et request_context()."
---

# La concurrence à l'intérieur d'une requête

Dans le chapitre précédent, `showProfile` chargeait le profil en une
seule ligne, et j'ai honnêtement fait comme s'il n'y avait rien derrière.
Il est temps d'avouer. Derrière se cachent trois sources : les données
utilisateur depuis la base de données, les commandes depuis la base de
données, les avis depuis une API externe. Trois allers-retours
indépendants pour les données.

Un problème familier ? Bien sûr. C'est le chapitre dix de la première
série mot pour mot, et la solution se transpose sans le moindre
changement :

```php
use Async\TaskGroup;

function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $group = new TaskGroup();

    $group->spawnWithKey('user',    fn() => fetchUser($userId));
    $group->spawnWithKey('orders',  fn() => fetchOrders($userId));
    $group->spawnWithKey('reviews', fn() => fetchReviews($userId));

    $res->json($group->all()->await(timeout(2000)));
}
```

Les trois requêtes partent de manière concurrente. La page s'assemble
dans le temps de la source la plus lente, non dans la somme des trois. Il
y a un timeout, il y a l'échec conjoint, il y a `CompositeException`.

Ici il est important de ressentir une chose : le serveur n'a introduit
aucune règle de concurrence qui lui soit propre. Aucune, absolument. Le
gestionnaire est une coroutine ordinaire, et à l'intérieur tout ce que
vous connaissez déjà fonctionne. Le serveur a simplement ouvert une porte
par laquelle les requêtes HTTP entrent dans le monde que vous connaissez
déjà.

## Le pool sous charge réelle

Vous souvenez-vous du chapitre neuf de la première série ? Dix workers
d'import, un seul objet `PDO`, des transactions emmêlées, le chaos. À
l'époque c'était un exemple pédagogique avec dix coroutines. Eh bien,
oubliez les dix.

Dans un serveur, il y a autant d'utilisateurs concurrents de la base de
données qu'il y a de requêtes actuellement en vol. Vingt. Cinq cents.
Autant que le trafic en amène, et vous ne contrôlez pas ce nombre. La
seule chose qui vous sauve, vous la connaissez déjà :

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 4,
    PDO::ATTR_POOL_MAX     => 16,
]);
```

La mécanique est la même qu'avant : chaque coroutine possède une
connexion en exclusivité à son moment, les transactions sont épinglées,
et une connexion perdue est discrètement remplacée par une neuve. Mais
`POOL_MAX` a désormais un nouveau rôle. C'est à présent un fusible entre
la tempête et la base de données : mille requêtes concurrentes feront la
queue pour seize connexions. Convenez-en, c'est mieux que mille
connexions arrivant sur PostgreSQL d'un coup.

## À qui est cette requête ?

Le chapitre quinze de la première série se terminait sur la question de
savoir où stocker le « courant » : l'utilisateur, la locale,
l'identifiant de la requête. À l'époque, nous avons construit la réponse
sur les contextes. Le serveur mène cette histoire jusqu'au bout, et le
fait avec élégance.

Chaque gestionnaire s'exécute dans son propre scope. Et le scope de la
requête possède un contexte partagé à travers tout l'arbre de coroutines
de cette requête :

```php
use function Async\request_context;
use function Async\spawn;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    request_context()
        ->set('request_id', $req->getHeader('x-request-id') ?? bin2hex(random_bytes(8)))
        ->set('user_id', authenticate($req));

    // ... même dix niveaux d'appels plus bas ...
});

function logInfo(string $message): void
{
    $requestId = request_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

`logInfo` peut être appelée depuis le gestionnaire. Depuis une coroutine
qu'il a lancée. Depuis une coroutine à l'intérieur d'un `TaskGroup` à
l'intérieur d'un service à l'intérieur d'un dépôt. Peu importe :
`request_context()` est une seule et même chose partout, tant que nous
sommes à l'intérieur de cette requête. Et la requête voisine, traitée en
alternance avec la nôtre en ce moment même ? Elle a la sienne. Trois
cents requêtes concurrentes, trois cents `request_id` indépendants, zéro
variable globale.

La différence avec `current_context()` peut désormais se formuler en une
ligne : celui-là concerne une seule coroutine, celui-ci concerne toute
la requête.

## Le scope nettoie après la requête

Et la dernière conséquence, la plus invisible et la plus précieuse.
Parce que le gestionnaire vit dans un scope, tout le chapitre huit de la
première série s'applique à la requête automatiquement, sans la moindre
action de votre part.

Vous avez lancé une coroutine et oublié de l'attendre ? La requête se
termine, le scope nettoie. Le client a coupé la connexion à mi-chemin ?
Le serveur annule le scope de la requête, l'annulation atteint
coopérativement chaque coroutine enfant, et chaque `finally` libère ce
qui lui revient. Vous souvenez-vous de la discipline qu'exigeait la
concurrence structurée ? Ici, elle a cessé d'être une discipline. C'est
désormais une propriété de la plateforme : la vie de toute coroutine de
requête est bornée par la requête elle-même. Point final.

Voilà pour la partie invisible du serveur. Viennent ensuite les octets,
et en quantité : le client envoie un fichier d'un gigaoctet, et nous lui
renvoyons un rapport de deux gigaoctets. Où mettre tout cela pour ne pas
réveiller l'OOM killer ? Le prochain chapitre porte exactement là-dessus.
