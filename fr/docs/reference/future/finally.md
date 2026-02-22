---
layout: docs
lang: fr
path_key: "/docs/reference/future/finally.html"
nav_active: docs
permalink: /fr/docs/reference/future/finally.html
page_title: "Future::finally"
description: "Callback qui s'exécute toujours à la complétion du Future."
---

# Future::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(callable $finally): Future
```

Enregistre un callback qui s'exécute lorsque le `Future` se termine, quel que soit le résultat --- succès, erreur ou annulation. Le Future se résout avec la même valeur ou erreur que l'original. Utile pour libérer des ressources.

## Paramètres

`finally` — la fonction à exécuter à la complétion. Ne prend aucun argument. Signature : `function(): void`.

## Valeur de retour

`Future` — un nouveau Future qui se terminera avec la même valeur ou erreur que l'original.

## Exemples

### Exemple #1 Libération de ressources

```php
<?php

use Async\Future;

$connection = openDatabaseConnection();

$future = \Async\async(function() use ($connection) {
    return $connection->query("SELECT * FROM users");
})
->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$users = $future->await();
```

### Exemple #2 Chaînage avec map, catch et finally

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return fetchDataFromApi();
})
->map(fn($data) => processData($data))
->catch(function(\Throwable $e) {
    error_log("Error: " . $e->getMessage());
    return [];
})
->finally(function() {
    echo "Operation completed\n";
});

$result = $future->await();
```

## Voir aussi

- [Future::map](/fr/docs/reference/future/map.html) — Transformer le résultat du Future
- [Future::catch](/fr/docs/reference/future/catch.html) — Gérer une erreur du Future
- [Future::ignore](/fr/docs/reference/future/ignore.html) — Ignorer les erreurs non gérées
