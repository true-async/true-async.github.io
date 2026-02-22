---
layout: docs
lang: fr
path_key: "/docs/components/task-group.html"
nav_active: docs
permalink: /fr/docs/components/task-group.html
page_title: "Async\\TaskGroup"
description: "Async\\TaskGroup -- un pattern de concurrence structuree de haut niveau pour la gestion de groupes de taches."
---

# La classe Async\TaskGroup

(PHP 8.6+, True Async 1.0)

## Introduction

Lorsqu'on travaille avec des coroutines, il est souvent necessaire de lancer plusieurs taches et d'attendre leurs resultats.
En utilisant directement `spawn()` et `await()`, le developpeur prend la responsabilite de s'assurer
que chaque coroutine est soit attendue, soit annulee. Une coroutine oubliee continue de s'executer,
une erreur non geree est perdue, et l'annulation d'un groupe de taches necessite du code manuel.

Les fonctions `await_all()` et `await_any()` ne tiennent pas compte des relations logiques entre differentes taches.
Par exemple, lorsque vous devez effectuer plusieurs requetes, prendre le premier resultat et annuler les autres,
`await_any()` necessite du code supplementaire du programmeur pour annuler les taches restantes.
Un tel code peut etre assez complexe, donc `await_all()` et `await_any()` doivent etre consideres
comme des anti-patterns dans cette situation.

Utiliser `Scope` a cette fin n'est pas adapte, car les coroutines de taches peuvent creer d'autres coroutines enfants,
ce qui oblige le programmeur a maintenir une liste de coroutines de taches et a les suivre separement.

**TaskGroup** resout tous ces problemes. C'est un pattern de concurrence structuree de haut niveau
qui garantit : toutes les taches seront correctement attendues ou annulees. Il regroupe logiquement les taches
et permet d'operer sur elles comme une seule unite.

## Strategies d'attente

`TaskGroup` fournit plusieurs strategies pour attendre les resultats.
Chacune retourne un `Future`, qui permet de passer un timeout : `->await(Async\timeout(5.0))`.

- **`all()`** -- retourne un `Future` qui se resout avec un tableau de tous les resultats des taches,
  ou se rejette avec `CompositeException` si au moins une tache a lance une exception.
  Avec le parametre `ignoreErrors: true`, retourne uniquement les resultats reussis.
- **`race()`** -- retourne un `Future` qui se resout avec le resultat de la premiere tache terminee,
  qu'elle ait reussi ou non. Les autres taches continuent de s'executer.
- **`any()`** -- retourne un `Future` qui se resout avec le resultat de la premiere tache *reussie*,
  en ignorant les erreurs. Si toutes les taches ont echoue -- se rejette avec `CompositeException`.
- **`awaitCompletion()`** -- attend la fin complete de toutes les taches, ainsi que des autres coroutines du `Scope`.

## Limite de concurrence

Lorsque le parametre `concurrency` est specifie, `TaskGroup` fonctionne comme un pool de coroutines :
les taches depassant la limite attendent dans une file d'attente et ne creent pas de coroutine tant qu'un slot libre n'apparait pas.
Cela economise la memoire et controle la charge lors du traitement d'un grand nombre de taches.

## TaskGroup et Scope

`TaskGroup` utilise `Scope` pour gerer le cycle de vie des coroutines de taches.
Lors de la creation d'un `TaskGroup`, vous pouvez passer un `Scope` existant ou laisser `TaskGroup` creer un `Scope` enfant a partir du scope courant.
Toutes les taches ajoutees a `TaskGroup` s'executent a l'interieur de ce `Scope`.
Cela signifie que lorsque `TaskGroup` est annule ou detruit,
toutes les coroutines seront automatiquement annulees, assurant une gestion sure des ressources et empechant les fuites.

## Scellement et iteration

`TaskGroup` permet d'ajouter des taches dynamiquement, jusqu'a ce qu'il soit
scelle a l'aide de la methode `seal()`.

La methode `all()` retourne un `Future` qui se declenche lorsque toutes les taches existantes
dans la file d'attente sont terminees. Cela permet d'utiliser `TaskGroup` dans une boucle, ou les taches sont ajoutees dynamiquement,
et `all()` est appele pour obtenir les resultats de l'ensemble courant de taches.

`TaskGroup` supporte egalement `foreach` pour iterer sur les resultats au fur et a mesure qu'ils sont prets.
Dans ce cas, `seal()` doit etre appele apres l'ajout de toutes les taches pour signaler qu'il
n'y aura pas de nouvelles taches, et `foreach` peut terminer apres le traitement de tous les resultats.

## Vue d'ensemble de la classe

```php
final class Async\TaskGroup implements Async\Awaitable, Countable, IteratorAggregate {

    /* Methodes */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Ajout de taches */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Attente des resultats */
    public all(bool $ignoreErrors = false): Async\Future
    public race(): Async\Future
    public any(): Async\Future
    public awaitCompletion(): void

    /* Cycle de vie */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Etat */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Resultats et erreurs */
    public getResults(): array
    public getErrors(): array
    public suppressErrors(): void

    /* Iteration */
    public getIterator(): Iterator
}
```

## Exemples

### all() -- Chargement parallele de donnees

Le scenario le plus courant -- charger des donnees depuis plusieurs sources simultanement :

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$group->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$group->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$data = $group->all()->await();
// ['user' => ..., 'orders' => [...], 'reviews' => [...]]

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

Les trois requetes s'executent en parallele. Si l'une d'elles lance une exception,
`all()` retourne un `Future` qui se rejette avec `CompositeException`.

### race() -- Requetes hedgees

Le pattern "hedged request" -- envoyer la meme requete a plusieurs replicas
et prendre la premiere reponse. Cela reduit la latence avec des serveurs lents ou surcharges :

```php
$replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];

$group = new Async\TaskGroup();

foreach ($replicas as $host) {
    $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
}

// La premiere reponse est le resultat, les autres taches continuent de s'executer
$product = $group->race()->await();
```

### any() -- Recherche tolerante aux erreurs

Interroger plusieurs fournisseurs, prendre la premiere reponse reussie, en ignorant les erreurs :

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => searchGoogle($query));
$group->spawn(fn() => searchBing($query));
$group->spawn(fn() => searchDuckDuckGo($query));

// any() ignore les fournisseurs qui ont echoue et retourne le premier resultat reussi
$results = $group->any()->await();

// Les erreurs des fournisseurs en echec doivent etre explicitement gerees, sinon le destructeur lancera une exception
$group->suppressErrors();
```

Si tous les fournisseurs ont echoue, `any()` lancera `CompositeException` avec toutes les erreurs.

### Limite de concurrence -- Traitement d'une file d'attente

Traiter 10 000 taches, mais pas plus de 50 simultanement :

```php
$group = new Async\TaskGroup(concurrency: 50);

foreach ($urls as $url) {
    $group->spawn(fn() => httpClient()->get($url)->getBody());
}

$results = $group->all()->await();
```

`TaskGroup` met automatiquement les taches en file d'attente. Une coroutine n'est creee que lorsqu'un
slot libre apparait, economisant la memoire avec de grands volumes de taches.

### Iteration sur les resultats au fur et a mesure de leur completion

Traiter les resultats sans attendre la fin de toutes les taches :

```php
$group = new Async\TaskGroup();

foreach ($imageFiles as $file) {
    $group->spawn(fn() => processImage($file));
}

$group->seal();

foreach ($group as $key => $result) {
    // Les resultats arrivent au fur et a mesure qu'ils sont prets, pas dans l'ordre d'ajout
    saveToStorage($result);
}
```

### Timeout pour un groupe de taches

Limiter le temps d'attente des resultats :

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => slowApi()->fetchReport());
$group->spawn(fn() => anotherApi()->fetchStats());
$group->seal();

try {
    $results = $group->all()->await(Async\timeout(5.0));
} catch (Async\TimeoutException) {
    echo "Impossible d'obtenir les donnees en 5 secondes";
}
```

## Analogues dans d'autres langages

| Capacite                | PHP `TaskGroup`                     | Python `asyncio.TaskGroup`      | Java `StructuredTaskScope`               | Kotlin `coroutineScope`   |
|-------------------------|-------------------------------------|---------------------------------|------------------------------------------|---------------------------|
| Concurrence structuree  | `seal()` + `all()->await()`         | bloc `async with`               | `try-with-resources` + `join()`          | Automatique via scope     |
| Strategies d'attente    | `all()`, `race()`, `any()` -> Future | Uniquement all (via `async with`) | `ShutdownOnSuccess`, `ShutdownOnFailure` | `async`/`await`, `select` |
| Limite de concurrence   | `concurrency: N`                    | Non (necessite `Semaphore`)     | Non                                      | Non (necessite `Semaphore`) |
| Iteration des resultats | `foreach` au fur et a mesure        | Non                              | Non                                      | `Channel`                 |
| Gestion des erreurs     | `CompositeException`, `getErrors()` | `ExceptionGroup`                | `throwIfFailed()`                        | L'exception annule le scope |

PHP `TaskGroup` combine des capacites qui dans d'autres langages sont reparties entre plusieurs primitives :
limitation de la concurrence sans semaphore, strategies d'attente multiples dans un seul objet, et iteration des resultats au fur et a mesure de leur completion.

## Sommaire

- [TaskGroup::__construct](/fr/docs/reference/task-group/construct.html) -- Creer un groupe de taches
- [TaskGroup::spawn](/fr/docs/reference/task-group/spawn.html) -- Ajouter une tache avec une cle auto-incrementee
- [TaskGroup::spawnWithKey](/fr/docs/reference/task-group/spawn-with-key.html) -- Ajouter une tache avec une cle explicite
- [TaskGroup::all](/fr/docs/reference/task-group/all.html) -- Attendre toutes les taches et obtenir les resultats
- [TaskGroup::race](/fr/docs/reference/task-group/race.html) -- Obtenir le resultat de la premiere tache terminee
- [TaskGroup::any](/fr/docs/reference/task-group/any.html) -- Obtenir le resultat de la premiere tache reussie
- [TaskGroup::awaitCompletion](/fr/docs/reference/task-group/await-completion.html) -- Attendre la fin de toutes les taches
- [TaskGroup::seal](/fr/docs/reference/task-group/seal.html) -- Sceller le groupe pour les nouvelles taches
- [TaskGroup::cancel](/fr/docs/reference/task-group/cancel.html) -- Annuler toutes les taches
- [TaskGroup::dispose](/fr/docs/reference/task-group/dispose.html) -- Detruire le scope du groupe
- [TaskGroup::finally](/fr/docs/reference/task-group/finally.html) -- Enregistrer un gestionnaire de fin
- [TaskGroup::isFinished](/fr/docs/reference/task-group/is-finished.html) -- Verifier si toutes les taches sont terminees
- [TaskGroup::isSealed](/fr/docs/reference/task-group/is-sealed.html) -- Verifier si le groupe est scelle
- [TaskGroup::count](/fr/docs/reference/task-group/count.html) -- Obtenir le nombre de taches
- [TaskGroup::getResults](/fr/docs/reference/task-group/get-results.html) -- Obtenir un tableau des resultats reussis
- [TaskGroup::getErrors](/fr/docs/reference/task-group/get-errors.html) -- Obtenir un tableau des erreurs
- [TaskGroup::suppressErrors](/fr/docs/reference/task-group/suppress-errors.html) -- Marquer les erreurs comme gerees
- [TaskGroup::getIterator](/fr/docs/reference/task-group/get-iterator.html) -- Iterer sur les resultats au fur et a mesure de leur completion
