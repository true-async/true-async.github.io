---
layout: tutorial
lang: fr
path_key: "/tutors/12-iterate.html"
nav_active: docs
permalink: /fr/tutors/12-iterate.html
page_title: "Itérateur concurrent"
description: "iterate() : parcours concurrent d'une collection en une seule ligne, générateurs et sortie anticipée."
---

# Itérateur concurrent

Comptons combien de fois nous avons construit le même motif. Dans le chapitre sur les canaux : un
canal, dix workers, une boucle `recv`. Dans le chapitre sur TaskGroup : `concurrency: 10`, une
boucle `spawn`, `close()`. Dans le chapitre sur TaskSet : la même chose, mais en consommant les
résultats. À chaque fois, la tâche sonnait pareil : parcourir une collection, effectuer un travail
concurrent sur chaque élément, et ne jamais dépasser la limite.

Un motif aussi courant mérite une fonction à lui seul :

```php
use function Async\iterate;

iterate($addresses, checkAddress(...), concurrency: 10);
```

Et voilà tout le pool de workers. `iterate` appelle la fonction pour chaque élément de la
collection dans sa propre coroutine, s'assure que pas plus de dix ne s'exécutent de manière
concurrente, et rend le contrôle une fois que tout a été traité.

## Un générateur au lieu d'un tableau

Attendez, et la lecture du fichier ? Rassembler cent mille adresses dans un tableau juste pour
appeler `iterate` serait un retour en arrière : la contre-pression du chapitre sur les canaux
était ce qui nous économisait de la mémoire. Aucun problème : `iterate` accepte non seulement un
tableau mais aussi n'importe quel `Traversable`, y compris les générateurs :

```php
function addresses(string $path): Generator
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);
    $addressIndex = array_search('address', $header);

    while (($row = fgetcsv($handle)) !== false) {
        yield $row[$addressIndex];
    }

    fclose($handle);
}

iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
```

Le générateur lit le fichier paresseusement, une ligne à la fois. `iterate` ne tire l'adresse
suivante qu'une fois qu'un emplacement se libère, de sorte que le fichier n'est jamais conservé
en mémoire d'un seul bloc. C'est la même contre-pression qu'un canal tamponné vous offre, sauf que
maintenant elle est invisible : tout ce qui reste, c'est une seule ligne exprimant l'intention.

## Sortie anticipée

La fonction de traitement peut arrêter tout le parcours en renvoyant `false` :

```php
$broken = 0;

iterate(addresses('users.csv'), function (string $address) use (&$broken) {
    if (!checkAddress($address)) {
        $broken++;
    }

    if ($broken >= 100) {
        return false; // le fichier est corrompu, inutile de continuer
    }
}, concurrency: 10);
```

Cent adresses invalides d'affilée sont un signe fiable qu'on nous a remis le mauvais fichier.
Aucun nouvel élément ne démarre après le `false`, les coroutines déjà en cours terminent ce
qu'elles font, et `iterate` retourne.

Les exceptions sont plus strictes, et vous connaissez déjà la règle depuis Scope : une erreur dans
n'importe quel handler arrête le parcours, annule les coroutines restantes et se propage vers
l'extérieur. Échouer ensemble par défaut :

```php
try {
    iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
} catch (RemoteApiException $e) {
    echo "Import interrompu : {$e->getMessage()}\n";
}
```

Il n'y a aucune magie derrière : à l'intérieur d'`iterate` vit un scope enfant ordinaire du
chapitre huit, et c'est lui qui maintient l'ordre.

## Une échelle d'abstractions

Au fil de six chapitres, une échelle entière a pris forme, et il vaut la peine de la parcourir du
regard une fois de plus, de bas en haut :

- **Un canal + Scope** — les primitives. N'importe quelle topologie : pools, pipelines,
  rendez-vous, superviseurs. Contrôle maximal, code maximal.
- **`TaskGroup` / `TaskSet`** — des assemblages prêts à l'emploi pour un ensemble de tâches,
  quand vous avez besoin des résultats : tous, le premier, le premier réussi, ou un par un à
  mesure qu'ils deviennent prêts.
- **`iterate()`** — une seule ligne, quand vous n'avez pas besoin du résultat et que vous voulez
  juste parcourir une collection de manière concurrente.

Plus on monte dans l'échelle, moins il y a de code et plus le scénario se resserre. Commencez par
le haut : si `iterate` suffit, il n'y a aucune raison de construire un groupe ; si un groupe ne
suffit pas, descendez jusqu'aux canaux. En bas, vous pouvez assembler n'importe quelle
construction qui vous plaît ; en haut, tout est déjà assemblé pour vous.

Remarquez ce qui est arrivé à notre import : chapitre après chapitre, il n'a cessé de rétrécir,
jusqu'à finalement tenir sur une seule ligne. C'est exactement comme cela que ça devrait être. La
concurrence cesse d'être un événement et devient un outil ordinaire, tout comme `foreach`.

Mais une question du chapitre neuf reste en suspens. Pour PDO, le pool de connexions est intégré
au cœur, tandis que `checkAddress` dialogue avec `GeoDirectory` par HTTP. Ses connexions valent la
peine d'être réutilisées elles aussi, et pas seulement les siennes : sockets, clients, objets
lourds en général. Devons-nous vraiment bricoler un pool à partir d'un canal à chaque fois ?
Heureusement, non, et le prochain chapitre vous montrera pourquoi.
