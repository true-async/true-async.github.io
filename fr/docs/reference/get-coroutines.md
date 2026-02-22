---
layout: docs
lang: fr
path_key: "/docs/reference/get-coroutines.html"
nav_active: docs
permalink: /fr/docs/reference/get-coroutines.html
page_title: "get_coroutines()"
description: "get_coroutines() — obtenir la liste de toutes les coroutines actives pour le diagnostic."
---

# get_coroutines

(PHP 8.6+, True Async 1.0)

`get_coroutines()` — Retourne un tableau de toutes les coroutines actives. Utile pour le diagnostic et la surveillance.

## Description

```php
get_coroutines(): array
```

## Valeurs de retour

Un tableau d'objets `Async\Coroutine` — toutes les coroutines enregistrées dans la requête courante.

## Exemples

### Exemple #1 Surveillance des coroutines

```php
<?php
use function Async\spawn;
use function Async\get_coroutines;
use function Async\delay;

spawn(function() { delay(10000); });
spawn(function() { delay(10000); });

// Laisser les coroutines démarrer
delay(10);

foreach (get_coroutines() as $coro) {
    echo sprintf(
        "Coroutine #%d: %s, spawned at %s\n",
        $coro->getId(),
        $coro->isSuspended() ? 'suspended' : 'running',
        $coro->getSpawnLocation()
    );
}
?>
```

### Exemple #2 Détection de fuites

```php
<?php
use function Async\get_coroutines;

// À la fin d'une requête, vérifier les coroutines non terminées
$active = get_coroutines();
if (count($active) > 0) {
    foreach ($active as $coro) {
        error_log("Unfinished coroutine: " . $coro->getSpawnLocation());
    }
}
?>
```

## Voir aussi

- [current_coroutine()](/fr/docs/reference/current-coroutine.html) — Coroutine courante
- [Coroutines](/fr/docs/components/coroutines.html) — Le concept de coroutine
