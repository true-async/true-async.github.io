---
layout: docs
lang: fr
path_key: "/docs/components/thread-pool.html"
nav_active: docs
permalink: /fr/docs/components/thread-pool.html
page_title: "Async\\ThreadPool"
description: "Async\\ThreadPool — un pool de threads de travail pour l'exécution parallèle de tâches liées au CPU dans TrueAsync."
---

# Async\ThreadPool : pool de threads de travail

## Pourquoi ThreadPool

[`spawn_thread()`](/fr/docs/reference/spawn-thread.html) résout le problème « une tâche — un thread » :
lancer un calcul intensif, attendre le résultat, le thread se termine. C'est pratique, mais a un coût :
**chaque lancement de thread est un appel système complet**. Initialiser un environnement PHP séparé,
charger le bytecode Opcache, allouer une pile — tout cela se produit depuis zéro. Avec des centaines ou
des milliers de telles tâches, la surcharge devient perceptible.

`Async\ThreadPool` résout ce problème : au démarrage, un ensemble fixe de **threads de travail**
(threads OS avec leur propre environnement PHP) est créé, vivant pour toute la durée du programme
et **réutilisés à plusieurs reprises** pour exécuter des tâches. Chaque `submit()` place une tâche dans la file d'attente, un
travailleur libre la prend, l'exécute et retourne le résultat via [`Async\Future`](/fr/docs/components/future.html).

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    // Soumettre 8 tâches à un pool de 4 travailleurs
    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $sum = 0;
            for ($k = 0; $k < 1_000_000; $k++) {
                $sum += sqrt($k);
            }
            return ['task' => $i, 'sum' => (int) $sum];
        });
    }

    foreach ($futures as $f) {
        $result = await($f);
        echo "task {$result['task']}: {$result['sum']}\n";
    }

    $pool->close();
});
```

Huit tâches s'exécutent en parallèle sur quatre travailleurs. Pendant que les travailleurs calculent — le programme principal
(autres coroutines) continue de s'exécuter : `await($f)` suspend uniquement la coroutine en attente, pas
l'ensemble du processus.

## Quand utiliser ThreadPool plutôt que spawn_thread ou les coroutines

| Scénario                                                        | Outil                    |
|-----------------------------------------------------------------|--------------------------|
| Une tâche lourde, lancée rarement                               | `spawn_thread()`         |
| Nombreuses tâches CPU courtes en boucle                         | `ThreadPool`             |
| Un thread fixe qui vit pour tout le programme                   | `ThreadPool`             |
| I/O : réseau, base de données, système de fichiers              | Coroutines               |
| Tâche nécessaire immédiatement, sans file d'attente             | `spawn_thread()`         |

**Règle clé :** si les tâches sont nombreuses et courtes — un pool amortit le coût de démarrage des threads.
S'il y a une tâche lancée une fois toutes les quelques secondes — `spawn_thread()` est suffisant.

Une taille de pool typique est égale au nombre de cœurs CPU physiques (`nproc` sous Linux, `sysconf(_SC_NPROCESSORS_ONLN)`
en C). Plus de travailleurs que de cœurs n'accélère pas les charges liées au CPU et ne fait qu'ajouter de la surcharge de commutation de contexte.

## Création d'un pool

```php
$pool = new ThreadPool(workers: 4);
$pool = new ThreadPool(workers: 4, queueSize: 64);
```

| Paramètre    | Type  | Rôle                                                                    | Défaut            |
|--------------|-------|-------------------------------------------------------------------------|-------------------|
| `$workers`   | `int` | Nombre de threads de travail. Tous démarrent à la création du pool      | **obligatoire**   |
| `$queueSize` | `int` | Longueur maximale de la file d'attente des tâches en attente            | `workers × 4`     |

Tous les threads de travail démarrent **immédiatement à la création** du pool — `new ThreadPool(4)` crée quatre
threads tout de suite. C'est un petit investissement « initial », mais les appels `submit()` suivants ne comportent aucune
surcharge de démarrage de thread.

`$queueSize` limite la taille de la file d'attente des tâches interne. Si la file est pleine (tous les travailleurs sont occupés
et il y a déjà `$queueSize` tâches dans la file), le prochain `submit()` **suspend la coroutine appelante**
jusqu'à ce qu'un travailleur soit disponible. Une valeur de zéro signifie `workers × 4`.

## Soumission de tâches

### submit()

```php
$future = $pool->submit(callable $task, mixed ...$args): Async\Future;
```

Ajoute une tâche à la file d'attente du pool. Retourne un [`Async\Future`](/fr/docs/components/future.html)
qui :

- **se résout** avec la valeur de `return` de `$task` quand le travailleur termine l'exécution ;
- **est rejeté** avec une exception si `$task` a levé une exception.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    // Tâche sans arguments
    $f1 = $pool->submit(function() {
        return strtoupper('hello from worker');
    });

    // Tâche avec arguments — les arguments sont aussi passés par valeur (copie profonde)
    $f2 = $pool->submit(function(int $n, string $prefix) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return "$prefix: $sum";
    }, 1_000_000, 'result');

    echo await($f1), "\n";
    echo await($f2), "\n";

    $pool->close();
});
```

```
HELLO FROM WORKER
result: 499999500000
```

#### Gestion des exceptions d'une tâche

Si une tâche lève une exception, le `Future` est rejeté, et `await()` la relève dans la
coroutine appelante :

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        throw new RuntimeException('something went wrong in the worker');
    });

    try {
        await($f);
    } catch (RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
    }

    $pool->close();
});
```

```
Caught: something went wrong in the worker
```

#### Règles de transfert de données

La tâche (`$task`) et tous les `...$args` sont **copiés en profondeur** dans le thread de travail — les mêmes règles
qu'avec `spawn_thread()`. Vous ne pouvez pas passer `stdClass`, des références PHP (`&$var`), ou des ressources ; tenter
de le faire entraînera la levée de `Async\ThreadTransferException` dans la source. Plus de détails :
[« Transfert de données entre threads »](/fr/docs/components/threads.html#transfert-de-données-entre-threads).

### map()

```php
$results = $pool->map(array $items, callable $task): array;
```

Applique `$task` à chaque élément de `$items` en parallèle en utilisant les travailleurs du pool. **Bloque** la
coroutine appelante jusqu'à ce que toutes les tâches soient terminées. Retourne un tableau de résultats dans le même ordre que les
données d'entrée.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $files = ['/var/log/app.log', '/var/log/nginx.log', '/var/log/php.log'];

    $lineCounts = $pool->map($files, function(string $path) {
        if (!file_exists($path)) {
            return 0;
        }
        $count = 0;
        $fh = fopen($path, 'r');
        while (!feof($fh)) {
            fgets($fh);
            $count++;
        }
        fclose($fh);
        return $count;
    });

    foreach ($files as $i => $path) {
        echo "$path: {$lineCounts[$i]} lines\n";
    }

    $pool->close();
});
```

Si au moins une tâche lève une exception, `map()` la relève dans la coroutine appelante.
L'ordre des résultats correspond toujours à l'ordre des éléments d'entrée, quel que soit l'ordre dans lequel
les travailleurs terminent.

## Surveillance de l'état du pool

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    // Lancer plusieurs tâches
    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            // Simuler du travail
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    // Vérifier les compteurs pendant que les tâches s'exécutent
    delay(50); // donner aux travailleurs le temps de démarrer
    echo "workers:   ", $pool->getWorkerCount(), "\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    foreach ($futures as $f) {
        await($f);
    }

    echo "--- after all done ---\n";
    echo "pending:   ", $pool->getPendingCount(), "\n";
    echo "running:   ", $pool->getRunningCount(), "\n";
    echo "completed: ", $pool->getCompletedCount(), "\n";

    $pool->close();
});
```

```
workers:   3
pending:   3
running:   3
completed: 0
--- after all done ---
pending:   0
running:   0
completed: 6
```

| Méthode               | Ce qu'elle retourne                                                                      |
|-----------------------|------------------------------------------------------------------------------------------|
| `getWorkerCount()`    | Nombre de threads de travail (défini dans le constructeur)                               |
| `getPendingCount()`   | Tâches dans la file d'attente, pas encore prises par un travailleur                      |
| `getRunningCount()`   | Tâches en cours d'exécution par un travailleur                                           |
| `getCompletedCount()` | Total des tâches terminées depuis la création du pool (croissance monotone)              |
| `isClosed()`          | `true` si le pool a été fermé via `close()` ou `cancel()`                                |

Les compteurs sont implémentés sous forme de variables atomiques — ils sont précis à tout moment, même
quand les travailleurs s'exécutent dans des threads parallèles.

## Arrêt du pool

Les threads de travail vivent jusqu'à ce que le pool soit explicitement arrêté. Appelez toujours `close()`
ou `cancel()` lorsque vous avez terminé — sinon les threads continueront de s'exécuter jusqu'à la fin du processus.

### close() — arrêt gracieux

```php
$pool->close();
```

Après l'appel de `close()` :

- Les nouveaux appels à `submit()` lèvent immédiatement `Async\ThreadPoolException`.
- Les tâches déjà dans la file d'attente ou en cours d'exécution par les travailleurs **se terminent normalement**.
- La méthode ne retourne qu'après que toutes les tâches en cours aient terminé et que tous les travailleurs se soient arrêtés.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $f = $pool->submit(function() {
        return 'finished';
    });

    $pool->close();

    echo await($f), "\n"; // Garantie d'obtenir le résultat

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
    }
});
```

```
finished
Error: Cannot submit task: thread pool is closed
```

### cancel() — arrêt forcé

```php
$pool->cancel();
```

Après l'appel de `cancel()` :

- Les nouveaux appels à `submit()` lèvent `Async\ThreadPoolException`.
- Les tâches dans la file d'attente (pas encore prises par un travailleur) sont **immédiatement rejetées** — les objets
  `Future` correspondants passent à l'état « rejeté ».
- Les tâches déjà en cours d'exécution par les travailleurs **s'exécutent jusqu'à la fin** de l'itération en cours (interrompre
  de force le code PHP dans un thread n'est pas possible).
- Les travailleurs s'arrêtent immédiatement après avoir terminé la tâche en cours et ne prennent pas de nouvelles tâches.

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Remplir la file d'attente avec des tâches
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Annuler immédiatement — les tâches dans la file seront rejetées
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";
    echo "cancelled: $cancelled\n";
});
```

```
done:      2
cancelled: 6
```

### Comparaison de close() et cancel()

| Aspect                           | `close()`                           | `cancel()`                             |
|----------------------------------|-------------------------------------|----------------------------------------|
| Nouveaux appels submit()         | Lève `ThreadPoolException`          | Lève `ThreadPoolException`             |
| Tâches dans la file d'attente    | S'exécutent normalement             | Rejetées immédiatement                 |
| Tâches en cours d'exécution      | Se terminent normalement            | Se terminent normalement (itération en cours) |
| Quand les travailleurs s'arrêtent | Après vidage de la file            | Après la fin de la tâche en cours      |

## Passer un pool entre threads

L'objet `ThreadPool` est lui-même thread-safe : il peut être passé dans `spawn_thread()` via `use()`,
et n'importe quel thread peut appeler `submit()` sur le même pool.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    // Créer le pool une fois dans le thread principal
    $pool = new ThreadPool(workers: 4);

    // Lancer un thread OS qui utilisera également le pool
    $producer = spawn_thread(function() use ($pool) {
        $futures = [];
        for ($i = 0; $i < 10; $i++) {
            $futures[] = $pool->submit(function() use ($i) {
                return $i * $i;
            });
        }
        $results = [];
        foreach ($futures as $f) {
            $results[] = await($f);
        }
        return $results;
    });

    $squares = await($producer);
    echo implode(', ', $squares), "\n";

    $pool->close();
});
```

```
0, 1, 4, 9, 16, 25, 36, 49, 64, 81
```

Cela permet des architectures où plusieurs threads OS ou coroutines **partagent un seul pool**,
en y soumettant des tâches indépendamment les uns des autres.

## Exemple complet : traitement d'images en parallèle

Le pool est créé une fois. Chaque travailleur reçoit un chemin de fichier, ouvre l'image via GD,
la réduit aux dimensions spécifiées, la convertit en niveaux de gris et la sauvegarde dans le répertoire de sortie.
Le thread principal collecte les résultats au fur et à mesure qu'ils sont prêts.

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

// Cette fonction est exécutée dans un thread de travail.
// Les opérations GD sont liées au CPU — exactement le type de tâches qui bénéficient des threads.
function processImage(string $src, string $outDir, int $maxWidth): array
{
    $info = getimagesize($src);
    if ($info === false) {
        throw new \RuntimeException("Failed to read: $src");
    }

    // Ouvrir la source
    $original = match ($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_PNG  => imagecreatefrompng($src),
        IMAGETYPE_WEBP => imagecreatefromwebp($src),
        default        => throw new \RuntimeException("Unsupported format: $src"),
    };

    // Redimensionner en préservant le rapport d'aspect
    [$origW, $origH] = [$info[0], $info[1]];
    $scale    = min(1.0, $maxWidth / $origW);
    $newW     = (int) ($origW * $scale);
    $newH     = (int) ($origH * $scale);
    $resized  = imagescale($original, $newW, $newH, IMG_BICUBIC);
    imagedestroy($original);

    // Convertir en niveaux de gris
    imagefilter($resized, IMG_FILTER_GRAYSCALE);

    // Sauvegarder dans le répertoire de sortie
    $outPath = $outDir . '/' . basename($src, '.' . pathinfo($src, PATHINFO_EXTENSION)) . '_thumb.jpg';
    imagejpeg($resized, $outPath, quality: 85);
    $outSize = filesize($outPath);
    imagedestroy($resized);

    return [
        'src'     => $src,
        'out'     => $outPath,
        'size_kb' => round($outSize / 1024, 1),
        'width'   => $newW,
        'height'  => $newH,
    ];
}

spawn(function() {
    $srcDir  = '/var/www/uploads/originals';
    $outDir  = '/var/www/uploads/thumbs';
    $maxW    = 800;

    // Liste des fichiers à traiter
    $files = glob("$srcDir/*.{jpg,jpeg,png,webp}", GLOB_BRACE);
    if (empty($files)) {
        echo "No files to process\n";
        return;
    }

    $pool = new ThreadPool(workers: (int) shell_exec('nproc') ?: 4);

    // map() préserve l'ordre — results[i] correspond à files[i]
    $results = $pool->map($files, fn(string $path) => processImage($path, $outDir, $maxW));

    $totalKb = 0;
    foreach ($results as $r) {
        echo sprintf("%-40s → %s  (%dx%d, %.1f KB)\n",
            basename($r['src']), basename($r['out']),
            $r['width'], $r['height'], $r['size_kb']
        );
        $totalKb += $r['size_kb'];
    }

    echo sprintf("\nProcessed: %d files, total %.1f KB\n", count($results), $totalKb);
    $pool->close();
});
```

```
photo_001.jpg                            → photo_001_thumb.jpg  (800x533, 42.3 KB)
photo_002.png                            → photo_002_thumb.jpg  (800x600, 38.7 KB)
photo_003.jpg                            → photo_003_thumb.jpg  (800x450, 51.2 KB)
...
Processed: 20 files, total 876.4 KB
```

## Voir aussi

- [`spawn_thread()`](/fr/docs/reference/spawn-thread.html) — lancer une seule tâche dans un thread séparé
- [`Async\Thread`](/fr/docs/components/threads.html) — threads OS et règles de transfert de données
- [`Async\ThreadChannel`](/fr/docs/components/thread-channels.html) — canaux thread-safe
- [`Async\Future`](/fr/docs/components/future.html) — attente du résultat d'une tâche
