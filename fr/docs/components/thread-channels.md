---
layout: docs
lang: fr
path_key: "/docs/components/thread-channels.html"
nav_active: docs
permalink: /fr/docs/components/thread-channels.html
page_title: "Async\\ThreadChannel"
description: "Async\\ThreadChannel — un canal thread-safe pour transmettre des données entre les threads OS dans TrueAsync."
---

# Async\ThreadChannel : canaux entre threads OS

## Différence avec un Channel ordinaire

`Async\Channel` fonctionne **au sein d'un seul thread** — entre les coroutines du même planificateur. Ses données résident en **mémoire locale au thread**, et la sécurité est garantie par le fait qu'une seule coroutine accède au canal à la fois.

`Async\ThreadChannel` est conçu pour transmettre des données **entre threads OS**. Le tampon du canal réside en **mémoire partagée** accessible à tous les threads, et non dans la mémoire d'un thread particulier. Chaque valeur envoyée est copiée en profondeur dans cette mémoire partagée, et côté récepteur — de nouveau dans la mémoire locale du thread. La synchronisation s'effectue via un mutex thread-safe, de sorte que `send()` et `recv()` peuvent être appelés depuis différents threads OS de manière concurrente.

| Propriété                          | `Async\Channel`                          | `Async\ThreadChannel`                           |
|------------------------------------|------------------------------------------|-------------------------------------------------|
| Portée                             | Thread OS unique                         | Entre threads OS                                |
| Emplacement des données tamponnées | Mémoire locale au thread                 | Mémoire partagée visible de tous les threads    |
| Synchronisation                    | Planificateur de coroutines (coopératif) | Mutex (thread-safe)                             |
| Rendez-vous (capacity=0)           | Supporté                                 | Non — toujours en mode tamponné                 |
| Capacité minimale                  | 0                                        | 1                                               |

Si tout s'exécute dans un seul thread — utilisez `Async\Channel`, c'est plus léger. `ThreadChannel` n'est utile que lorsqu'un véritable échange de données entre threads OS est nécessaire.

## Création d'un canal

```php
use Async\ThreadChannel;

$ch = new ThreadChannel(capacity: 16);
```

**`capacity`** — taille du tampon (minimum `1`). Des valeurs plus grandes absorbent mieux les pics de production, mais consomment davantage de mémoire pour la file d'attente active.

## Exemple de base : producteur + consommateur

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $ch = new ThreadChannel(capacity: 4);

    // Producteur — un thread OS séparé
    $producer = spawn_thread(function() use ($ch) {
        for ($i = 1; $i <= 5; $i++) {
            $ch->send("item-$i");
        }
        $ch->close();
    });

    // Consommateur — dans le thread principal (une coroutine)
    try {
        while (true) {
            $msg = $ch->recv();
            echo "reçu: ", $msg, "\n";
        }
    } catch (Async\ThreadChannelException $e) {
        echo "canal fermé\n";
    }

    await($producer);
});
```

```
reçu: item-1
reçu: item-2
reçu: item-3
reçu: item-4
reçu: item-5
canal fermé
```

Le producteur écrit dans le canal depuis un thread séparé ; le thread principal lit via `recv()` — rien de particulier, cela ressemble exactement à un `Channel` ordinaire.

## send / recv

### `send($value[, $cancellation])`

Envoie une valeur dans le canal. Si le tampon est plein — **suspend la coroutine courante** (suspension coopérative — les autres coroutines de ce planificateur continuent de s'exécuter) jusqu'à ce qu'un autre thread libère de l'espace.

La valeur est **copiée en profondeur dans la mémoire partagée du canal** selon les mêmes règles que les variables capturées via `use(...)` dans `spawn_thread()`. Les objets avec des propriétés dynamiques, les références PHP et les ressources sont rejetés avec `Async\ThreadTransferException`.

```php
$ch->send(['user' => 'alice', 'id' => 42]);   // tableau
$ch->send(new Point(3, 4));                    // objet avec propriétés déclarées
$ch->send($futureState);                       // Async\FutureState (une seule fois !)
```

Si le canal est déjà fermé — `send()` lève `Async\ThreadChannelException`.

### `recv([$cancellation])`

Lit une valeur depuis le canal. Si le tampon est vide — suspend la coroutine courante jusqu'à l'arrivée de données **ou** la fermeture du canal.

- Si des données arrivent — retourne la valeur.
- Si le canal est fermé et le tampon est vide — lève `Async\ThreadChannelException`.
- Si le canal est fermé mais que le tampon contient encore des éléments — **vide les données restantes en premier**, en ne levant `ThreadChannelException` qu'une fois le tampon vide.

Cela permet de vider correctement un canal après sa fermeture.

## État du canal

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;

spawn(function() {
    $ch = new ThreadChannel(capacity: 3);

    echo "capacité: ", $ch->capacity(), "\n";
    echo "vide: ", ($ch->isEmpty() ? "oui" : "non"), "\n";

    $ch->send('a');
    $ch->send('b');

    echo "nombre après 2 envois: ", count($ch), "\n";
    echo "plein: ", ($ch->isFull() ? "oui" : "non"), "\n";

    $ch->send('c');
    echo "plein après 3: ", ($ch->isFull() ? "oui" : "non"), "\n";

    $got = [];
    while (!$ch->isEmpty()) {
        $got[] = $ch->recv();
    }
    echo "vidé: ", implode(',', $got), "\n";

    $ch->close();
    echo "fermé: ", ($ch->isClosed() ? "oui" : "non"), "\n";
});
```

```
capacité: 3
vide: oui
nombre après 2 envois: 2
plein: non
plein après 3: oui
vidé: a,b,c
fermé: oui
```

| Méthode        | Retourne                                               |
|----------------|--------------------------------------------------------|
| `capacity()`   | Taille du tampon définie dans le constructeur          |
| `count()`      | Nombre actuel de messages dans le tampon               |
| `isEmpty()`    | `true` si le tampon est vide                           |
| `isFull()`     | `true` si le tampon est rempli jusqu'à la capacité     |
| `isClosed()`   | `true` si le canal a été fermé                         |

`ThreadChannel` implémente `Countable`, donc `count($ch)` fonctionne.

## close()

```php
$ch->close();
```

Après la fermeture :

- `send()` lève immédiatement `Async\ThreadChannelException`.
- `recv()` **vide les valeurs restantes**, puis commence à lever `ThreadChannelException`.
- Toutes les coroutines/threads suspendus dans `send()` ou `recv()` sont **réveillés** avec `ThreadChannelException`.

Un canal ne peut être fermé qu'une seule fois. Un appel répété est une opération sans effet et sans danger.

## Modèle : pool de workers

Deux canaux — un pour les tâches, un pour les résultats. Les threads workers lisent les tâches du premier et placent les résultats dans le second.

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $jobs    = new ThreadChannel(capacity: 16);
    $results = new ThreadChannel(capacity: 16);

    // 3 threads workers
    $workers = [];
    for ($i = 1; $i <= 3; $i++) {
        $workers[] = spawn_thread(function() use ($jobs, $results, $i) {
            try {
                while (true) {
                    $n = $jobs->recv();
                    // Simuler une charge CPU
                    $x = 0;
                    for ($k = 0; $k < 2_000_000; $k++) {
                        $x += sqrt($k);
                    }
                    $results->send(['worker' => $i, 'n' => $n]);
                }
            } catch (Async\ThreadChannelException $e) {
                // canal jobs fermé — le worker se termine
            }
        });
    }

    // Distribuer 6 tâches
    for ($n = 1; $n <= 6; $n++) {
        $jobs->send($n);
    }
    $jobs->close();

    // Attendre que tous les threads workers se terminent
    foreach ($workers as $w) {
        await($w);
    }
    $results->close();

    // Vider les résultats
    $by = [];
    while (!$results->isEmpty()) {
        $r = $results->recv();
        $by[$r['worker']] = ($by[$r['worker']] ?? 0) + 1;
    }
    ksort($by);
    foreach ($by as $w => $n) {
        echo "worker-$w a traité $n\n";
    }
});
```

```
worker-1 processed 2
worker-2 processed 2
worker-3 processed 2
```

Chaque worker a traité 2 tâches — la charge a été répartie entre les trois threads.

### Note sur la distribution

Si le producteur écrit dans le canal plus vite que les workers ne lisent (ou si les workers passent quasiment aucun temps CPU), **le premier worker peut récupérer toutes les tâches** immédiatement, car son `recv()` se réveille en premier et prend le message suivant avant que les autres workers n'atteignent leur `recv()`. C'est un comportement normal pour une file d'attente concurrente — un ordonnancement équitable n'est pas garanti.

Si une uniformité stricte est requise — partitionnez les tâches en amont (partitionnement par hachage), ou donnez à chaque worker son propre canal dédié.

## Transmission de données complexes via le canal

`ThreadChannel` peut transporter tout ce que le transfert de données inter-threads supporte (voir [Transmission de données entre threads](/fr/docs/components/threads.html#passing-data-between-threads)) :

- scalaires, tableaux, objets avec propriétés déclarées
- `Closure` (fermetures)
- `WeakReference` et `WeakMap` (avec les mêmes règles de propriétaire fort que dans `spawn_thread`)
- `Async\FutureState` (une seule fois)

Chaque appel à `send()` est une opération indépendante avec sa propre table d'identité. **L'identité est préservée au sein d'un seul message**, mais pas entre des appels `send()` distincts. Si vous voulez que deux récepteurs voient « le même » objet — envoyez-le une seule fois dans un tableau, pas comme deux messages séparés.

## Limitations

- **La capacité minimale est 1.** Le rendez-vous (capacity=0) n'est pas supporté, contrairement à `Async\Channel`.
- **`ThreadChannel` ne supporte pas la sérialisation.** Les objets canal ne peuvent pas être sauvegardés dans un fichier ou envoyés sur le réseau — un canal n'existe que dans un processus actif.
- **Un handle de canal peut être transmis** via `spawn_thread` ou imbriqué dans un autre canal — le handle d'objet pour `ThreadChannel` se transfère correctement, et les deux côtés voient le même tampon interne.

## Voir aussi

- [`Async\Thread`](/fr/docs/components/threads.html) — threads OS dans TrueAsync
- [`spawn_thread()`](/fr/docs/reference/spawn-thread.html) — démarrer une fermeture dans un nouveau thread
- [`Async\Channel`](/fr/docs/components/channels.html) — canaux entre coroutines dans le même thread
