---
layout: tutorial
lang: fr
path_key: "/tutors/06-future.html"
nav_active: docs
permalink: /fr/tutors/06-future.html
page_title: "Future"
description: "Future et FutureState : la promesse d'un résultat qui n'est pas lié à une coroutine."
---

# Future

Dans les chapitres précédents, nous avons constaté qu'une coroutine se comporte comme la promesse d'un résultat :
`await` peut être appelé autant de fois que vous le souhaitez, et il renvoie toujours la même chose.
Mais une coroutine a une contrainte stricte : le résultat est toujours produit par la fonction
que `spawn` a démarrée. Un appel, une fonction, un résultat.

Mais que faire si le résultat ne provient pas d'une fonction du tout ?

Revenons à `ProfileService`. Un utilisateur modifie son adresse de livraison, et avant
de l'enregistrer, l'adresse doit être vérifiée par rapport à un annuaire des régions desservies
par le service `GeoDirectory` :

```php
function loadRegions(): array {
    $response = file_get_contents('https://geodirectory.example.com/api/regions');
    return json_decode($response, true);
}
```

L'annuaire est volumineux, lent à charger, et identique pour tout le monde. En même temps,
chaque requête de mise à jour de profil en a besoin, et les requêtes sont traitées de manière concurrente.
Appeler `spawn(loadRegions(...))` dans chacune d'elles revient à bombarder `GeoDirectory` avec
des requêtes identiques pour obtenir une réponse identique. Du gaspillage.

Ce que nous voudrions, c'est que la première requête charge réellement l'annuaire, tandis que toutes
les autres attendent son résultat. Pour cela, il nous faut un endroit où un morceau de code
dépose le résultat et un autre le récupère.

Cet endroit peut être un `Future`.

## FutureState et Future

`Future` est une promesse et un conteneur pour un résultat. Il n'est pas lié à une coroutine,
mais il fonctionne avec le `await` que nous connaissons déjà.

`Future` se compose de deux objets :

```php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);
```

- **`FutureState`** — écrit le résultat. Il reste avec celui qui produit le résultat.
- **`Future`** — lit le résultat. Il est remis à celui qui attend le résultat.

Le producteur termine l'opération, le consommateur l'attend via le familier `await` :

```php
use function Async\await;

$state->complete(42);

echo await($future); // 42
```

Pourquoi deux objets au lieu d'un ? La séparation protège contre les erreurs.
Celui qui détient un `Future` ne peut physiquement pas terminer l'opération : il n'existe pas de
telle méthode dessus. Seul le propriétaire du `FutureState` est autorisé à écrire le résultat,
et une seule fois :

```php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

Si l'opération échoue, une exception est écrite à la place d'un résultat,
et `await` la lancera pour tous ceux qui attendent :

```php
$state->error(new RemoteApiException('GeoDirectory did not respond'));

await($future); // throws RemoteApiException
```

## Résoudre le problème de l'annuaire

Nous pouvons maintenant construire un chargement d'annuaire que les requêtes concurrentes se partagent :

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

final class RegionsDirectory
{
    private ?Future $future = null;

    public function regions(): Future
    {
        if ($this->future !== null) {
            return $this->future;
        }

        $state = new FutureState();
        $this->future = new Future($state);

        spawn(function () use ($state) {
            try {
                $state->complete(loadRegions());
            } catch (Exception $e) {
                $state->error($e);
            }
        });

        return $this->future;
    }
}
```

Le premier appel à `regions` démarre une coroutine qui effectue le chargement réel.
Chaque appel suivant obtient le même `Future` et attend un unique résultat partagé.
Une fois l'annuaire chargé, `await` commence à le renvoyer instantanément, peu importe
combien de fois on le demande :

```php
$regions = await($directory->regions());

if (profileExists($userId) && isset($regions[$changes['region']])) {
    updateProfile($userId, $changes);
}
```

Quel que soit le nombre de requêtes traitées de manière concurrente, `GeoDirectory` est sollicité exactement une fois,
tandis que `RegionsDirectory` reste un service ordinaire : il peut être branché dans un conteneur DI,
remplacé dans les tests, et tout son état vit dans un unique champ `$future`.
Notez que `await` fonctionne de la même manière avec une coroutine et avec un `Future`,
y compris le timeout du chapitre précédent :

```php
$regions = await($directory->regions(), timeout(2000));
```

## Un résultat que vous avez déjà

Parfois, le résultat est connu à l'avance. Par exemple, l'annuaire des régions
est préchauffé au démarrage du service et se trouve déjà en mémoire. Il n'y a
aucun intérêt à créer un `FutureState` et une coroutine pour une valeur déjà connue,
c'est pourquoi il existe des méthodes de fabrique pour cela :

```php
// le résultat est déjà là
$future = Future::completed($regionsFromWarmup);

// l'erreur est déjà connue
$future = Future::failed(new RemoteApiException('GeoDirectory did not respond'));
```

La méthode `regions` peut renvoyer un tel `Future`, et le consommateur ne remarquera pas
la différence : il appelle toujours `await` et obtient le résultat immédiatement.

## Une technique classique : la mémoïsation

`RegionsDirectory` implémente déjà une technique classique appelée mémoïsation :
calculer le résultat une seule fois et le distribuer à chaque appel répété. La technique
est suffisamment générale pour être enveloppée autour de n'importe quelle fonction avec arguments :

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function memoize(callable $fn): callable
{
    $cache = [];

    return function (mixed ...$args) use ($fn, &$cache): Future {
        $key = serialize($args);

        if (isset($cache[$key])) {
            return $cache[$key];
        }

        $state = new FutureState();
        $cache[$key] = new Future($state);

        spawn(function () use ($state, $fn, $args) {
            try {
                $state->complete($fn(...$args));
            } catch (Throwable $e) {
                $state->error($e);
            }
        });

        return $cache[$key];
    };
}
```

```php
$regionsOf = memoize(loadRegionsOf(...));

$de = await($regionsOf('DE')); // une requête vers GeoDirectory
$fr = await($regionsOf('FR')); // une requête vers GeoDirectory
$de = await($regionsOf('DE')); // instantané, depuis le cache
```

Remarquez une subtilité : le cache contient le `Future` lui-même, pas une simple valeur.
Une mémoïsation naïve dans du code concurrent souffrirait d'une situation de compétition : pendant que le premier
appel attend la réponse de `GeoDirectory`, un deuxième appel vérifie le cache, le voit
vide, et déclenche une requête en double. Il n'y a pas un tel intervalle ici. Le `Future`
atterrit dans le cache immédiatement, avant même que le calcul ne commence, si bien que le deuxième
appel le trouve et se contente d'attendre.

La technique a une limite : la mémoïsation ne fonctionne que pour des données qui ne changent pas
durant toute la vie du processus. Mettre en cache de cette manière une vérification de jeton ou un taux de change
serait une erreur : ils dépendent du temps, et un tel cache a besoin d'une durée de vie au-delà de
laquelle le résultat est récupéré à nouveau. Pour la même raison, les erreurs méritent une réflexion
à part : un `Future` en échec resterait lui aussi dans le cache pour toujours, et il vaut généralement
mieux le supprimer pour que l'appel suivant réessaie.

L'essentiel à retenir de ce chapitre : une coroutine répond à la question
« comment obtenir le résultat », tandis qu'un `Future` promet simplement qu'un résultat
existera. D'où il vient, d'une coroutine, d'un cache, ou d'un autre thread, ne regarde
en rien le consommateur. Le producteur et le consommateur se sont mis d'accord sur un
résultat et ne savent rien d'autre l'un de l'autre.

Mais que faire s'il n'y a pas qu'un seul résultat, mais tout un flux de valeurs qui
doivent voyager de coroutine en coroutine ? Il existe un outil dédié pour cela,
et c'est le sujet du prochain chapitre.
