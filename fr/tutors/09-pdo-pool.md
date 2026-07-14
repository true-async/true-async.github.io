---
layout: tutorial
lang: fr
path_key: "/tutors/09-pdo-pool.html"
nav_active: docs
permalink: /fr/tutors/09-pdo-pool.html
page_title: "PDO Pool"
description: "Pourquoi les coroutines ne peuvent pas partager un unique PDO, et comment le pool de connexions intégré résout cela de manière transparente."
---

# PDO Pool

L'import est presque terminé : les workers vérifient les adresses via `GeoDirectory`. Il ne
reste plus qu'à enregistrer les adresses vérifiées dans la base de données. Cela paraît trivial :

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret');

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue, $pdo) {
        foreach ($queue as $address) {
                checkAddress($address);
                saveAddress($pdo, $address);
        }
    });
}
```

Un unique objet `PDO` partagé par dix coroutines. Dans le chapitre sur les canaux, nous avons dit
que les situations de compétition sur les données ne se produisent pas au sein d'un seul thread, donc cela devrait aller,
n'est-ce pas ?

Non. C'est vrai pour la mémoire. Mais une connexion à une base de données n'est pas de la mémoire, c'est un
protocole au-dessus d'un socket : requête, réponse, requête, réponse, strictement
dans l'ordre. Chaque requête à la base de données est un point d'attente où une coroutine se met à
dormir et le contrôle passe à une autre. Et cette autre écrit sa propre
requête dans le même socket :

```php
// Worker 1
$pdo->beginTransaction();
$pdo->exec("INSERT INTO addresses ...");
// point d'attente : le worker 1 s'endort, le worker 2 se réveille

// Worker 2
$pdo->beginTransaction(); // sur la même connexion !
$pdo->exec("UPDATE ...");
$pdo->commit(); // valide à la fois sa propre transaction et celle de quelqu'un d'autre
```

Les réponses s'emmêlent, les transactions valident le travail les unes des autres. Les
situations de compétition sont de retour, seulement elles vivent désormais dans la connexion plutôt que dans la mémoire.

Bon, alors donnons à chaque coroutine sa propre connexion ?

```php
$workers->spawn(function () use ($queue) {
    $pdo = new PDO(/* ... */); // sa propre connexion
    // ...
});
```

Ça va pour dix workers. Mais imaginez non pas un travail d'import, mais un serveur, où une
coroutine est créée pour chaque requête. Mille coroutines, cela signifie mille
connexions TCP. MySQL en autorise 151 par défaut, PostgreSQL 100. Et
ouvrir une connexion pour quelques millisecondes de travail est tout simplement coûteux : la
poignée de main avec la base de données peut prendre plus de temps que la requête elle-même.

Cela vous dit quelque chose ? Le chapitre sur les canaux avait le même embranchement : cent
mille connexions vers `GeoDirectory`, ou une file d'attente pour dix.

## Un pool : une file d'attente à l'envers

La solution s'appelle un pool de connexions : ouvrir N connexions à l'avance
et les confier aux coroutines pour la durée de leur travail. Il se trouve que
nous savons déjà en construire un. Un pool est un canal qui contient des connexions :

```php
$pool = new Channel(5);

for ($i = 0; $i < 5; $i++) {
    $pool->send(new PDO(/* ... */));
}

// À l'intérieur d'une coroutine :
$pdo = $pool->recv();   // prendre une connexion
saveAddress($pdo, $address);
$pool->send($pdo);      // la rendre
```

Les connexions libres restent dans le tampon. Si elles sont toutes occupées, `recv` endort la
coroutine jusqu'à ce que quelqu'un rende une connexion. La même
synchronisation que dans le chapitre précédent, sauf que la file contient des ressources
au lieu de tâches.

Le schéma fonctionne, mais il a un point faible : vous devez penser à rendre la
connexion, quoi qu'il arrive, y compris en cas d'exception ou d'annulation.
Et puis il y a les transactions, les connexions rompues, les reconnexions. Pour PDO,
tout cela est déjà pris en charge, directement dans le cœur.

## PDO Pool

Le pool est intégré à `PDO` lui-même et s'active via des attributs de
constructeur :

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 2,
    PDO::ATTR_POOL_MAX     => 10,
]);
```

Vu de l'extérieur, rien n'a changé : ce tout premier exemple, où un unique
`$pdo` est distribué à dix workers, est maintenant correct. L'objet `$pdo` n'est
plus une connexion, c'est une façade pour le pool. Quand une coroutine exécute sa
première requête, le pool lui remet une connexion dédiée, et toutes les
requêtes de cette coroutine passent par elle. Une fois la coroutine terminée, la
connexion retourne au pool, prête pour la coroutine suivante.

Pas de `recv` et `send` manuels : l'acquisition et la restitution se font d'elles-mêmes, aux
bons moments, quelle que soit l'issue. Le code ressemble à du PHP synchrone
ordinaire avec un PDO ordinaire, et c'était toute l'idée.

## Transactions

Une transaction est un état qui appartient à une connexion, si bien que le pool la traite
de manière particulière : tant qu'une transaction est ouverte, la connexion est épinglée à sa
coroutine et ne retourne pas au pool :

```php
$workers->spawn(function () use ($pdo, $queue) {
    // ...
    $pdo->beginTransaction();
    $pdo->exec("INSERT INTO addresses (user_id, region) VALUES (...)");
    $pdo->exec("UPDATE users SET address_checked = 1 WHERE id = ...");
    $pdo->commit();
    // c'est seulement maintenant que la connexion peut retourner au pool
});
```

Que se passe-t-il si une coroutine se termine sans appeler `commit` ? Rappelez-vous le chapitre sur
Scope : un worker pouvait être annulé en plein milieu d'une transaction, et
c'est un scénario normal, pas une catastrophe. Avant de rendre la connexion,
le pool exécute automatiquement un `ROLLBACK`. Une transaction inachevée ne
fuitera pas vers la coroutine suivante et ne traînera pas dans la base de données.

## Quand une connexion tombe

Un import peut durer une heure. En une heure, la base de données peut redémarrer,
le réseau peut avoir un raté, ou un DBA peut tuer une session. En PHP classique, le
script planterait tout simplement, mais une application de longue durée doit pouvoir
continuer.

Le pool vérifie les connexions au moment où elles sont rendues : une connexion rompue est
détruite au lieu d'être remise à la coroutine suivante. Et si une requête
échoue à cause d'une connexion perdue, il suffit de la réessayer sur le même
`$pdo`, le pool remettra à la coroutine une nouvelle connexion :

```php
try {
    saveAddress($pdo, $address);
} catch (PDOException $e) {
    saveAddress($pdo, $address); // le pool a déjà substitué une nouvelle connexion
}
```

Pas besoin d'écrire une logique de reconnexion, pas besoin de recréer l'objet `PDO`. Il suffit de
réessayer la requête, le pool s'occupe de tout le reste.

Au final, le code fonctionne comme si chaque coroutine avait sa propre connexion à la
base de données. En réalité, il n'y a que dix connexions, et le pool
les passe constamment de main en main, garde un œil sur les transactions, et
écarte les mortes. Mais rien de ce travail de cuisine ne transparaît de
l'extérieur, et c'est là le principal avantage : nous écrivons simplement du code ordinaire avec PDO.

À propos, nos workers travaillent encore à moitié à l'aveugle : ils vérifient les adresses
et les enregistrent, mais personne ne compte combien d'adresses se sont révélées mauvaises,
ni lesquelles. Comment récupérer des résultats depuis les coroutines et les rassembler
commodément ? C'est ce que nous aborderons au prochain chapitre.
