---
layout: docs
lang: fr
path_key: "/docs/reference/spawn.html"
nav_active: docs
permalink: /fr/docs/reference/spawn.html
page_title: "spawn()"
description: "spawn() — lancer une fonction dans une nouvelle coroutine. Documentation complète : paramètres, valeur de retour, exemples."
---

# spawn

(PHP 8.6+, True Async 1.0)

`spawn()` — Lance une fonction pour exécution dans une nouvelle coroutine. Crée une coroutine.

## Description

```php
spawn(callable $callback, mixed ...$args): Async\Coroutine
```

Crée et démarre une nouvelle coroutine. La coroutine sera exécutée de manière asynchrone.

## Paramètres

**`callback`**
Une fonction ou closure à exécuter dans la coroutine. Peut être n'importe quel type callable valide.

**`args`**
Paramètres optionnels passés au `callback`. Les paramètres sont passés par valeur.

## Valeurs de retour

Retourne un objet `Async\Coroutine` représentant la coroutine lancée. L'objet peut être utilisé pour :
- Obtenir le résultat via `await()`
- Annuler l'exécution via `cancel()`
- Vérifier l'état de la coroutine

## Exemples

### Exemple #1 Utilisation basique de spawn()

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchData(string $url): string {
    return file_get_contents($url);
}

$coroutine = spawn(fetchData(...), 'https://php.net');

// La coroutine s'exécute de manière asynchrone
echo "Coroutine started\n";

$result = await($coroutine);
echo "Result received\n";
?>
```

### Exemple #2 Plusieurs coroutines

```php
<?php
use function Async\spawn;
use function Async\await;

$urls = [
    'https://php.net',
    'https://github.com',
    'https://stackoverflow.com'
];

$coroutines = [];
foreach ($urls as $url) {
    $coroutines[] = spawn(file_get_contents(...), $url);
}

// Toutes les requêtes s'exécutent de manière concurrente
foreach ($coroutines as $coro) {
    $content = await($coro);
    echo "Downloaded: " . strlen($content) . " bytes\n";
}
?>
```

### Exemple #3 Utilisation avec une closure

```php
<?php
use function Async\spawn;
use function Async\await;

$userId = 123;

$coroutine = spawn(function() use ($userId) {
    $userData = file_get_contents("https://api/users/$userId");
    $userOrders = file_get_contents("https://api/orders?user=$userId");

    return [
        'user' => json_decode($userData),
        'orders' => json_decode($userOrders)
    ];
});

$data = await($coroutine);
print_r($data);
?>
```

### Exemple #4 spawn avec Scope

```php
<?php
use function Async\spawn;
use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine 1\n";
});

$scope->spawn(function() {
    echo "Coroutine 2\n";
});

// Attendre que toutes les coroutines du scope soient terminées
$scope->awaitCompletion();
?>
```

### Exemple #5 Passage de paramètres

```php
<?php
use function Async\spawn;
use function Async\await;

function calculateSum(int $a, int $b, int $c): int {
    return $a + $b + $c;
}

$coroutine = spawn(calculateSum(...), 10, 20, 30);
$result = await($coroutine);

echo "Sum: $result\n"; // Sum: 60
?>
```

### Exemple #6 Gestion des erreurs

Une façon de gérer une exception depuis une coroutine est d'utiliser la fonction `await()` :

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    if (rand(0, 1)) {
        throw new Exception("Random error");
    }
    return "Success";
});

try {
    $result = await($coroutine);
    echo $result;
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

## Notes

> **Note :** Les coroutines créées via `spawn()` s'exécutent de manière concurrente, mais pas en parallèle.
> PHP TrueAsync utilise un modèle d'exécution monothread.

> **Note :** Les paramètres sont passés à la coroutine par valeur.
> Pour passer par référence, utilisez une closure avec `use (&$var)`.

## Journal des modifications

| Version  | Description                        |
|----------|------------------------------------|
| 1.0.0    | Ajout de la fonction `spawn()`    |

## Voir aussi

- [await()](/fr/docs/reference/await.html) - Attente du résultat d'une coroutine
- [suspend()](/fr/docs/reference/suspend.html) - Suspension de l'exécution d'une coroutine
