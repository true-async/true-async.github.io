---
layout: docs
lang: fr
path_key: "/docs/components/scope.html"
nav_active: docs
permalink: /fr/docs/components/scope.html
page_title: "Scope"
description: "Scope dans TrueAsync -- gestion du cycle de vie des coroutines, hierarchie, annulation de groupe, gestion des erreurs et concurrence structuree."
---

# Scope : gestion du cycle de vie des coroutines

## Le probleme : controle explicite des ressources, coroutines oubliees

```php
function processUser($userId) {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    return "OK";
}

processUser(123);
// La fonction a retourne, mais trois coroutines tournent encore !
// Qui les surveille ? Quand vont-elles terminer ?
// Qui va gerer les exceptions si elles surviennent ?
```

L'un des problemes courants en programmation asynchrone est que les coroutines sont accidentellement "oubliees" par le developpeur.
Elles sont lancees, effectuent un travail, mais personne ne surveille leur cycle de vie.
Cela peut entrainer des fuites de ressources, des operations incompletes et des bugs difficiles a trouver.
Pour les applications `stateful`, ce probleme est significatif.

## La solution : Scope

![Concept de Scope](../../../assets/docs/scope_concept.jpg)

**Scope** -- un espace logique pour l'execution des coroutines, comparable a un bac a sable.

Les regles suivantes garantissent que les coroutines sont sous controle :
* Le code sait toujours dans quel `Scope` il s'execute
* La fonction `spawn()` cree une coroutine dans le `Scope` courant
* Un `Scope` connait toutes les coroutines qui lui appartiennent

```php
function processUser($userId):string {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    // Attendre que toutes les coroutines du scope terminent
    $scope->awaitCompletion(new Async\Timeout(1000));

    return "OK";
}

$scope = new Async\Scope();
$scope->spawn(processUser(...), 123);
$scope->awaitCompletion(new Async\Timeout(5000));

// Maintenant la fonction ne retournera que lorsque TOUTES les coroutines auront termine
```

## Liaison a un objet

`Scope` est pratique a lier a un objet pour exprimer explicitement la propriete d'un groupe de coroutines.
Une telle semantique exprime directement l'intention du programmeur.

```php
class UserService
{
    // Un seul objet unique possedera un Scope unique
    // Les coroutines vivent aussi longtemps que l'objet UserService
    private Scope $scope;

    public function __construct() {
        // Creer un dome pour toutes les coroutines du service
        $this->scope = new Async\Scope();
    }

    public function sendNotification($userId) {
        // Lancer une coroutine a l'interieur de notre dome
        $this->scope->spawn(function() use ($userId) {
            // Cette coroutine est liee a UserService
            sendEmail($userId);
        });
    }

    public function __destruct() {
        // Quand l'objet est supprime, les ressources sont nettoyees de maniere garantie
        // Toutes les coroutines a l'interieur sont automatiquement annulees
        $this->scope->dispose();
    }
}

$service = new UserService();
$service->sendNotification(123);
$service->sendNotification(456);

// Supprimer le service - toutes ses coroutines sont automatiquement annulees
unset($service);
```

## Hierarchie des Scopes

Un scope peut contenir d'autres scopes. Lorsqu'un scope parent est annule,
tous les scopes enfants et leurs coroutines sont egalement annules.

Cette approche est appelee **concurrence structuree**.

```php
$mainScope = new Async\Scope();

$mainScope->spawn(function() {
    echo "Tache principale\n";

    // Creer un scope enfant
    $childScope = Async\Scope::inherit();

    $childScope->spawn(function() {
        echo "Sous-tache 1\n";
    });

    $childScope->spawn(function() {
        echo "Sous-tache 2\n";
    });

    // Attendre la fin des sous-taches
    $childScope->awaitCompletion();

    echo "Toutes les sous-taches terminees\n";
});

$mainScope->awaitCompletion();
```

Si vous annulez `$mainScope`, tous les scopes enfants seront egalement annules. Toute la hierarchie.

## Annuler toutes les coroutines d'un Scope

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        while (true) {
            echo "En cours de travail...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "J'ai ete annule !\n";
    }
});

$scope->spawn(function() {
    try {
        while (true) {
            echo "Travaille aussi...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "Moi aussi !\n";
    }
});

// Fonctionne pendant 3 secondes
Async\sleep(3000);

// Annuler TOUTES les coroutines du scope
$scope->cancel();

// Les deux coroutines recevront AsyncCancellation
```

## Gestion des erreurs dans un Scope

Quand une coroutine dans un scope echoue avec une erreur, le scope peut l'intercepter :

```php
$scope = new Async\Scope();

// Configurer un gestionnaire d'erreurs
$scope->setExceptionHandler(function(Throwable $e) {
    echo "Erreur dans le scope : " . $e->getMessage() . "\n";
    // Peut etre journalise, envoye a Sentry, etc.
});

$scope->spawn(function() {
    throw new Exception("Quelque chose s'est casse !");
});

$scope->spawn(function() {
    echo "Je fonctionne bien\n";
});

$scope->awaitCompletion();

// Sortie :
// Erreur dans le scope : Quelque chose s'est casse !
// Je fonctionne bien
```

## Finally : nettoyage garanti

Meme si un scope est annule, les blocs finally seront executes :

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        echo "Debut du travail\n";
        Async\sleep(10000); // Operation longue
        echo "Termine\n"; // Ne s'executera pas
    } finally {
        // Ceci est GARANTI de s'executer
        echo "Nettoyage des ressources\n";
        closeConnection();
    }
});

Async\sleep(1000);
$scope->cancel(); // Annuler apres une seconde

// Sortie :
// Debut du travail
// Nettoyage des ressources
```

## TaskGroup : Scope avec resultats

`TaskGroup` -- un scope specialise pour l'execution parallele de taches
avec agregation des resultats. Il supporte les limites de concurrence,
les taches nommees et trois strategies d'attente :

```php
$group = new Async\TaskGroup(concurrency: 5);

$group->spawn(fn() => fetchUser(1));
$group->spawn(fn() => fetchUser(2));
$group->spawn(fn() => fetchUser(3));

// Obtenir tous les resultats (attend la fin de toutes les taches)
$results = await($group->all());

// Ou obtenir le premier resultat termine
$first = await($group->race());

// Ou le premier reussi (en ignorant les erreurs)
$any = await($group->any());
```

Les taches peuvent etre ajoutees avec des cles et iterees a mesure qu'elles se terminent :

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user', fn() => fetchUser(1));
$group->spawnWithKey('orders', fn() => fetchOrders(1));

// Iterer sur les resultats au fur et a mesure qu'ils sont prets
foreach ($group as $key => [$result, $error]) {
    if ($error) {
        echo "Tache $key echouee : {$error->getMessage()}\n";
    } else {
        echo "Tache $key : $result\n";
    }
}
```

## Scope global : il y a toujours un parent

Si vous ne specifiez pas de scope explicitement, la coroutine est creee dans le **scope global** :

```php
// Sans specifier de scope
spawn(function() {
    echo "Je suis dans le scope global\n";
});

// Equivalent a :
Async\Scope::global()->spawn(function() {
    echo "Je suis dans le scope global\n";
});
```

Le scope global vit pendant toute la requete. Quand PHP se termine, toutes les coroutines du scope global sont annulees gracieusement.

## Exemple concret : client HTTP

```php
class HttpClient {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function get(string $url): Async\Awaitable {
        return $this->scope->spawn(function() use ($url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            try {
                return curl_exec($ch);
            } finally {
                curl_close($ch);
            }
        });
    }

    public function cancelAll(): void {
        // Annuler toutes les requetes actives
        $this->scope->cancel();
    }

    public function __destruct() {
        // Quand le client est detruit, toutes les requetes sont automatiquement annulees
        $this->scope->dispose();
    }
}

$client = new HttpClient();

$req1 = $client->get('https://api1.com/data');
$req2 = $client->get('https://api2.com/data');
$req3 = $client->get('https://api3.com/data');

// Annuler toutes les requetes
$client->cancelAll();

// Ou simplement detruire le client - meme effet
unset($client);
```

## Concurrence structuree

`Scope` implemente le principe de **Concurrence Structuree** --
un ensemble de regles pour la gestion des taches concurrentes, eprouve dans les runtimes de production
de `Kotlin`, `Swift` et `Java`.

### API pour la gestion du cycle de vie

`Scope` offre la possibilite de controler explicitement le cycle de vie d'une hierarchie de coroutines
en utilisant les methodes suivantes :

| Methode                                  | Ce qu'elle fait                                                  |
|------------------------------------------|------------------------------------------------------------------|
| `$scope->spawn(Closure, ...$args)`       | Lance une coroutine a l'interieur du Scope                       |
| `$scope->awaitCompletion($cancellation)` | Attend la fin de toutes les coroutines du Scope                  |
| `$scope->cancel()`                       | Envoie un signal d'annulation a toutes les coroutines            |
| `$scope->dispose()`                      | Ferme le Scope et annule de force toutes les coroutines          |
| `$scope->disposeSafely()`               | Ferme le Scope ; les coroutines ne sont pas annulees mais marquees zombie |
| `$scope->awaitAfterCancellation()`       | Attend la fin de toutes les coroutines, y compris les zombies    |
| `$scope->disposeAfterTimeout(int $ms)`   | Annule les coroutines apres un timeout                           |

Ces methodes permettent d'implementer trois patterns cles :

**1. Le parent attend toutes les taches enfants**

```php
$scope = new Async\Scope();
$scope->spawn(function() { /* tache 1 */ });
$scope->spawn(function() { /* tache 2 */ });

// Le controle ne sera rendu que lorsque les deux taches seront terminees
$scope->awaitCompletion();
```

En Kotlin, la meme chose est faite avec `coroutineScope { }`,
en Swift -- avec `withTaskGroup { }`.

**2. Le parent annule toutes les taches enfants**

```php
$scope->cancel();
// Toutes les coroutines dans $scope recevront un signal d'annulation.
// Les Scopes enfants seront egalement annules -- recursivement, a toute profondeur.
```

**3. Le parent ferme le Scope et libere les ressources**

`dispose()` ferme le Scope et annule de force toutes ses coroutines :

```php
$scope->dispose();
// Le Scope est ferme. Toutes les coroutines sont annulees.
// De nouvelles coroutines ne peuvent pas etre ajoutees a ce Scope.
```

Si vous devez fermer le Scope mais permettre aux coroutines courantes de **terminer leur travail**,
utilisez `disposeSafely()` -- les coroutines sont marquees comme zombie
(non annulees, elles continuent de s'executer, mais le Scope est considere comme termine pour les taches actives) :

```php
$scope->disposeSafely();
// Le Scope est ferme. Les coroutines continuent de travailler comme zombies.
// Le Scope les suit mais ne les compte pas comme actives.
```

### Gestion des erreurs : deux strategies

Une exception non geree dans une coroutine n'est pas perdue -- elle remonte au Scope parent.
Differents runtimes proposent differentes strategies :

| Strategie                                                        | Kotlin            | Swift                   | TrueAsync                          |
|------------------------------------------------------------------|-------------------|-------------------------|------------------------------------|
| **Echouer ensemble** : l'erreur d'un enfant annule tous les autres | `coroutineScope`  | `withThrowingTaskGroup` | `Scope` (par defaut)               |
| **Enfants independants** : l'erreur d'un enfant n'affecte pas les autres | `supervisorScope` | `Task` separe          | `$scope->setExceptionHandler(...)` |

La possibilite de choisir une strategie est la difference cle avec le "fire and forget".

### Heritage de contexte

Les taches enfants recoivent automatiquement le contexte du parent :
priorite, delais, metadonnees -- sans passer explicitement de parametres.

En Kotlin, les coroutines enfants heritent du `CoroutineContext` parent (dispatcher, nom, `Job`).
En Swift, les instances enfants de `Task` heritent de la priorite et des valeurs task-local.

### Ou cela fonctionne deja

| Langage    | API                                                             | En production depuis |
|------------|-----------------------------------------------------------------|----------------------|
| **Kotlin** | `coroutineScope`, `supervisorScope`                             | 2018                 |
| **Swift**  | `TaskGroup`, `withThrowingTaskGroup`                            | 2021                 |
| **Java**   | `StructuredTaskScope` ([JEP 453](https://openjdk.org/jeps/453)) | 2023 (preview)       |

TrueAsync apporte cette approche a PHP via `Async\Scope`.

## Et ensuite ?

- [Coroutines](/fr/docs/components/coroutines.html) -- comment fonctionnent les coroutines
- [Annulation](/fr/docs/components/cancellation.html) -- patterns d'annulation
- [Coroutines zombie](/fr/docs/components/zombie-coroutines.html) -- tolerance pour le code tiers
