---
layout: docs
lang: fr
path_key: "/docs/reference/current-coroutine.html"
nav_active: docs
permalink: /fr/docs/reference/current-coroutine.html
page_title: "current_coroutine()"
description: "current_coroutine() — obtenir l'objet de la coroutine en cours d'exécution."
---

# current_coroutine

(PHP 8.6+, True Async 1.0)

`current_coroutine()` — Retourne l'objet de la coroutine en cours d'exécution.

## Description

```php
current_coroutine(): Async\Coroutine
```

## Valeurs de retour

Un objet `Async\Coroutine` représentant la coroutine courante.

## Erreurs/Exceptions

`Async\AsyncException` — si appelée en dehors d'une coroutine.

## Exemples

### Exemple #1 Obtenir l'identifiant de la coroutine

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();
    echo "Coroutine #" . $coro->getId() . "\n";
});
?>
```

### Exemple #2 Diagnostics

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();

    echo "Spawned from: " . $coro->getSpawnLocation() . "\n";
    echo "Status: " . ($coro->isRunning() ? 'running' : 'suspended') . "\n";
});
?>
```

## Voir aussi

- [get_coroutines()](/fr/docs/reference/get-coroutines.html) — Liste de toutes les coroutines
- [Coroutines](/fr/docs/components/coroutines.html) — Le concept de coroutine
