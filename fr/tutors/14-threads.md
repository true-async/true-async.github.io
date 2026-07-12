---
layout: tutorial
lang: fr
path_key: "/tutors/14-threads.html"
nav_active: docs
permalink: /fr/tutors/14-threads.html
page_title: "Threads"
description: "spawn_thread et ThreadPool : véritable parallélisme pour le calcul, isolation et copie des données."
---

# Threads

Tous nos outils jusqu'ici ont vécu à l'intérieur d'un seul thread du système d'exploitation. Les
coroutines créaient l'impression que les choses se passaient en même temps, mais à tout instant
donné exactement une seule d'entre elles s'exécutait réellement. Pour le travail d'import et les
requêtes vers `GeoDirectory`, c'était largement suffisant : les tâches attendaient la plupart du
temps, et l'attente se divise à merveille.

Voici maintenant un autre genre de tâche. Une fois par jour, `ProfileService` construit un rapport
annuel : une pleine minute de calcul pur, sans un seul appel réseau ou base de données.
Exécutons-le dans une coroutine, aux côtés de notre ticker familier :

```php
spawn(function () {
    while (true) {
        echo "tick\n";
        delay(1000);
    }
});

spawn(function () {
    $report = buildYearlyReport($rows); // une minute de calcul pur
    echo "report ready\n";
});
```

Le ticker se tait pendant une minute entière. Rappelez-vous le chapitre un : les coroutines
basculent aux points d'await, à `sleep`, `delay`, aux entrées/sorties. Mais `buildYearlyReport`
n'a pas un seul point d'await, juste des boucles et de l'arithmétique. L'ordonnanceur ne reprend
jamais le contrôle, et tout le processus, ticker, workers, traitement des requêtes, tout, reste là
à regarder une seule coroutine broyer des nombres.

Les coroutines vous donnent de la concurrence, pas du parallélisme. Quand une tâche est bornée par
le processeur plutôt que par l'attente, il vous faut un second processeur. Ou plus précisément, un
second thread du système d'exploitation.

## spawn_thread

```php
use function Async\spawn_thread;
use function Async\await;

$thread = spawn_thread(fn() => buildYearlyReport($rows));

$report = await($thread);
```

`spawn_thread` lance la closure dans un thread séparé du système d'exploitation, sur un cœur de
processeur différent. Le rapport est maintenant calculé véritablement en parallèle : le ticker
continue de faire tic-tac, les workers continuent de travailler, et l'ordonnanceur n'a aucune idée
qu'un travail lourd se déroule juste à côté.

Vu de l'extérieur, un thread ressemble presque à une coroutine : vous pouvez le passer au familier
`await`, qui ne suspend que la coroutine en attente. Une exception provenant du thread atteint
elle aussi `await`, enveloppée dans `Async\RemoteException`.

## Rien en commun

Presque comme une coroutine, mais avec une différence fondamentale. Dans le chapitre sur les
canaux, nous avons dit que les coroutines vivent en mémoire partagée, que vous pouvez simplement
transmettre un objet via `use`, et que les courses de données ne se produisent pas au sein d'un
seul thread. Eh bien, cette astuce ne fonctionne pas avec les threads. Chaque thread a son propre
environnement PHP : ses propres variables, ses propres classes, ses propres propriétés statiques.
Il n'y a aucune mémoire partagée du tout.

C'est pourquoi tout ce qui est passé dans un thread est copié intégralement :

```php
$rows = loadRows();

$thread = spawn_thread(function () use ($rows) {
    // ceci est une COPIE de $rows : les changements ici ne sont pas visibles à l'extérieur
    return buildYearlyReport($rows);
});
```

Cette règle s'accompagne aussi de restrictions : vous ne pouvez pas passer une référence PHP
(`&$var`), une ressource comme un fichier ouvert, ou un objet avec des propriétés dynamiques dans
un thread. Toute tentative en ce sens lève immédiatement `ThreadTransferException`, dès le départ,
au lieu de provoquer un comportement mystérieux plus tard.

Les règles sont strictes, mais elles sont honnêtes : sans état partagé, il n'y a ni courses, ni
verrous, ni mutex, ni aucun des autres cauchemars du multithreading classique. Les threads de
TrueAsync communiquent de la même manière que les coroutines : en passant des valeurs, pas en
partageant de la mémoire.

Au passage, une vieille connaissance sait franchir la frontière entre threads de façon
significative. Le `FutureState` du chapitre six peut être passé dans un thread tandis que son
`Future` reste en arrière :

```php
$state  = new FutureState();
$future = new Future($state);

spawn_thread(function () use ($state) {
    $state->complete(buildYearlyReport(loadRows()));
});

$report = await($future);
```

Le producteur est dans un thread, le consommateur dans un autre, et le contrat est exactement le
même. C'est pour cela que `Future` a été scindé en deux objets distincts dès le début : la
frontière entre eux s'est révélée assez solide pour faire passer une frontière de thread juste le
long d'elle.

## ThreadPool

Un thread est une entité coûteuse : son propre environnement PHP doit être créé, initialisé et
préchauffé. Une tâche par minute, d'accord, aucun problème, mais démarrer un thread pour chaque
petite tâche est tout aussi gaspilleur qu'ouvrir une connexion à la base de données à chaque
requête.

Vous savez déjà quoi faire avec les ressources coûteuses. Exact, les mettre en pool :

```php
use Async\ThreadPool;

$pool = new ThreadPool(workers: 8);

$futures = [];
foreach ($uploads as $path) {
    $futures[] = $pool->submit(makeThumbnail(...), $path);
}

foreach ($futures as $future) {
    echo await($future), "\n";
}

$pool->close();
```

Huit threads de travail sont créés une fois et vivent aussi longtemps que le pool. `submit` place
une tâche dans la file, un worker libre la récupère et renvoie le résultat. Et regardez ce que
`submit` renvoie : un `Future`, une promesse de résultat que quelqu'un d'autre produira. Au
chapitre six, ce « quelqu'un d'autre » était une coroutine ; maintenant c'est un thread séparé
tout entier, et le contrat n'a pas changé d'un iota.

La file du pool a une limite, et une fois qu'elle se remplit, `submit` suspend la coroutine
appelante. Vous reconnaissez ça ? C'est la contre-pression du chapitre sur les canaux : le
producteur de tâches ajuste automatiquement son rythme pour s'aligner sur la vitesse des workers.

Gardez le nombre de workers proche du nombre de cœurs de processeur : contrairement à l'attente, le
calcul a besoin de véritables cœurs physiques, et vingt threads sur huit cœurs vont simplement se
bousculer. Par défaut, sans le paramètre `workers`, le pool détermine tout seul le parallélisme
disponible, en tenant même compte des quotas de conteneur.

Et pour le cas le plus courant, « traiter une liste en parallèle », il existe une forme d'une seule
ligne que vous connaissez déjà d'`iterate` :

```php
$thumbs = $pool->map($uploads, makeThumbnail(...));
```

`map` distribue les éléments parmi les workers, les attend tous, et renvoie les résultats dans leur
ordre d'origine.

Il s'avère donc que la concurrence a deux dimensions. Les coroutines compriment l'attente : des
milliers de tâches partagent un seul thread et ne se gênent pas les unes les autres pendant
qu'elles attendent. Les threads ajoutent un véritable parallélisme : le calcul se répartit sur les
cœurs de processeur. Ces outils ne se concurrencent pas, ils se complètent : là où le code attend,
prenez une coroutine ; là où il calcule, prenez un thread ; et une fois que vous en avez beaucoup
de l'un ou de l'autre, un pool vient à la rescousse.

Enfin, jetez un œil à ce qu'est devenu notre processus : des centaines de coroutines, toutes
mélangées, servant différents utilisateurs, des tâches sautant entre workers et threads. Et dans
cette foule, une question simple se révèle étonnamment difficile : où gardez-vous « l'actuel » ?
L'utilisateur actuel, la langue actuelle, l'identifiant de requête ? Il y a une seule variable
globale pour tout le monde, et il y a des milliers de coroutines. C'est le sujet du dernier
chapitre.
