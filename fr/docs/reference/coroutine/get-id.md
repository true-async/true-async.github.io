---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/get-id.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/get-id.html
page_title: "Coroutine::getId"
description: "Obtenir l'identifiant unique d'une coroutine."
---

# Coroutine::getId

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getId(): int
```

Retourne l'identifiant entier unique de la coroutine. L'identifiant est unique au sein du processus PHP courant.

## Valeur de retour

`int` -- identifiant unique de la coroutine.

## Exemples

### Exemple #1 Utilisation de base

```php
<?php

use function Async\spawn;

$coroutine1 = spawn(function() {
    return "task 1";
});

$coroutine2 = spawn(function() {
    return "task 2";
});

$id1 = $coroutine1->getId();
$id2 = $coroutine2->getId();

var_dump(is_int($id1));     // bool(true)
var_dump($id1 !== $id2);    // bool(true)
```

### Exemple #2 Journalisation avec identifiant

```php
<?php

use function Async\spawn;

function loggedTask(string $name): \Async\Coroutine {
    return spawn(function() use ($name) {
        $id = \Async\current_coroutine()->getId();
        echo "[coro:$id] Task '$name' started\n";
        \Async\delay(1000);
        echo "[coro:$id] Task '$name' completed\n";
    });
}
```

## Voir aussi

- [Coroutine::getSpawnLocation](/fr/docs/reference/coroutine/get-spawn-location.html) -- Emplacement de création de la coroutine
- [current_coroutine()](/fr/docs/reference/current-coroutine.html) -- Obtenir la coroutine courante
