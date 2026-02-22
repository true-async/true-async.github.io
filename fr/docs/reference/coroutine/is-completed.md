---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/is-completed.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/is-completed.html
page_title: "Coroutine::isCompleted"
description: "Vérifier si la coroutine est terminée."
---

# Coroutine::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCompleted(): bool
```

Vérifie si la coroutine a fini son exécution. Une coroutine est considérée comme terminée en cas de terminaison réussie, de terminaison avec erreur ou d'annulation.

## Valeur de retour

`bool` -- `true` si la coroutine a fini son exécution.

## Exemples

### Exemple #1 Vérification de la terminaison

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isCompleted()); // bool(false)

await($coroutine);

var_dump($coroutine->isCompleted()); // bool(true)
```

### Exemple #2 Vérification non bloquante de la disponibilité

```php
<?php

use function Async\spawn;
use function Async\suspend;

$tasks = [
    spawn(fn() => file_get_contents('https://api1.example.com')),
    spawn(fn() => file_get_contents('https://api2.example.com')),
];

// Attendre que toutes soient terminées
while (true) {
    $allDone = true;
    foreach ($tasks as $task) {
        if (!$task->isCompleted()) {
            $allDone = false;
            break;
        }
    }
    if ($allDone) break;
    suspend();
}
```

## Voir aussi

- [Coroutine::getResult](/fr/docs/reference/coroutine/get-result.html) -- Obtenir le résultat
- [Coroutine::getException](/fr/docs/reference/coroutine/get-exception.html) -- Obtenir l'exception
- [Coroutine::isCancelled](/fr/docs/reference/coroutine/is-cancelled.html) -- Vérifier l'annulation
