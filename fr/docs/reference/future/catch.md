---
layout: docs
lang: fr
path_key: "/docs/reference/future/catch.html"
nav_active: docs
permalink: /fr/docs/reference/future/catch.html
page_title: "Future::catch"
description: "Gérer une erreur du Future."
---

# Future::catch

(PHP 8.6+, True Async 1.0)

```php
public function catch(callable $catch): Future
```

Enregistre un gestionnaire d'erreur pour le `Future`. Le callback est invoqué si le Future s'est terminé avec une exception. Si le callback retourne une valeur, celle-ci devient le résultat du nouveau Future. Si le callback lève une exception, le nouveau Future se termine avec cette erreur.

## Paramètres

`catch` — la fonction de gestion d'erreur. Reçoit un `Throwable`, peut retourner une valeur de récupération. Signature : `function(\Throwable $e): mixed`.

## Valeur de retour

`Future` — un nouveau Future avec le résultat de la gestion d'erreur, ou avec la valeur originale s'il n'y a pas eu d'erreur.

## Exemples

### Exemple #1 Gestion d'erreur avec récupération

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Service unavailable"))
    ->catch(function(\Throwable $e) {
        echo "Error: " . $e->getMessage() . "\n";
        return "default value"; // Recovery
    });

$result = $future->await();
echo $result; // default value
```

### Exemple #2 Capture d'erreurs dans les opérations asynchrones

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    $response = httpGet('https://api.example.com/users');
    if ($response->status !== 200) {
        throw new \RuntimeException("HTTP error: {$response->status}");
    }
    return json_decode($response->body, true);
})
->catch(function(\Throwable $e) {
    // Log the error and return an empty array
    error_log("API error: " . $e->getMessage());
    return [];
})
->map(function(array $users) {
    return count($users);
});

$count = $future->await();
echo "Users found: $count\n";
```

## Voir aussi

- [Future::map](/fr/docs/reference/future/map.html) — Transformer le résultat du Future
- [Future::finally](/fr/docs/reference/future/finally.html) — Callback à la complétion du Future
- [Future::ignore](/fr/docs/reference/future/ignore.html) — Ignorer les erreurs non gérées
