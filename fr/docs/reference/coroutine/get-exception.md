---
layout: docs
lang: fr
path_key: "/docs/reference/coroutine/get-exception.html"
nav_active: docs
permalink: /fr/docs/reference/coroutine/get-exception.html
page_title: "Coroutine::getException"
description: "Obtenir l'exception survenue dans une coroutine."
---

# Coroutine::getException

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getException(): mixed
```

Retourne l'exception survenue dans la coroutine. Si la coroutine s'est terminée avec succès ou n'est pas encore terminée, retourne `null`. Si la coroutine a été annulée, retourne un objet `AsyncCancellation`.

## Valeur de retour

`mixed` -- l'exception ou `null`.

- `null` -- si la coroutine n'est pas terminée ou s'est terminée avec succès
- `Throwable` -- si la coroutine s'est terminée avec une erreur
- `AsyncCancellation` -- si la coroutine a été annulée

## Erreurs

Lance une `RuntimeException` si la coroutine est en cours d'exécution.

## Exemples

### Exemple #1 Terminaison réussie

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "success";
});

await($coroutine);
var_dump($coroutine->getException()); // NULL
```

### Exemple #2 Terminaison avec erreur

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    throw new RuntimeException("test error");
});

try {
    await($coroutine);
} catch (RuntimeException $e) {
    // Interceptée lors de l'await
}

$exception = $coroutine->getException();
var_dump($exception instanceof RuntimeException); // bool(true)
var_dump($exception->getMessage());                // string(10) "test error"
```

### Exemple #3 Coroutine annulée

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();
$coroutine->cancel();
suspend();

$exception = $coroutine->getException();
var_dump($exception instanceof \Async\AsyncCancellation); // bool(true)
```

## Voir aussi

- [Coroutine::getResult](/fr/docs/reference/coroutine/get-result.html) -- Obtenir le résultat
- [Coroutine::isCancelled](/fr/docs/reference/coroutine/is-cancelled.html) -- Vérifier l'annulation
- [Exceptions](/fr/docs/components/exceptions.html) -- Gestion des erreurs
