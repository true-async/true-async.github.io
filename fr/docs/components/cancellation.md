---
layout: docs
lang: fr
path_key: "/docs/components/cancellation.html"
nav_active: docs
permalink: /fr/docs/components/cancellation.html
page_title: "Annulation"
description: "Annulation des coroutines dans TrueAsync -- annulation cooperative, sections critiques avec protect(), annulation en cascade via Scope, timeouts."
---

# Annulation

Un navigateur a envoye une requete, mais l'utilisateur a ferme la page.
Le serveur continue a traiter une requete qui n'est plus necessaire.
Il serait judicieux d'abandonner l'operation pour eviter des couts inutiles.
Ou supposons qu'il y ait un long processus de copie de donnees qui doit etre soudainement annule.
Il existe de nombreux scenarios ou il faut arreter des operations.
Habituellement, ce probleme est resolu avec des variables de drapeau ou des jetons d'annulation, ce qui est assez laborieux. Le code doit savoir
qu'il pourrait etre annule, doit planifier des points de controle d'annulation et gerer correctement ces situations.

## Annulable par conception

La plupart du temps, une application est occupee a lire des donnees
depuis des bases de donnees, des fichiers ou le reseau. Interrompre une lecture est sur.
C'est pourquoi, dans `TrueAsync`, le principe suivant s'applique : **une coroutine peut etre annulee a tout moment depuis un etat d'attente**.
Cette approche reduit la quantite de code, car dans la plupart des cas, le programmeur n'a pas besoin de se preoccuper
de l'annulation.

## Comment fonctionne l'annulation

Une exception speciale -- `Cancellation` -- est utilisee pour annuler une coroutine.
L'exception `Cancellation` ou une exception derivee est lancee a un point de suspension (`suspend()`, `await()`, `delay()`).
L'execution peut egalement etre interrompue pendant les operations d'E/S ou toute autre operation bloquante.

```php
$coroutine = spawn(function() {
    echo "Debut du travail\n";
    suspend(); // Ici la coroutine recevra Cancellation
    echo "Ceci n'arrivera pas\n";
});

$coroutine->cancel();

try {
    await($coroutine);
} catch (\Cancellation $e) {
    echo "Coroutine annulee\n";
    throw $e;
}
```

## L'annulation ne peut pas etre supprimee

`Cancellation` est une exception de niveau de base, au meme rang que `Error` et `Exception`.
La construction `catch (Exception $e)` ne l'interceptera pas.

Intercepter `Cancellation` et continuer le travail est une erreur.
Vous pouvez utiliser `catch Async\AsyncCancellation` pour gerer des situations speciales,
mais vous devez vous assurer de relancer correctement l'exception.
En general, il est recommande d'utiliser `finally` pour le nettoyage garanti des ressources :

```php
spawn(function() {
    $connection = connectToDatabase();

    try {
        processData($connection);
    } finally {
        $connection->close();
    }
});
```

## Trois scenarios d'annulation

Le comportement de `cancel()` depend de l'etat de la coroutine :

**La coroutine n'a pas encore demarre** -- elle ne demarrera jamais.

```php
$coroutine = spawn(function() {
    echo "Ne s'executera pas\n";
});
$coroutine->cancel();
```

**La coroutine est en etat d'attente** -- elle se reveillera avec une exception `Cancellation`.

```php
$coroutine = spawn(function() {
    echo "Travail demarre\n";
    suspend(); // Ici elle recevra Cancellation
    echo "Ne s'executera pas\n";
});

suspend();
$coroutine->cancel();
```

**La coroutine est deja terminee** -- rien ne se passe.

```php
$coroutine = spawn(function() {
    return 42;
});

await($coroutine);
$coroutine->cancel(); // Pas une erreur, mais sans effet
```

## Sections critiques : protect()

Toutes les operations ne peuvent pas etre interrompues en toute securite.
Si une coroutine a debite de l'argent d'un compte mais n'a pas encore credite un autre --
l'annulation a ce moment entrainerait une perte de donnees.

La fonction `protect()` differe l'annulation jusqu'a ce que la section critique soit terminee :

```php
use Async\protect;
use Async\spawn;

$coroutine = spawn(function() {
    protect(function() {
        $db->query("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
        suspend();
        $db->query("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    });

    // L'annulation prendra effet ici -- apres la sortie de protect()
});

suspend();
$coroutine->cancel();
```

A l'interieur de `protect()`, la coroutine est marquee comme protegee.
Si `cancel()` arrive a ce moment, l'annulation est enregistree
mais pas appliquee. Des que `protect()` est termine --
l'annulation differee prend effet immediatement.

## Annulation en cascade via Scope

Lorsqu'un `Scope` est annule, toutes ses coroutines et tous les scopes enfants sont annules.
La cascade va **uniquement de haut en bas** -- l'annulation d'un scope enfant n'affecte pas le parent ou les scopes freres.

### Isolation : l'annulation d'un enfant n'affecte pas les autres

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

// Annuler uniquement child1
$child1->cancel();

$parent->isCancelled(); // false -- le parent n'est pas affecte
$child1->isCancelled(); // true
$child2->isCancelled(); // false -- le scope frere n'est pas affecte
```

### Cascade descendante : l'annulation d'un parent annule tous les descendants

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

$parent->cancel(); // Cascade : annule child1 et child2

$parent->isCancelled(); // true
$child1->isCancelled(); // true
$child2->isCancelled(); // true
```

### Une coroutine peut annuler son propre Scope

Une coroutine peut initier l'annulation du scope dans lequel elle s'execute. Le code avant le point de suspension le plus proche continuera a s'executer :

```php
$scope = new Async\Scope();

$scope->spawn(function() use ($scope) {
    echo "Demarrage\n";
    $scope->cancel();
    echo "Ceci s'executera encore\n";
    suspend();
    echo "Mais pas ceci\n";
});
```

Apres l'annulation, le scope est ferme -- le lancement d'une nouvelle coroutine dans celui-ci n'est plus possible.

## Timeouts

Un cas particulier d'annulation est le timeout. La fonction `timeout()` cree une limite de temps :

```php
$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com/data');
});

try {
    $result = await($coroutine, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "L'API n'a pas repondu dans les 5 secondes\n";
}
```

`TimeoutException` est un sous-type de `Cancellation`,
donc la coroutine se termine selon les memes regles.

## Verification de l'etat

Une coroutine fournit deux methodes pour verifier l'annulation :

- `isCancellationRequested()` -- l'annulation a ete demandee mais pas encore appliquee
- `isCancelled()` -- la coroutine s'est effectivement arretee

```php
$coroutine = spawn(function() {
    suspend();
});

$coroutine->cancel();

$coroutine->isCancellationRequested(); // true
$coroutine->isCancelled();             // false -- pas encore traite

suspend();

$coroutine->isCancelled();             // true
```

## Exemple : worker de file d'attente avec arret gracieux

```php
class QueueWorker {
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
        $this->queue = new Async\Channel();
    }

    public function start(): void {
        $this->scope->spawn(function() {
            while (true) {
                $job = $this->queue->receive();

                try {
                    $job->process();
                } finally {
                    $job->markDone();
                }
            }
        });
    }

    public function stop(): void
    {
        // Toutes les coroutines seront arretees ici
        $this->scope->cancel();
    }
}
```

## Et ensuite ?

- [Scope](/fr/docs/components/scope.html) -- gestion de groupes de coroutines
- [Coroutines](/fr/docs/components/coroutines.html) -- cycle de vie des coroutines
- [Channels](/fr/docs/components/channels.html) -- echange de donnees entre coroutines
