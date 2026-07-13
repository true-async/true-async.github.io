---
layout: tutorial
lang: fr
path_key: "/tutors/11-task-set.html"
nav_active: docs
permalink: /fr/tutors/11-task-set.html
page_title: "TaskSet"
description: "TaskSet : un flux de tâches qui se nettoie tout seul, joinNext/joinAny/joinAll et une boucle de supervision."
---

# TaskSet

Le chapitre précédent a révélé que `TaskGroup` se souvient de tout. Ce n'est pas un accident,
c'est une propriété sur laquelle vous pouvez compter : peu importe combien de fois vous
demandez ses résultats au groupe, vous obtenez la même réponse. Ce comportement s'appelle
l'idempotence, et nous l'avons déjà rencontré : un `await` répété sur une coroutine renvoie le
même résultat à chaque fois.

Mais la mémoire a un prix. Faites passer cent mille tâches à travers un groupe, et les cent mille
résultats restent à l'intérieur, même si chacun n'a jamais été utile qu'une seule fois, au moment
où il est devenu prêt. Pour un pipeline qui tourne pendant des heures, ce n'est pas du stockage,
c'est une fuite.

Ce qu'il faut, c'est un jumeau de `TaskGroup` au tempérament opposé : livrer le résultat et
l'oublier. Il s'appelle `TaskSet`.

## Consommer plutôt que stocker

En apparence tout se ressemble : `spawn`, `close`, une limite de concurrence. La différence
réside dans ce qui arrive à un résultat une fois qu'il a été livré :

```php
use Async\TaskSet;

$set = new TaskSet();

$set->spawn(fn() => 'alpha');
$set->spawn(fn() => 'beta');
$set->spawn(fn() => 'gamma');

echo $set->joinNext()->await(); // alpha
echo $set->joinNext()->await(); // beta, déjà un autre !
echo $set->joinNext()->await(); // gamma

echo $set->count(); // 0, l'ensemble est vide
```

Chaque appel à `joinNext()` renvoie le prochain résultat prêt et retire son entrée de l'ensemble.
Comparez cela au `race()` de `TaskGroup`, qui renvoie toujours le même premier gagnant, peu
importe combien de fois vous l'appelez. `TaskSet` ne se comporte pas comme un stockage mais comme
une file d'attente : lisez-le, et c'est parti. Oui, ce sont les mêmes sémantiques que `recv` du
chapitre sur les canaux, sauf que maintenant la file ne contient pas des valeurs mais des tâches
qui s'achèvent.

Les méthodes d'attente des jumeaux se font écho :

- **`joinNext()`** — comme `race()` : la première à finir, son entrée retirée.
- **`joinAny()`** — comme `any()` : la première réussie, son entrée retirée.
- **`joinAll()`** — comme `all()` : tous les résultats d'un coup, l'ensemble vidé.

Le préfixe `join` laisse deviner la différence : un résultat n'est pas seulement lu, il est retiré.

## Un pipeline sans fuite

Réécrivons l'import de cent mille lignes avec ce que nous savons désormais :

```php
$set = new TaskSet(concurrency: 10);

spawn(function () use ($set, $handle, $addressIndex) {
    while (($row = fgetcsv($handle)) !== false) {
        $set->spawn(fn() => checkAddress($row[$addressIndex]));
    }
    $set->close();
});

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        error_log("Adresse non vérifiée : {$error->getMessage()}");
        continue;
    }
    saveAddress($pdo, $result);
}
```

Une coroutine lit le fichier et lui fournit continuellement des tâches, tandis que le flux
principal traite les résultats à mesure qu'ils deviennent prêts. Chaque entrée traitée est
immédiatement retirée de l'ensemble, si bien que la mémoire ne contient que les tâches en cours :
dix en train de s'exécuter plus la file. Le fichier peut avoir n'importe quelle taille ;
l'utilisation de la mémoire n'en dépend pas.

Remarquez comment des détails familiers se sont rassemblés en une image nouvelle : une limite de
concurrence au lieu d'un pool de workers bricolé à la main, `close()` comme signal signifiant
« plus aucune tâche ne viendra », la paire `[$result, $error]` au lieu d'exceptions
silencieusement avalées, et le `PDO` du chapitre neuf, insensible aux appels concurrents à
`saveAddress`.

## Superviseur

Il existe un second scénario où cette sémantique de consommation est indispensable : du code qui
veille sur des tâches à longue durée de vie et réagit lorsqu'elles se terminent.

```php
$set = new TaskSet();

$set->spawnWithKey('mailer',  runMailer(...));
$set->spawnWithKey('metrics', runMetrics(...));
$set->spawnWithKey('cleaner', runCleaner(...));

foreach ($set as $key => [$result, $error]) {
    error_log("Service $key arrêté" . ($error ? " : {$error->getMessage()}" : ''));

    // relancer le service qui est tombé
    $set->spawnWithKey($key, restartService($key));
}
```

L'ensemble n'est jamais fermé, donc le `foreach` ne se termine jamais, il attend simplement le
prochain événement. Chaque entrée traitée est retirée, le service relancé est réajouté à sa place,
et la boucle vit éternellement. Le superviseur n'a pas besoin d'un historique de chaque achèvement
depuis la nuit des temps ; il a besoin d'exactement ceci : un de ses protégés s'est arrêté, allez
comprendre pourquoi et relancez-le. Vous ne pourriez pas écrire cette boucle avec `TaskGroup` :
son `foreach` recommencerait depuis le premier service arrêté, à chaque fois.

Voilà donc, pour l'essentiel, toute la différence entre les jumeaux : la mémoire. Un groupe stocke
les résultats et répond de façon répétée à n'importe quelle question à leur sujet, ce qui le rend
adapté aux cas où l'ensemble des tâches est fixe et où les résultats comptent dans leur globalité.
Un ensemble livre chaque résultat une seule fois et libère aussitôt la mémoire, c'est pourquoi il
peut gérer un flux infini de tâches. Il existe une règle simple pour choisir : si votre question
aux tâches est « qu'avez-vous trouvé ? », prenez `TaskGroup` ; si c'est « et ensuite ? », prenez
`TaskSet`.

Au cours des quatre derniers chapitres, nous avons construit la même chose trois fois : parcourir
une collection en effectuant un travail concurrent sur chaque élément sous une limite. Une fois
avec un canal et des workers, une fois avec `TaskGroup`, une fois avec `TaskSet`. N'est-il pas
temps que ce motif ait un nom bien à lui et se réduise à une seule ligne ?
