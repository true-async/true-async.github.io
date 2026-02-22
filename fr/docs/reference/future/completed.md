---
layout: docs
lang: fr
path_key: "/docs/reference/future/completed.html"
nav_active: docs
permalink: /fr/docs/reference/future/completed.html
page_title: "Future::completed"
description: "Crée un Future déjà complété avec un résultat."
---

# Future::completed

(PHP 8.6+, True Async 1.0)

```php
public static function completed(mixed $value = null): Future
```

Crée un `Future` déjà complété avec la valeur spécifiée. C'est une méthode de fabrique qui retourne un `Future` contenant immédiatement un résultat. Utile pour retourner une valeur déjà connue depuis des fonctions qui retournent un `Future`.

## Paramètres

`value` — la valeur avec laquelle le Future sera complété. Par défaut `null`.

## Valeur de retour

`Future` — un Future complété avec la valeur spécifiée.

## Exemples

### Exemple #1 Création d'un Future avec une valeur prête

```php
<?php

use Async\Future;

$future = Future::completed(42);

var_dump($future->isCompleted()); // bool(true)
var_dump($future->await());       // int(42)
```

### Exemple #2 Utilisation dans une fonction qui retourne un Future

```php
<?php

use Async\Future;

function fetchData(string $key): Future {
    // If data is in cache, return immediately
    $cached = getFromCache($key);
    if ($cached !== null) {
        return Future::completed($cached);
    }

    // Otherwise start an async operation
    return \Async\async(function() use ($key) {
        return loadFromDatabase($key);
    });
}

$result = fetchData('user:1')->await();
echo "Result: $result\n";
```

## Voir aussi

- [Future::failed](/fr/docs/reference/future/failed.html) — Créer un Future avec une erreur
- [Future::__construct](/fr/docs/reference/future/construct.html) — Créer un Future via FutureState
- [Future::await](/fr/docs/reference/future/await.html) — Attendre le résultat
