---
layout: docs
lang: fr
path_key: "/docs/reference/suspend.html"
nav_active: docs
permalink: /fr/docs/reference/suspend.html
page_title: "suspend()"
description: "suspend() — suspendre l'exécution de la coroutine courante. Documentation complète : exemples de multitâche coopératif."
---

# suspend

(PHP 8.6+, True Async 1.0)

`suspend()` — Suspend l'exécution de la coroutine courante

## Description

```php
suspend: void
```

Suspend l'exécution de la coroutine courante et cède le contrôle au planificateur.
L'exécution de la coroutine sera reprise ultérieurement lorsque le planificateur décidera de la relancer.

`suspend()` est une fonction fournie par l'extension True Async.

## Paramètres

Cette construction n'a pas de paramètres.

## Valeurs de retour

La fonction ne retourne pas de valeur.

## Exemples

### Exemple #1 Utilisation basique de suspend

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Before suspend\n";
    suspend();
    echo "After suspend\n";
});

echo "Main code\n";
?>
```

**Sortie :**
```
Before suspend
Main code
After suspend
```

### Exemple #2 Plusieurs suspensions

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 3; $i++) {
        echo "Iteration $i\n";
        suspend();
    }
});

echo "Coroutine started\n";
?>
```

**Sortie :**
```
Iteration 1
Coroutine started
Iteration 2
Iteration 3
```

### Exemple #3 Multitâche coopératif

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine A: $i\n";
        suspend(); // Donner aux autres coroutines une chance de s'exécuter
    }
});

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine B: $i\n";
        suspend();
    }
});
?>
```

**Sortie :**
```
Coroutine A: 1
Coroutine B: 1
Coroutine A: 2
Coroutine B: 2
Coroutine A: 3
Coroutine B: 3
...
```

### Exemple #4 Cession explicite du contrôle

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Starting long work\n";

    for ($i = 0; $i < 1000000; $i++) {
        // Calculs

        if ($i % 100000 === 0) {
            suspend(); // Céder périodiquement le contrôle
        }
    }

    echo "Work completed\n";
});

spawn(function() {
    echo "Other coroutine is also working\n";
});
?>
```

### Exemple #5 suspend depuis des fonctions imbriquées

`suspend()` fonctionne depuis n'importe quelle profondeur d'appel — il n'est pas nécessaire de l'appeler directement depuis la coroutine :

```php
<?php
use function Async\spawn;

function nestedSuspend() {
    echo "Nested function: before suspend\n";
    suspend();
    echo "Nested function: after suspend\n";
}

function deeplyNested() {
    echo "Deep call: start\n";
    nestedSuspend();
    echo "Deep call: end\n";
}

spawn(function() {
    echo "Coroutine: before nested call\n";
    deeplyNested();
    echo "Coroutine: after nested call\n";
});

spawn(function() {
    echo "Other coroutine: working\n";
});
?>
```

**Sortie :**
```
Coroutine: before nested call
Deep call: start
Nested function: before suspend
Other coroutine: working
Nested function: after suspend
Deep call: end
Coroutine: after nested call
```

### Exemple #6 suspend dans une boucle d'attente

```php
<?php
use function Async\spawn;

$ready = false;

spawn(function() use (&$ready) {
    // Attendre que le drapeau devienne true
    while (!$ready) {
        suspend(); // Céder le contrôle
    }

    echo "Condition met!\n";
});

spawn(function() use (&$ready) {
    echo "Preparing...\n";
    Async\sleep(2000);
    $ready = true;
    echo "Ready!\n";
});
?>
```

**Sortie :**
```
Preparing...
Ready!
Condition met!
```

## Notes

> **Note :** `suspend()` est une fonction. L'appeler comme `suspend` (sans parenthèses) est incorrect.

> **Note :** Dans TrueAsync, tout le code en cours d'exécution est traité comme une coroutine,
> donc `suspend()` peut être appelée n'importe où (y compris dans le script principal).

> **Note :** Après l'appel à `suspend()`, l'exécution de la coroutine ne reprendra pas immédiatement,
> mais lorsque le planificateur décidera de la relancer. L'ordre de reprise des coroutines n'est pas garanti.

> **Note :** Dans la plupart des cas, l'utilisation explicite de `suspend()` n'est pas nécessaire.
> Les coroutines sont automatiquement suspendues lors des opérations d'E/S
> (lecture de fichiers, requêtes réseau, etc.).

> **Note :** L'utilisation de `suspend()`
> dans des boucles infinies sans opérations d'E/S peut entraîner une utilisation élevée du CPU.
> Vous pouvez également utiliser `Async\timeout()`.

## Journal des modifications

| Version   | Description                           |
|-----------|---------------------------------------|
| 1.0.0     | Ajout de la fonction `suspend()`     |

## Voir aussi

- [spawn()](/fr/docs/reference/spawn.html) - Lancement d'une coroutine
- [await()](/fr/docs/reference/await.html) - Attente du résultat d'une coroutine
