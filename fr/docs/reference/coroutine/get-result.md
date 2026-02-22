---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/get-result.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/get-result.html
page_title: "Coroutine::getResult"
description: "Obtenir le résultat de l'exécution d'une coroutine."
---

# Coroutine::getResult

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getResult(): mixed
```

Retourne le résultat de l'exécution de la coroutine. Si la coroutine n'est pas encore terminée, retourne `null`.

**Important :** cette méthode n'attend pas la fin de la coroutine. Utilisez `await()` pour l'attente.

## Valeur de retour

`mixed` -- le résultat de la coroutine ou `null` si la coroutine n'est pas encore terminée.

## Exemples

### Exemple #1 Utilisation de base

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

// Avant la terminaison
var_dump($coroutine->getResult()); // NULL

// Attendre la terminaison
await($coroutine);

var_dump($coroutine->getResult()); // string(11) "test result"
```

### Exemple #2 Vérification avec isCompleted()

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(fn() => 42);

suspend(); // laisser la coroutine se terminer

if ($coroutine->isCompleted()) {
    echo "Result: " . $coroutine->getResult() . "\n";
}
```

## Voir aussi

- [Coroutine::getException](/fr/docs/reference/coroutine/get-exception.html) -- Obtenir l'exception
- [Coroutine::isCompleted](/fr/docs/reference/coroutine/is-completed.html) -- Vérifier la terminaison
- [await()](/fr/docs/reference/await.html) -- Attendre le résultat
