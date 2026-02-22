---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/on-finally.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/on-finally.html
page_title: "Coroutine::finally"
description: "Enregistrer un gestionnaire appelé à la terminaison de la coroutine."
---

# Coroutine::finally

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::finally(\Closure $callback): void
```

Enregistre une fonction de rappel qui sera appelée lorsque la coroutine se termine, quel que soit le résultat (succès, erreur ou annulation).

Si la coroutine est déjà terminée au moment de l'appel de `finally()`, le callback s'exécutera immédiatement.

Plusieurs gestionnaires peuvent être enregistrés -- ils s'exécutent dans l'ordre dans lequel ils ont été ajoutés.

## Paramètres

**callback**
: La fonction gestionnaire. Reçoit l'objet coroutine comme argument.

## Exemples

### Exemple #1 Utilisation de base

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

$coroutine->finally(function() {
    echo "Coroutine completed\n";
});

await($coroutine);
```

### Exemple #2 Nettoyage des ressources

```php
<?php

use function Async\spawn;
use function Async\await;

$connection = connectToDatabase();

$coroutine = spawn(function() use ($connection) {
    return $connection->query('SELECT * FROM users');
});

$coroutine->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$result = await($coroutine);
```

### Exemple #3 Gestionnaires multiples

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "done");

$coroutine->finally(fn() => echo "Handler 1\n");
$coroutine->finally(fn() => echo "Handler 2\n");
$coroutine->finally(fn() => echo "Handler 3\n");

await($coroutine);
// Sortie :
// Handler 1
// Handler 2
// Handler 3
```

### Exemple #4 Enregistrement après la terminaison

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => 42);
await($coroutine);

// La coroutine est déjà terminée -- le callback s'exécute immédiatement
$coroutine->finally(function() {
    echo "Called immediately\n";
});
```

## Voir aussi

- [Coroutine::isCompleted](/fr/docs/reference/coroutine/is-completed.html) -- Vérifier la terminaison
- [Coroutine::getResult](/fr/docs/reference/coroutine/get-result.html) -- Obtenir le résultat
