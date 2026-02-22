---
layout: docs
lang: fr
path_key: "/docs/components/zombie-coroutines.html"
nav_active: docs
permalink: /fr/docs/components/zombie-coroutines.html
page_title: "Coroutines zombie"
description: "Les coroutines zombie dans TrueAsync -- tolerance pour le code tiers, disposeSafely(), disposeAfterTimeout(), gestion des taches non annulables."
---

# Coroutines zombie : tolerance aux pannes

## Le probleme : du code qui ne peut pas etre annule

L'annulation d'une coroutine est un processus cooperatif. La coroutine recoit une exception `Cancellation`
a un point de suspension et doit se terminer gracieusement. Mais que se passe-t-il si quelqu'un a fait une erreur et a cree une coroutine dans le mauvais `Scope` ?
Bien que `TrueAsync` suive le principe d'`annulation par conception`, des situations peuvent survenir ou quelqu'un a ecrit du code
dont l'annulation pourrait mener a un resultat desagreable.
Par exemple, quelqu'un a cree une tache en arriere-plan pour envoyer un `email`. La coroutine a ete annulee, l'`email` n'a jamais ete envoye.

Une haute tolerance aux pannes permet des economies significatives en temps de developpement
et minimise les consequences des erreurs, si les programmeurs utilisent l'analyse des logs pour ameliorer la qualite de l'application.

## La solution : les coroutines zombie

Pour attenuer de telles situations, `TrueAsync` fournit une approche speciale :
le traitement tolerant des coroutines "bloquees" -- les coroutines zombie.

Une coroutine `zombie` est une coroutine qui :
* Continue de s'executer normalement
* Reste liee a son Scope
* N'est pas consideree comme active -- le Scope peut formellement se terminer sans l'attendre
* Ne bloque pas `awaitCompletion()`, mais bloque `awaitAfterCancellation()`

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    thirdPartySync(); // Code tiers -- on ne sait pas comment il reagit a l'annulation
});

$scope->spawn(function() {
    return myOwnCode(); // Notre code -- gere correctement l'annulation
});

// disposeSafely() N'annule PAS les coroutines, mais les marque comme zombie
$scope->disposeSafely();
// Le Scope est ferme pour les nouvelles coroutines.
// Les coroutines existantes continuent de travailler comme zombies.
```

## Trois strategies de terminaison de Scope

`TrueAsync` fournit trois facons de fermer un `Scope`, concues pour differents niveaux de confiance dans le code :

### `dispose()` -- Annulation forcee

Toutes les coroutines recoivent `Cancellation`. Le Scope se ferme immediatement.
A utiliser quand vous controlez tout le code a l'interieur du Scope.

```php
$scope->dispose();
// Toutes les coroutines sont annulees. Le Scope est ferme.
```

### `disposeSafely()` -- Pas d'annulation, les coroutines deviennent des zombies

Les coroutines **ne recoivent pas** `Cancellation`. Elles sont marquees comme `zombie` et continuent de s'executer.
Le `Scope` est considere comme ferme -- de nouvelles coroutines ne peuvent pas etre creees.

A utiliser quand le `Scope` contient du code "tiers" et que vous n'etes pas confiant sur la correction de l'annulation.

```php
$scope->disposeSafely();
// Les coroutines continuent de travailler comme zombies.
// Le Scope est ferme pour les nouvelles taches.
```

### `disposeAfterTimeout(int $timeout)` -- Annulation avec timeout

Une combinaison des deux approches : d'abord, on donne du temps aux coroutines pour terminer,
puis le `Scope` est annule de force.

```php
$scope->disposeAfterTimeout(5000);
// Apres 5 secondes, le Scope enverra Cancellation a toutes les coroutines restantes.
```

## Attente des coroutines zombie

`awaitCompletion()` n'attend que les coroutines **actives**. Une fois que toutes les coroutines deviennent des zombies,
`awaitCompletion()` considere le Scope comme termine et rend le controle.

Mais parfois, vous devez attendre la fin de **toutes** les coroutines, y compris les zombies.
Pour cela, `awaitAfterCancellation()` existe :

```php
$scope = new Async\Scope();
$scope->spawn(fn() => longRunningTask());
$scope->spawn(fn() => anotherTask());

// Annuler -- les coroutines qui ne peuvent pas etre annulees deviendront des zombies
$scope->cancel();

// awaitCompletion() retournera immediatement s'il ne reste que des zombies
$scope->awaitCompletion($cancellation);

// awaitAfterCancellation() attendra TOUTES, y compris les zombies
$scope->awaitAfterCancellation(function (\Throwable $error, Async\Scope $scope) {
    // Gestionnaire d'erreurs pour les coroutines zombie
    echo "Erreur zombie : " . $error->getMessage() . "\n";
});
```

| Methode                      | Attend les actives | Attend les zombies | Necessite cancel() |
|------------------------------|:------------------:|:------------------:|:------------------:|
| `awaitCompletion()`          |        Oui         |        Non         |        Non         |
| `awaitAfterCancellation()`   |        Oui         |        Oui         |        Oui         |

`awaitAfterCancellation()` ne peut etre appele qu'apres `cancel()` -- sinon une erreur se produira.
C'est logique : les coroutines zombie apparaissent precisement suite a une annulation avec le drapeau `DISPOSE_SAFELY`.

## Comment les zombies fonctionnent en interne

Lorsqu'une coroutine est marquee comme `zombie`, les evenements suivants se produisent :

1. La coroutine recoit le drapeau `ZOMBIE`
2. Le compteur de coroutines actives du `Scope` diminue de 1
3. Le compteur de coroutines `zombie` augmente de 1
4. Le `Scope` verifie s'il reste des coroutines actives et peut notifier les observateurs de la completion

```
Scope
+-- active_coroutines_count: 0    <-- diminue
+-- zombie_coroutines_count: 2    <-- augmente
+-- coroutine A (zombie)          <-- continue de s'executer
+-- coroutine B (zombie)          <-- continue de s'executer
```

Une coroutine `zombie` n'est **pas detachee** du `Scope`. Elle reste dans sa liste de coroutines,
mais n'est pas comptee comme active. Lorsqu'une coroutine `zombie` se termine finalement,
elle est supprimee du `Scope`, et le `Scope` verifie s'il peut completement liberer les ressources.

## Comment l'ordonnanceur gere les zombies

L'`ordonnanceur` maintient deux compteurs de coroutines independants :

1. **Compteur global de coroutines actives** (`active_coroutine_count`) -- utilise pour des verifications rapides
   sur la necessite de planifier quelque chose
2. **Registre de coroutines** (table de hachage `coroutines`) -- contient **toutes** les coroutines encore en cours d'execution,
   y compris les `zombies`

Lorsqu'une coroutine est marquee comme `zombie` :
* Le compteur global de coroutines actives **diminue** -- l'ordonnanceur considere qu'il y a moins de travail actif
* La coroutine **reste** dans le registre -- l'`ordonnanceur` continue de gerer son execution

L'application continue de s'executer tant que le compteur de coroutines actives est superieur a zero. Une consequence importante en decoule :
les coroutines `zombie` n'empechent pas l'arret de l'application, car elles ne sont pas considerees comme actives.
S'il n'y a plus de coroutines actives, l'application se termine et meme les coroutines `zombie` seront annulees.

## Heritage du drapeau Safely

Par defaut, un `Scope` est cree avec le drapeau `DISPOSE_SAFELY`.
Cela signifie : si le `Scope` est detruit (par ex., dans le destructeur d'un objet),
les coroutines deviennent des `zombies` plutot que d'etre annulees.

Un `Scope` enfant herite de ce drapeau de son parent :

```php
$parent = new Async\Scope();
// le parent a le drapeau DISPOSE_SAFELY par defaut

$child = Async\Scope::inherit($parent);
// l'enfant a aussi le drapeau DISPOSE_SAFELY
```

Si vous voulez une annulation forcee a la destruction, utilisez `asNotSafely()` :

```php
$scope = (new Async\Scope())->asNotSafely();
// Maintenant, quand l'objet Scope est detruit,
// les coroutines seront annulees de force plutot que marquees comme zombies
```

## Exemple : serveur HTTP avec middleware

```php
class RequestHandler
{
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function handle(Request $request): Response {
        // Lancer le middleware -- il pourrait s'agir de code tiers
        $this->scope->spawn(function() use ($request) {
            $this->runMiddleware($request);
        });

        // Traitement principal -- notre code
        $response = $this->scope->spawn(function() use ($request) {
            return $this->processRequest($request);
        });

        return await($response);
    }

    public function __destruct() {
        // A la destruction : le middleware peut ne pas etre pret pour l'annulation,
        // donc on utilise disposeSafely() (comportement par defaut).
        // Les coroutines zombie termineront d'elles-memes.
        $this->scope->disposeSafely();
    }
}
```

## Exemple : gestionnaire avec limite de temps

```php
$scope = new Async\Scope();

// Lancer des taches avec du code tiers
$scope->spawn(fn() => thirdPartyAnalytics($data));
$scope->spawn(fn() => thirdPartyNotification($userId));

// Donner 10 secondes pour terminer, puis annulation forcee
$scope->disposeAfterTimeout(10000);
```

## Quand les zombies deviennent un probleme

Les coroutines `zombie` sont un compromis. Elles resolvent le probleme du code tiers
mais peuvent mener a des fuites de ressources.

C'est pourquoi `disposeAfterTimeout()` ou un `Scope` avec annulation explicite des coroutines est le meilleur choix pour la production :
cela donne au code tiers le temps de terminer mais garantit l'annulation en cas de blocage.

## Resume

| Methode                     | Annule les coroutines | Les coroutines terminent | Scope ferme |
|---------------------------|:---------------------:|:------------------------:|:-----------:|
| `dispose()`               |          Oui          |           Non            |     Oui     |
| `disposeSafely()`         |          Non          |   Oui (comme zombies)    |     Oui     |
| `disposeAfterTimeout(ms)` |   Apres le timeout    |   Jusqu'au timeout       |     Oui     |

## Journalisation des coroutines zombie

Dans les futures versions, `TrueAsync` prevoit de fournir un mecanisme de journalisation des coroutines zombie, qui permettra
aux developpeurs de resoudre les problemes lies aux taches bloquees.

## Et ensuite ?

- [Scope](/fr/docs/components/scope.html) -- gestion de groupes de coroutines
- [Annulation](/fr/docs/components/cancellation.html) -- patterns d'annulation
- [Coroutines](/fr/docs/components/coroutines.html) -- cycle de vie des coroutines
