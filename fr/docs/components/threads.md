---
layout: docs
lang: fr
path_key: "/docs/components/threads.html"
nav_active: docs
permalink: /fr/docs/components/threads.html
page_title: "Async\\Thread"
description: "Async\\Thread — exécution de code dans un thread parallèle séparé : transfert de données, WeakReference/WeakMap, ThreadChannel, Future entre threads."
---

# Async\Thread : exécution de PHP dans un thread séparé

## Pourquoi les threads sont nécessaires

Les coroutines résolvent le problème de concurrence pour les charges de travail **liées aux I/O** — un seul processus peut gérer
des milliers d'attentes réseau ou disque concurrentes. Mais les coroutines ont une limitation : elles s'exécutent toutes
**dans le même processus PHP** et se relaient pour recevoir le contrôle du planificateur. Si une tâche est
**liée au CPU** — compression, analyse, cryptographie, calcul intensif — une seule coroutine de ce type
bloquera le planificateur, et toutes les autres coroutines seront suspendues jusqu'à sa fin.

Les threads résolvent cette limitation. `Async\Thread` exécute une closure dans un **thread parallèle séparé**
avec son **propre environnement PHP isolé** : ses propres variables, son propre autoloader, ses propres classes
et fonctions. Rien n'est partagé directement entre les threads — toutes les données sont transmises **par valeur**,
par copie profonde.

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// Ticker dans la coroutine principale — prouve que le thread parallèle
// n'empêche pas le programme principal de continuer
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
        // Calcul intensif dans un thread séparé
        $sum = 0;
        for ($i = 0; $i < 5_000_000; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    $result = await($thread);
    echo "heavy done: ", (int) $result, "\n";
});
```

```
tick 0
tick 1
tick 2
tick 3
tick 4
heavy done: 7453558806
```

Le ticker complète calmement ses 5 « ticks » de manière concurrente avec le travail intensif du thread — le programme principal
n'a pas à attendre.

## Quand utiliser les threads plutôt que les coroutines

| Tâche                                                     | Outil                     |
|-----------------------------------------------------------|---------------------------|
| Nombreuses requêtes HTTP/BDD/fichiers concurrentes        | Coroutines                |
| Travail long lié au CPU (analyse, crypto)                 | Threads                   |
| Isolation de code instable                                | Threads                   |
| Travail parallèle sur plusieurs cœurs CPU                 | Threads                   |
| Échange de données entre tâches                           | Coroutines + canaux       |

Un thread est une **entité relativement coûteuse** : démarrer un nouveau thread est d'un ordre de grandeur
plus lourd que démarrer une coroutine. C'est pourquoi on n'en crée pas des milliers : le modèle typique
est quelques threads de travail longévifs (souvent égal au nombre de cœurs CPU), ou un thread
pour une tâche lourde spécifique.

## Cycle de vie

```php
// Création — le thread démarre et commence à s'exécuter immédiatement
$thread = spawn_thread(fn() => compute());

// Attente du résultat. La coroutine appelante attend ; les autres continuent de s'exécuter
$result = await($thread);

// Ou une vérification non bloquante
if ($thread->isCompleted()) {
    $result = $thread->getResult();
}
```

`Async\Thread` implémente l'interface `Completable`, donc il peut être passé à `await()`,
`await_all()`, `await_any()` et `Task\Group` — exactement comme une coroutine ordinaire.

### États

| Méthode           | Ce qu'elle vérifie                                             |
|-------------------|----------------------------------------------------------------|
| `isRunning()`     | Le thread s'exécute encore                                     |
| `isCompleted()`   | Le thread a terminé (avec succès ou avec une exception)        |
| `isCancelled()`   | Le thread a été annulé                                         |
| `getResult()`     | Le résultat s'il a terminé avec succès ; sinon `null`          |
| `getException()`  | L'exception s'il a terminé avec une erreur ; sinon `null`      |

### Gestion des exceptions

Une exception levée à l'intérieur d'un thread est capturée et transmise au parent encapsulée
dans `Async\RemoteException` :

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new RuntimeException('boom');
    });

    try {
        await($thread);
    } catch (Async\RemoteException $e) {
        echo "remote class: ", $e->getRemoteClass(), "\n";

        $original = $e->getRemoteException();
        if ($original !== null) {
            echo "original: ", $original->getMessage(), "\n";
        }
    }
});
```

```
remote class: RuntimeException
original: boom
```

`getRemoteException()` peut retourner `null` si la classe d'exception n'a pas pu être chargée dans le thread parent
(par exemple, c'est une classe définie par l'utilisateur qui n'existe que dans le thread récepteur).

## Transfert de données entre threads

C'est la partie la plus importante du modèle. **Tout est transféré par copie** — pas de références partagées.

### Ce qui peut être transféré

| Type                                                         | Comportement                                                           |
|--------------------------------------------------------------|------------------------------------------------------------------------|
| Scalaires (`int`, `float`, `string`, `bool`, `null`)         | Copié                                                                  |
| Tableaux                                                     | Copie profonde ; les objets imbriqués préservent l'identité            |
| Objets avec propriétés déclarées (`public $x`, etc.)        | Copie profonde ; recréés depuis zéro côté récepteur                    |
| `Closure`                                                    | Le corps de la fonction est transféré avec toutes les vars `use(...)` |
| `WeakReference`                                              | Transféré avec le référent (voir ci-dessous)                           |
| `WeakMap`                                                    | Transféré avec toutes les clés et valeurs (voir ci-dessous)            |
| `Async\FutureState`                                          | Une seule fois, pour écrire un résultat depuis le thread (voir ci-dessous) |

### Ce qui ne peut pas être transféré

| Type                                                   | Pourquoi                                                                                |
|--------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `stdClass` et tout objet avec des propriétés dynamiques | Les propriétés dynamiques n'ont pas de déclaration au niveau de la classe et ne peuvent pas être correctement recréées dans le thread récepteur |
| Références PHP (`&$var`)                               | Une référence partagée entre threads contredit le modèle                                |
| Ressources (`resource`)                                | Les descripteurs de fichiers, handles curl, sockets sont liés à un thread spécifique    |

Tenter de transférer l'un de ces éléments lèvera immédiatement `Async\ThreadTransferException` dans la source :

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $obj = new stdClass();   // propriétés dynamiques
    $obj->x = 1;

    try {
        $thread = spawn_thread(function() use ($obj) {
            return 'unreachable';
        });
        await($thread);
    } catch (Async\ThreadTransferException $e) {
        echo $e->getMessage(), "\n";
    }
});
```

```
Cannot transfer object with dynamic properties between threads (class stdClass). Use arrays instead
```

### L'identité des objets est préservée

Le même objet référencé plusieurs fois dans un graphe de données est **créé une seule fois dans le thread récepteur**,
et toutes les références pointent vers lui. Dans une seule opération de transfert (toutes les variables de
`use(...)` d'une closure, un envoi de canal, un résultat de thread), l'identité est préservée :

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// La classe doit être déclarée dans l'environnement du thread récepteur — on le fait via un bootloader
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(function() use ($obj, $meta) {
        // La même instance dans deux variables différentes
        echo "same: ", ($obj === $meta['ref'] ? "yes" : "no"), "\n";

        // Une mutation via une référence est visible à travers l'autre
        $obj->name = 'staging';
        echo "meta: ", $meta['ref']->name, "\n";

        return 'ok';
    }, bootloader: $boot);

    echo await($thread), "\n";
});
```

```
same: yes
meta: staging
ok
```

La même chose s'applique aux objets liés dans un seul graphe : un tableau avec des références à des objets
imbriqués partagés préservera l'identité après le transfert.

### Cycles

Un graphe avec un cycle à travers des objets ordinaires peut être transféré. La limitation est que les cycles
très profondément imbriqués peuvent atteindre la limite de profondeur de transfert interne (des centaines de niveaux).
En pratique, cela ne se produit presque jamais. Les cycles de la forme `$node->weakParent = WeakReference::create($node)`
— c'est-à-dire un objet qui se référence lui-même via un `WeakReference` — se heurtent actuellement à la même
limite, il vaut donc mieux ne pas les utiliser dans un seul graphe transféré.

## WeakReference entre threads

`WeakReference` a une logique de transfert spéciale. Le comportement dépend de ce qui est transféré à côté.

### Le référent est également transféré — l'identité est préservée

Si l'objet lui-même est transféré avec le `WeakReference` (directement, dans un tableau,
ou comme propriété d'un autre objet), alors côté récepteur `$wr->get()` retourne **exactement
cette** instance qui s'est retrouvée dans les autres références :

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Config { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($obj, $wr) {
        echo "wr === obj: ", ($wr->get() === $obj ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
wr === obj: yes
```

### Le référent n'est pas transféré — WeakReference devient morte

Si seul le `WeakReference` est transféré mais pas l'objet lui-même, alors dans le thread récepteur
personne ne détient de référence forte vers cet objet. Selon les règles de PHP, cela signifie que l'objet est
immédiatement détruit et que le `WeakReference` devient **mort** (`$wr->get() === null`). C'est exactement le
même comportement qu'en PHP mono-thread : sans propriétaire fort, l'objet est collecté.

```php
spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($wr) {   // $obj n'est PAS transféré
        echo "dead: ", ($wr->get() === null ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
dead: yes
```

### La source est déjà morte

Si le `WeakReference` était déjà mort dans la source au moment du transfert (`$wr->get() === null`),
il arrivera dans le thread récepteur mort également.

### Singleton

`WeakReference::create($obj)` retourne un singleton : deux appels pour le même objet donnent **la même**
instance de `WeakReference`. Cette propriété est préservée lors du transfert — dans le thread récepteur il y
aura également exactement une instance de `WeakReference` par objet.

## WeakMap entre threads

`WeakMap` est transféré avec toutes ses entrées. Mais la même règle s'applique qu'en PHP mono-thread :
**une clé de `WeakMap` ne vit que tant que quelqu'un détient une référence forte vers elle**.

### Les clés sont dans le graphe — les entrées survivent

Si les clés sont transférées séparément (ou sont accessibles à travers d'autres objets transférés), le
`WeakMap` dans le thread récepteur contient toutes les entrées :

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Key { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Key { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $k1 = new Key('alpha');
    $k2 = new Key('beta');
    $wm = new WeakMap();
    $wm[$k1] = 'v1';
    $wm[$k2] = 'v2';

    $thread = spawn_thread(function() use ($wm, $k1, $k2) {
        echo "count: ", count($wm), "\n";
        echo "k1: ", $wm[$k1], "\n";
        echo "k2: ", $wm[$k2], "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 2
k1: v1
k2: v2
```

### Seulement WeakMap — les entrées disparaissent

Si seul le `WeakMap` est transféré et que ses clés n'apparaissent nulle part ailleurs dans le graphe, le
`WeakMap` **sera vide dans le thread récepteur**. Ce n'est pas un bug ; c'est une conséquence directe
de la sémantique faible : sans propriétaire fort, la clé est détruite immédiatement après avoir été chargée et
l'entrée correspondante disparaît.

```php
spawn(function() use ($boot) {
    $ghost = new Key('ghost');
    $wm = new WeakMap();
    $wm[$ghost] = 'value';

    $thread = spawn_thread(function() use ($wm) {  // $ghost n'est pas transféré
        echo "count: ", count($wm), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 0
```

Pour qu'une entrée « survive » au transfert, sa clé doit être transférée séparément (ou dans le cadre d'un
autre objet lui-même inclus dans le graphe).

### Structures imbriquées

Un `WeakMap` peut contenir d'autres `WeakMap`s, des `WeakReference`s, des tableaux et des objets ordinaires comme valeurs —
tout est transféré récursivement. Les cycles de la forme `$wm[$obj] = $wm` sont gérés correctement.

## Future entre threads

Transférer directement un `Async\Future` entre threads n'est **pas possible** : un `Future` est un objet
d'attente dont les événements sont liés au planificateur du thread dans lequel il a été créé. À la place, vous
pouvez transférer le côté « écrivain » — `Async\FutureState` — et seulement **une fois**.

Le schéma typique : le parent crée une paire `FutureState` + `Future`, passe `FutureState` lui-même
dans le thread via une variable `use(...)`, le thread appelle `complete()` ou `error()`, et le
parent reçoit le résultat à travers son `Future` :

```php
<?php

use Async\FutureState;
use Async\Future;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $state  = new FutureState();
    $future = new Future($state);

    $thread = spawn_thread(function() use ($state) {
        // Simulation d'un travail intensif
        $data = "computed in thread";
        $state->complete($data);
    });

    // Le parent attend via son propre Future — l'événement arrive ici
    // quand le thread appelle $state->complete()
    $result = await($future);
    echo "got: ", $result, "\n";

    await($thread);
    echo "thread done\n";
});
```

```
got: computed in thread
thread done
```

**Contraintes importantes :**

1. `FutureState` ne peut être transféré que vers **un seul** thread. Une seconde tentative de transfert lèvera une exception.
2. Transférer le `Future` lui-même n'est pas autorisé — il appartient au thread parent et ne peut que
   réveiller son propre propriétaire.
3. Après le transfert de `FutureState`, l'objet original dans le parent reste valide : quand le
   thread appelle `complete()`, ce changement devient visible à travers le `Future` dans le parent —
   `await($future)` se débloque.

C'est le seul moyen standard de livrer **un seul résultat** depuis un thread à l'appelant,
en dehors du `return` ordinaire de `spawn_thread()`. Si vous avez besoin de transmettre de nombreuses valeurs, utilisez
`ThreadChannel`.

## Bootloader : préparation de l'environnement du thread

Un thread a **son propre environnement** et n'hérite pas des définitions de classes, fonctions ou constantes
déclarées dans le script parent. Si une closure utilise une classe définie par l'utilisateur, cette classe doit soit être
redéclarée soit chargée via l'autoload — pour cela il y a le paramètre `bootloader` :

```php
$thread = spawn_thread(
    task: function() {
        $config = new Config('prod');  // Config doit exister dans le thread
        return $config->name;
    },
    bootloader: function() {
        // Exécuté dans le thread récepteur AVANT la closure principale
        require_once __DIR__ . '/src/autoload.php';
    },
);
```

Le bootloader est garanti de s'exécuter dans le thread récepteur avant que les variables `use(...)` soient
chargées et avant que la closure principale soit appelée. Tâches typiques du bootloader : enregistrer l'autoload,
déclarer des classes via `eval`, définir des options ini, charger des bibliothèques.

## Cas particuliers

### Superglobales

`$_GET`, `$_POST`, `$_SERVER`, `$_ENV` sont propres au thread — elles sont initialisées de zéro,
comme dans une nouvelle requête. Dans la version actuelle de TrueAsync, leur remplissage dans les threads récepteurs est
temporairement désactivé (prévu d'être activé ultérieurement) — consultez le CHANGELOG.

### Variables statiques de fonction

Chaque thread a son propre ensemble de variables statiques de fonction et de classe. Les changements dans un thread ne sont pas
visibles par les autres — cela fait partie de l'isolation générale.

### Opcache

Opcache partage son cache de bytecode compilé entre les threads en lecture seule : les scripts sont compilés une fois
pour l'ensemble du processus, et chaque nouveau thread réutilise le bytecode prêt. Cela accélère le démarrage des threads.

## Voir aussi

- [`spawn_thread()`](/fr/docs/reference/spawn-thread.html) — exécution d'une closure dans un thread
- [`Async\ThreadChannel`](/fr/docs/components/thread-channels.html) — canaux entre threads
- [`await()`](/fr/docs/reference/await.html) — attente du résultat d'un thread
- [`Async\RemoteException`](/fr/docs/components/exceptions.html) — encapsuleur pour les erreurs du thread récepteur
