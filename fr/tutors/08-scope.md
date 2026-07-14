---
layout: tutorial
lang: fr
path_key: "/tutors/08-scope.html"
nav_active: docs
permalink: /fr/tutors/08-scope.html
page_title: "Scope"
description: "Scope : qui possède les coroutines, attend leur fin et annule tout le groupe."
---

# Scope

Dans le chapitre précédent, nous avons lancé dix workers et fermé le canal. Le fichier
est lu, `close()` a été appelé, et le flux principal est passé à autre chose. Mais attention :
les workers travaillent encore sur le tampon. La fonction d'import a
déjà rendu le contrôle, et le travail n'est pas terminé. Si le script PHP devait
se terminer maintenant, certaines adresses resteraient non vérifiées.

Et une deuxième inquiétude venue de ce même chapitre : que se passe-t-il si `checkAddress` à l'intérieur d'un
worker lance une exception ? Grâce au chapitre sur les exceptions, nous savons qu'elle sera
stockée dans le handle de la coroutine, en attente d'un `await`. Mais personne n'allait
faire `await` sur les workers. L'erreur ferait surface tout à la fin, quand
il est trop tard pour corriger quoi que ce soit.

Les deux problèmes peuvent se résoudre à la main : rassembler les coroutines dans un tableau et
faire `await` sur chacune.

```php
$workers = [];

for ($i = 0; $i < 10; $i++) {
    $workers[] = spawn(worker(...), $queue);
}

// ... lecture du fichier ...

foreach ($workers as $worker) {
    await($worker);
}
```

Ça marche. Mais c'est de la comptabilité : vous devez penser à mettre en place le tableau, le
trimballer à travers tout le chemin de code, et l'itérer à la fin. Et si une
coroutine est lancée quelque part au fond d'une fonction appelée, elle n'arrive même jamais
dans ce tableau. Ce que nous voulons, c'est que les coroutines sachent d'elles-mêmes
à qui elles appartiennent.

C'est à cela que sert `Scope`.

## Un bac à sable pour les coroutines

`Scope` est un espace dans lequel vivent les coroutines. Il connaît chaque coroutine
lancée en son sein et peut les traiter comme un groupe :

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;

$queue = new Channel(100);
$workers = new Scope();

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue) {
        foreach ($queue as $address) {
                checkAddress($address);
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
$workers->awaitCompletion(timeout(60000));

echo "Import finished, all addresses checked\n";
```

La différence avec le chapitre précédent tient en deux lignes : `$workers->spawn()`
au lieu de `spawn()`, et `awaitCompletion()` à la fin. La méthode `awaitCompletion`
attend que chaque coroutine du scope se termine, quel que soit leur nombre.
Pas de tableau, pas de comptabilité : le scope tient les comptes de lui-même.

Le jeton d'annulation n'est pas ici optionnel, c'est un argument obligatoire : un scope
refuse délibérément de vous laisser attendre un groupe sans borne. Le familier
`timeout` s'y prête bien, et si l'import ne se termine pas dans la minute, l'
attente est interrompue par une `OperationCanceledException`, et c'est à vous
de décider : attendre un peu plus longtemps, ou annuler le groupe.

## Les erreurs ne se perdent plus

Revenons au worker qui a planté. Une coroutine à l'intérieur d'un scope ne peut pas mourir
silencieusement : une exception non gérée remonte jusqu'au scope parent. Par défaut,
un scope réagit strictement : une erreur dans une coroutine annule toutes les autres, et
l'exception est délivrée à celui qui attend dans `awaitCompletion`.

```php
try {
    $workers->awaitCompletion(timeout(60000));
} catch (RemoteApiException $e) {
    echo "Import aborted: {$e->getMessage()}\n";
}
```

Cette stratégie s'appelle fail-together : le groupe se termine soit en entier,
soit s'arrête en entier. Pour l'import, c'est raisonnable : si `GeoDirectory` tombe
en panne, il n'y a aucun intérêt à le bombarder avec les neuf workers restants.

Mais la rigueur n'est pas toujours ce que vous voulez. Une mauvaise adresse dans le fichier n'est pas
une raison d'abandonner les quatre-vingt-dix-neuf mille autres. Dans ce cas, vous attribuez
au scope un gestionnaire d'erreurs, et les coroutines deviennent indépendantes : celle qui a
échoué est consignée, les autres continuent de travailler :

```php
$workers->setExceptionHandler(function ($scope, $coroutine, Throwable $e) {
    error_log("Address not checked: {$e->getMessage()}");
});
```

Outre l'exception elle-même, le gestionnaire reçoit le scope et la coroutine
qui a échoué : pratique pour déterminer exactement qui est mort, ou pour relancer le travail.

Le choix de la stratégie vous revient, et c'est là la principale différence avec un
simple `spawn` : là, la seule stratégie est « lancer et oublier ».

## Annuler tout le groupe

Dans le chapitre sur l'annulation, nous avons arrêté une seule coroutine avec `cancel()`.
Un scope fait de même pour tout un groupe d'un coup :

```php
$workers->cancel();
```

Chaque coroutine à l'intérieur reçoit la familière `AsyncCancellation` à son propre
point d'attente : certaines dans `recv`, d'autres dans `delay`. Le mécanisme est le même,
coopératif, sauf que le signal est envoyé à tout le monde d'un coup.

Un scope peut contenir des scopes enfants, et l'annulation descend la hiérarchie
de manière récursive : annulez le parent, et toute la branche est annulée. Les coroutines
cessent d'être un tas épars de tâches indépendantes et forment un arbre, où chacune
a une place et un propriétaire. Cette approche s'appelle la concurrence structurée,
et elle a déjà fait ses preuves en Kotlin, Swift et Java. TrueAsync l'apporte
à PHP.

## Un scope appartient à un objet

L'usage le plus élégant d'un scope : confier sa propriété à un objet.

```php
use Async\Scope;

final class ImportService
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function import(string $path): void
    {
        $this->scope->spawn(/* workers et lecture du fichier */);
        $this->scope->spawn(/* la coroutine de progression du premier chapitre */);
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}
```

La durée de vie des coroutines correspond maintenant à la durée de vie du service. Tant
que l'objet existe, ses coroutines continuent de travailler. Détruisez l'objet,
et `dispose()` annule tout ce qu'il a réussi à lancer.

Vous souvenez-vous de `$progress->cancel()` du premier chapitre ? Nous saisissions manuellement le
moment où la coroutine de progression devenait inutile. Avec un scope, cette
question disparaît tout simplement : la progression est nécessaire aussi longtemps que l'import s'exécute,
et il s'exécute exactement aussi longtemps que vit `ImportService`. La propriété est
exprimée directement dans le code, et il ne reste tout simplement plus nulle part où oublier une
coroutine.

## Tout l'import, de bout en bout

Rassemblons tout ce que nous avons accumulé au fil de huit chapitres en une seule
classe fonctionnelle : les coroutines et la progression du premier chapitre, le
canal sensible au backpressure du septième, le scope de celui-ci.

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;
use function Async\delay;
use function Async\timeout;

final class ImportService
{
    private Scope $scope;

    public function __construct(private readonly int $workers = 10)
    {
        $this->scope = new Scope();
    }

    public function import(string $path, int $total): void
    {
        $queue = new Channel(100);
        $counter = 0;

        // Workers : puisent les adresses dans le canal, pas plus de $this->workers de manière concurrente
        for ($i = 0; $i < $this->workers; $i++) {
            $this->scope->spawn(function () use ($queue, &$counter) {
                foreach ($queue as $address) {
                        checkAddress($address);
                        $counter++;
                }
            });
        }

        // Progression : affiche l'état une fois par seconde jusqu'à la fin de l'import
        $this->scope->spawn(function () use (&$counter, $total) {
            while ($counter < $total) {
                printProgress($counter, $total);
                delay(1000);
            }
            printProgress($total, $total);
        });

        // Producteur : lit le fichier, le backpressure du canal protège la mémoire
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $addressIndex = array_search('address', $header);

        while (($row = fgetcsv($handle)) !== false) {
            $queue->send($row[$addressIndex]);
        }

        fclose($handle);
        $queue->close();

        // Attendre tout : à la fois les workers et la coroutine de progression
        $this->scope->awaitCompletion(timeout(600000));
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}

$importer = new ImportService();
$importer->import('users.csv', 100_000);
```

Deux détails méritent un examen de plus près. La progression n'est plus une boucle
infinie : la condition `while ($counter < $total)` y met fin de manière coopérative une fois que la
dernière adresse a été traitée, si bien que `awaitCompletion` attend tout
sans un seul `cancel`. Et `dispose()` dans le destructeur ne joue aucun rôle dans le
fonctionnement normal : c'est un filet de sécurité pour le cas où l'import lance une
exception ou l'objet est jeté en cours de route.

Voilà l'essentiel du scope. `spawn` répond seulement à la question « comment
démarrer un travail concurrent ». Scope gère les questions qui viennent juste après :
qui attend ce travail, qui apprend l'existence d'une erreur, et qui l'arrête.
Sans scope, une coroutine est livrée à elle-même ; à l'intérieur d'un scope, elle
a un propriétaire et une place dans la structure du programme.

Jusqu'à présent, les workers n'ont fait que lire depuis le monde extérieur. Mais les adresses
vérifiées doivent encore être enregistrées dans une base de données. Peut-on simplement confier à dix
coroutines un unique objet `PDO` ? Une bonne question pour ouvrir le prochain chapitre.
