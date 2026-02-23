---
layout: docs
lang: fr
path_key: "/docs/components/task-set.html"
nav_active: docs
permalink: /fr/docs/components/task-set.html
page_title: "Async\\TaskSet"
description: "Async\\TaskSet — un ensemble dynamique de tâches avec nettoyage automatique des résultats après livraison."
---

# La classe Async\TaskSet

(PHP 8.6+, True Async 1.0)

## Introduction

`TaskGroup` est parfait pour les scénarios où l'objectif est d'obtenir les résultats, pas de gérer les tâches elles-mêmes.
Cependant, il existe de nombreuses situations où il faut contrôler le nombre de tâches
tandis que les résultats sont consommés sous forme de flux.

Exemples typiques :

- **Supervisor** : code qui surveille les tâches et réagit à leur achèvement.
- **Pool de coroutines** : un nombre fixe de coroutines traitant des données.

**TaskSet** est conçu pour résoudre ces problèmes. Il supprime automatiquement les tâches terminées
au moment de la livraison du résultat via `joinNext()`, `joinAll()`, `joinAny()` ou `foreach`.

## Différences avec TaskGroup

| Propriété                 | TaskGroup                          | TaskSet                                    |
|---------------------------|------------------------------------|--------------------------------------------|
| Stockage des résultats    | Tous les résultats jusqu'à demande explicite | Supprimés après livraison          |
| Appels répétés            | Idempotent — même résultat         | Chaque appel — élément suivant             |
| `count()`                 | Nombre total de tâches             | Nombre de tâches non livrées               |
| Méthodes d'attente        | `all()`, `race()`, `any()`         | `joinAll()`, `joinNext()`, `joinAny()`     |
| Itération                 | Les entrées persistent             | Les entrées sont supprimées après `foreach`|
| Cas d'utilisation         | Ensemble fixe de tâches            | Flux dynamique de tâches                   |

## Idempotence vs consommation

**La différence conceptuelle clé** entre `TaskSet` et `TaskGroup`.

**TaskGroup est idempotent.** Les appels à `race()`, `any()`, `all()` retournent toujours
le même résultat. L'itération via `foreach` parcourt toujours toutes les tâches.
Les résultats sont stockés dans le groupe et disponibles pour un accès répété :

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => "alpha");
$group->spawn(fn() => "beta");
$group->spawn(fn() => "gamma");
$group->seal();

// race() retourne toujours la même première tâche terminée
$first  = $group->race()->await(); // "alpha"
$same   = $group->race()->await(); // "alpha" — même résultat !

// all() retourne toujours le tableau complet
$all1 = $group->all()->await(); // ["alpha", "beta", "gamma"]
$all2 = $group->all()->await(); // ["alpha", "beta", "gamma"] — même tableau !

// foreach parcourt toujours tous les éléments
foreach ($group as $key => [$result, $error]) { /* 3 itérations */ }
foreach ($group as $key => [$result, $error]) { /* encore 3 itérations */ }

echo $group->count(); // 3 — toujours 3
```

**TaskSet est consommant.** Chaque appel à `joinNext()` / `joinAny()` extrait
l'élément suivant et le supprime de l'ensemble. Un second `foreach` ne trouvera pas
les entrées déjà livrées. Ce comportement est analogue à la lecture depuis une file ou un canal :

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");

// joinNext() retourne le résultat SUIVANT à chaque fois
$first  = $set->joinNext()->await(); // "alpha"
$second = $set->joinNext()->await(); // "beta" — résultat différent !
$third  = $set->joinNext()->await(); // "gamma"

echo $set->count(); // 0 — l'ensemble est vide

// joinAll() après consommation complète — tableau vide
$set->seal();
$rest = $set->joinAll()->await(); // [] — rien à retourner
```

La même logique s'applique à l'itération :

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");
$set->seal();

// Le premier foreach consomme tous les résultats
foreach ($set as $key => [$result, $error]) {
    echo "$result\n"; // "alpha", "beta", "gamma"
}

echo $set->count(); // 0

// Le second foreach — vide, rien à itérer
foreach ($set as $key => [$result, $error]) {
    echo "ceci ne s'exécutera pas\n";
}
```

> **Règle :** si vous devez accéder aux résultats de manière répétée — utilisez `TaskGroup`.
> Si les résultats sont traités une seule fois et doivent libérer la mémoire — utilisez `TaskSet`.

## Sémantique des méthodes join

Contrairement à `TaskGroup`, où `race()` / `any()` / `all()` laissent les entrées dans le groupe,
`TaskSet` utilise des méthodes avec une sémantique **join** — résultat livré, entrée supprimée :

- **`joinNext()`** — analogue à `race()` : résultat de la première tâche terminée (succès ou erreur),
  l'entrée est supprimée de l'ensemble.
- **`joinAny()`** — analogue à `any()` : résultat de la première tâche terminée *avec succès*,
  l'entrée est supprimée de l'ensemble. Les erreurs sont ignorées.
- **`joinAll()`** — analogue à `all()` : tableau de tous les résultats,
  toutes les entrées sont supprimées de l'ensemble.

## Nettoyage automatique

Le nettoyage automatique fonctionne à tous les points de livraison des résultats :

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "a");
$set->spawn(fn() => "b");
echo $set->count(); // 2

$set->joinNext()->await();
echo $set->count(); // 1

$set->joinNext()->await();
echo $set->count(); // 0
```

Lors de l'itération via `foreach`, chaque entrée traitée est supprimée immédiatement :

```php
$set = new Async\TaskSet();

foreach ($urls as $url) {
    $set->spawn(fn() => fetch($url));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    // $set->count() diminue à chaque itération
    process($result);
}
```

## Limite de concurrence

Comme `TaskGroup`, `TaskSet` prend en charge la limitation de la concurrence :

```php
$set = new Async\TaskSet(concurrency: 10);

foreach ($tasks as $task) {
    $set->spawn(fn() => processTask($task));
}
```

Les tâches dépassant la limite sont mises en file d'attente et démarrées lorsqu'un emplacement se libère.

## Synopsis de la classe

```php
final class Async\TaskSet implements Async\Awaitable, Countable, IteratorAggregate {

    /* Méthodes */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Ajout de tâches */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Attente des résultats (avec nettoyage automatique) */
    public joinNext(): Async\Future
    public joinAny(): Async\Future
    public joinAll(bool $ignoreErrors = false): Async\Future

    /* Cycle de vie */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* État */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Attente de l'achèvement */
    public awaitCompletion(): void

    /* Itération (avec nettoyage automatique) */
    public getIterator(): Iterator
}
```

## Exemples

### joinAll() — chargement parallèle avec nettoyage automatique

```php
$set = new Async\TaskSet();

$set->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$set->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$set->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$set->seal();
$data = $set->joinAll()->await();
// $set->count() === 0, toutes les entrées supprimées

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

### joinNext() — traitement des tâches au fur et à mesure

```php
$set = new Async\TaskSet(concurrency: 5);

foreach ($urls as $url) {
    $set->spawn(fn() => httpClient()->get($url)->getBody());
}
$set->seal();

while ($set->count() > 0) {
    $result = $set->joinNext()->await();
    echo "Résultat obtenu, restant : {$set->count()}\n";
}
```

### joinAny() — recherche tolérante aux pannes

```php
$set = new Async\TaskSet();

$set->spawn(fn() => searchProvider1($query));
$set->spawn(fn() => searchProvider2($query));
$set->spawn(fn() => searchProvider3($query));

// Premier résultat réussi, entrée supprimée
$result = $set->joinAny()->await();
echo "Trouvé, tâches actives : {$set->count()}\n";
```

### foreach — traitement en flux

```php
$set = new Async\TaskSet(concurrency: 20);

foreach ($imageFiles as $file) {
    $set->spawn(fn() => processImage($file));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        log("Erreur de traitement $key : {$error->getMessage()}");
        continue;
    }
    saveToStorage($result);
    // Entrée supprimée, mémoire libérée
}
```

### Boucle worker avec ajout dynamique de tâches

```php
$set = new Async\TaskSet(concurrency: 10);

// Une coroutine ajoute des tâches
spawn(function() use ($set, $queue) {
    while ($message = $queue->receive()) {
        $set->spawn(fn() => processMessage($message));
    }
    $set->seal();
});

// Une autre traite les résultats
spawn(function() use ($set) {
    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            log("Erreur : {$error->getMessage()}");
        }
    }
});
```

## Équivalents dans d'autres langages

| Fonctionnalité       | PHP `TaskSet`                     | Python `asyncio`              | Kotlin                    | Go                     |
|----------------------|-----------------------------------|-------------------------------|---------------------------|------------------------|
| Ensemble dynamique   | `spawn()` + `joinNext()`          | `asyncio.as_completed()`      | `Channel` + `select`      | `errgroup` + `chan`    |
| Nettoyage auto       | Automatique                       | Gestion manuelle              | Gestion manuelle          | Gestion manuelle       |
| Limite de concurrence| `concurrency: N`                  | `Semaphore`                   | `Semaphore`               | Canal bufferisé        |
| Itération en flux    | `foreach`                         | `async for` + `as_completed`  | `for` + `Channel`         | `for range` + `chan`   |

## Sommaire

- [TaskSet::__construct](/fr/docs/reference/task-set/construct.html) — Créer un ensemble de tâches
- [TaskSet::spawn](/fr/docs/reference/task-set/spawn.html) — Ajouter une tâche avec une clé auto-incrémentée
- [TaskSet::spawnWithKey](/fr/docs/reference/task-set/spawn-with-key.html) — Ajouter une tâche avec une clé explicite
- [TaskSet::joinNext](/fr/docs/reference/task-set/join-next.html) — Obtenir le résultat de la première tâche terminée
- [TaskSet::joinAny](/fr/docs/reference/task-set/join-any.html) — Obtenir le résultat de la première tâche réussie
- [TaskSet::joinAll](/fr/docs/reference/task-set/join-all.html) — Attendre toutes les tâches et obtenir les résultats
- [TaskSet::seal](/fr/docs/reference/task-set/seal.html) — Sceller l'ensemble pour les nouvelles tâches
- [TaskSet::cancel](/fr/docs/reference/task-set/cancel.html) — Annuler toutes les tâches
- [TaskSet::dispose](/fr/docs/reference/task-set/dispose.html) — Détruire le scope de l'ensemble
- [TaskSet::finally](/fr/docs/reference/task-set/finally.html) — Enregistrer un gestionnaire d'achèvement
- [TaskSet::isFinished](/fr/docs/reference/task-set/is-finished.html) — Vérifier si toutes les tâches sont terminées
- [TaskSet::isSealed](/fr/docs/reference/task-set/is-sealed.html) — Vérifier si l'ensemble est scellé
- [TaskSet::count](/fr/docs/reference/task-set/count.html) — Obtenir le nombre de tâches non livrées
- [TaskSet::awaitCompletion](/fr/docs/reference/task-set/await-completion.html) — Attendre l'achèvement de toutes les tâches
- [TaskSet::getIterator](/fr/docs/reference/task-set/get-iterator.html) — Itérer sur les résultats avec nettoyage automatique
