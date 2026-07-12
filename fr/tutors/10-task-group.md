---
layout: tutorial
lang: fr
path_key: "/tutors/10-task-group.html"
nav_active: docs
permalink: /fr/tutors/10-task-group.html
page_title: "TaskGroup"
description: "TaskGroup : un groupe de tâches avec résultats, et les stratégies d'attente all, race, any."
---

# TaskGroup

Supposons qu'une page de profil utilisateur soit assemblée à partir de trois sources : les données utilisateur depuis la
base de données, les commandes depuis la base de données, et les avis depuis une API externe. Les
sources ne dépendent pas les unes des autres, elles devraient donc être demandées de manière concurrente.
Nous savons déjà faire cela :

```php
$user    = spawn(fetchUser(...), $userId);
$orders  = spawn(fetchOrders(...), $userId);
$reviews = spawn(fetchReviews(...), $userId);

$profile = new UserProfile(await($user), await($orders), await($reviews));
```

Acceptable pour trois tâches. Mais regardez de près : c'est encore une fois la comptabilité
manuelle du chapitre sur `Scope`, sauf que maintenant il nous faut aussi les résultats.
Chaque coroutine doit être retenue et attendue, et si `fetchUser` lance une
exception, `fetchOrders` et `fetchReviews` continueront de s'exécuter pour rien :
il faudrait les annuler « à la main » dans un `catch`.

Et il existe des tâches où l'approche manuelle devient franchement pénible. Par
exemple, prendre le résultat de la coroutine qui se termine la première et annuler
les autres. Essayez d'écrire cela avec `await` dans une boucle et vous vous retrouverez avec un
enchevêtrement de vérifications et d'annulations.

`Scope` n'est pas d'un grand secours ici non plus : il gère la durée de vie des coroutines, mais
ne sait rien de leurs résultats. Il nous faut une primitive de plus haut niveau.

## Un groupe de tâches

`TaskGroup` regroupe des tâches en un tout unique : il les exécute dans son propre `Scope`,
stocke leurs résultats, et vous permet d'attendre le groupe comme une seule unité :

```php
use Async\TaskGroup;

$group = new TaskGroup();

$group->spawnWithKey('user',    fn() => fetchUser($userId));
$group->spawnWithKey('orders',  fn() => fetchOrders($userId));
$group->spawnWithKey('reviews', fn() => fetchReviews($userId));

$data = $group->all()->await();

$profile = new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

La méthode `all()` renvoie un `Future` familier, qui se résout en un tableau de
résultats une fois que chaque tâche s'est terminée. Nous avons assigné les clés nous-mêmes via
`spawnWithKey`, si bien que le tableau contient des entrées nommées au lieu de simples index.

Et comme c'est un `Future`, un timeout est offert gratuitement, via le même jeton que
toujours :

```php
$data = $group->all()->await(timeout(5000));
```

Si ne serait-ce qu'une tâche lance une exception, le groupe se comporte comme le Scope du
chapitre huit : les tâches restantes sont annulées, et `await` lance une
`CompositeException` qui contient toutes les erreurs. Le groupe collecte soit
tout, soit rien : il n'existe pas d'état intermédiaire.

## Le premier à terminer : race

`all()` n'est qu'une des stratégies d'attente. Repensez à `GeoDirectory` :
il a trois réplicas, et l'un d'eux est parfois lent. L'astuce classique :
envoyer la requête à tous les réplicas et prendre la première réponse :

```php
$group = new TaskGroup();

foreach (['geo-1', 'geo-2', 'geo-3'] as $host) {
    $group->spawn(fn() => checkAddressAt($host, $address));
}

$verdict = $group->race()->await();
```

`race()` se résout avec le résultat de la tâche qui se termine la première, que ce
soit un succès ou un échec. Exactement le scénario « prendre la première et ne pas attendre
les autres » qui est si pénible à écrire à la main.

## Le premier à réussir : any

`race()` a un tranchant dur : si la première tâche à se terminer se trouve être une
tâche en échec, vous obtenez son exception. Parfois, vous avez besoin de quelque chose de plus doux :
essayer plusieurs fournisseurs et prendre la première réponse réussie, en fermant les yeux sur
les échecs :

```php
$group = new TaskGroup();

$group->spawn(fn() => geocodeViaGoogle($address));
$group->spawn(fn() => geocodeViaOsm($address));
$group->spawn(fn() => geocodeViaYandex($address));

$coords = $group->any()->await();
$group->suppressErrors();
```

`any()` ignore les échecs et renvoie le premier gagnant. Vous n'obtenez une
exception que si chaque tâche échoue, et ce sera une `CompositeException` avec la
liste complète des causes. Remarquez l'appel `suppressErrors()` : personne n'a traité
les erreurs des fournisseurs perdants, et le groupe veut une confirmation explicite
que c'était intentionnel. Un principe familier du chapitre sur les
exceptions : une erreur ne peut pas simplement disparaître discrètement.

## Limite de concurrence

Et maintenant quelque chose d'inattendu. Souvenez-vous du pool de workers du chapitre
sur les canaux : un canal, dix coroutines, une boucle `recv` ? `TaskGroup` peut faire la
même chose en quelques lignes :

```php
$group = new TaskGroup(concurrency: 10);

while (($row = fgetcsv($handle)) !== false) {
    $group->spawn(fn() => checkAddress($row[$addressIndex]));
}

$group->close();

foreach ($group as $key => [$result, $error]) {
    // les résultats arrivent au fur et à mesure qu'ils sont prêts
}
```

Le paramètre `concurrency: 10` plafonne le nombre de tâches qui s'exécutent en même temps : le reste
attend son tour et ne démarre même pas de coroutine tant qu'une place ne se libère pas.
`close()` joue le même rôle que pour un canal : il annonce qu'aucune nouvelle
tâche n'arrive. Et `foreach` distribue les résultats au fur et à mesure qu'ils sont prêts,
sans attendre que le groupe entier se termine.

Cela veut-il dire que le canal n'était finalement pas nécessaire ? Non. Un canal est une
primitive de synchronisation à partir de laquelle on peut tout construire. `TaskGroup` est un
assemblage prêt à l'emploi pour le cas le plus courant : « exécuter un ensemble de tâches et obtenir les
résultats ». Quand une tâche correspond à ce schéma, tournez-vous vers `TaskGroup` ; quand vous avez besoin
d'une topologie non standard, les canaux et Scope sont toujours entre vos mains.

En résumé : `TaskGroup` est un Scope plus des résultats. Un groupe de tâches se transforme en
une valeur unique à laquelle vous pouvez demander tout d'un coup, la première à se terminer, ou
la première à réussir.

Un dernier détail : `TaskGroup` conserve soigneusement tous les résultats. Appelez
`race()` deux fois, et vous obtiendrez la même réponse les deux fois. Itérez à nouveau le groupe
avec `foreach`, et il distribue de nouveau tout depuis le début.
Pour une page de profil, c'est commode. Imaginez maintenant un pipeline qui fait passer cent
mille tâches à travers un groupe. Tout ce dont le groupe se souvient vit
en mémoire. Vous voyez le piège ? C'est ce dont nous parlerons au prochain chapitre.
