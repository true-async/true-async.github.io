---
layout: docs
lang: fr
path_key: "/docs/reference/future/map.html"
nav_active: docs
permalink: /fr/docs/reference/future/map.html
page_title: "Future::map"
description: "Transformer le résultat du Future."
---

# Future::map

(PHP 8.6+, True Async 1.0)

```php
public function map(callable $map): Future
```

Transforme le résultat du `Future` à l'aide d'une fonction callback. Le callback reçoit la valeur du Future complété et retourne une nouvelle valeur. Analogue à `then()` dans les API basées sur les Promises. Si le Future original s'est terminé avec une erreur, le callback n'est pas invoqué et l'erreur est transmise au nouveau Future.

## Paramètres

`map` — la fonction de transformation. Reçoit le résultat du Future, retourne une nouvelle valeur. Signature : `function(mixed $value): mixed`.

## Valeur de retour

`Future` — un nouveau Future contenant le résultat transformé.

## Exemples

### Exemple #1 Transformation du résultat

```php
<?php

use Async\Future;

$future = Future::completed(5)
    ->map(fn(int $x) => $x * 2)
    ->map(fn(int $x) => "Result: $x");

echo $future->await(); // Result: 10
```

### Exemple #2 Chaîne de transformations pour le chargement asynchrone

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return file_get_contents('https://api.example.com/data');
})
->map(fn(string $json) => json_decode($json, true))
->map(fn(array $data) => $data['users'])
->map(fn(array $users) => count($users));

$count = $future->await();
echo "Number of users: $count\n";
```

## Voir aussi

- [Future::catch](/fr/docs/reference/future/catch.html) — Gérer une erreur du Future
- [Future::finally](/fr/docs/reference/future/finally.html) — Callback à la complétion du Future
- [Future::await](/fr/docs/reference/future/await.html) — Attendre le résultat
