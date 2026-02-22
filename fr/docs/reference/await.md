---
layout: docs
lang: fr
path_key: "/docs/reference/await.html"
nav_active: docs
permalink: /fr/docs/reference/await.html
page_title: "await()"
description: "await() — attente de l'achèvement d'une coroutine ou d'un Future. Documentation complète : paramètres, exceptions, exemples."
---

# await

(PHP 8.6+, True Async 1.0)

`await()` — Attend l'achèvement d'une coroutine, d'un `Async\Future` ou de tout autre `Async\Completable`.
Retourne le résultat ou lève une exception.

## Description

```php
await(Async\Completable $awaitable, ?Async\Completable $cancellation = null): mixed
```

Suspend l'exécution de la coroutine courante jusqu'à ce que le `Async\Completable` `$awaitable` spécifié soit terminé (ou jusqu'à ce que `$cancellation` se déclenche, si fourni) et retourne le résultat.
Si l'`awaitable` est déjà terminé, le résultat est retourné immédiatement.

Si la coroutine s'est terminée avec une exception, celle-ci sera propagée au code appelant.

## Paramètres

**`awaitable`**
Un objet implémentant l'interface `Async\Completable` (étend `Async\Awaitable`). Typiquement :
- `Async\Coroutine` - le résultat de l'appel à `spawn()`
- `Async\TaskGroup` - un groupe de tâches
- `Async\Future` - une valeur future

**`cancellation`**
Un objet `Async\Completable` optionnel ; lorsqu'il se termine, l'attente sera annulée.

## Valeurs de retour

Retourne la valeur que la coroutine a retournée. Le type de retour dépend de la coroutine.

## Erreurs/Exceptions

Si la coroutine s'est terminée avec une exception, `await()` relancera cette exception.

Si la coroutine a été annulée, `Async\AsyncCancellation` sera levée.

## Exemples

### Exemple #1 Utilisation basique de await()

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "Hello, Async!";
});

echo await($coroutine); // Hello, Async!
?>
```

### Exemple #2 Attente séquentielle

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchUser(int $id): array {
    return json_decode(
        file_get_contents("https://api/users/$id"),
        true
    );
}

function fetchPosts(int $userId): array {
    return json_decode(
        file_get_contents("https://api/posts?user=$userId"),
        true
    );
}

$userCoro = spawn(fetchUser(...), 123);
$user = await($userCoro);

$postsCoro = spawn(fetchPosts(...), $user['id']);
$posts = await($postsCoro);

echo "User: {$user['name']}\n";
echo "Posts: " . count($posts) . "\n";
?>
```

### Exemple #3 Gestion des exceptions

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $response = file_get_contents('https://api.com/data');

    if ($response === false) {
        throw new RuntimeException("Failed to fetch data");
    }

    return $response;
});

try {
    $data = await($coroutine);
    echo "Data received\n";
} catch (RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

### Exemple #4 await avec TaskGroup

```php
<?php
use function Async\spawn;
use function Async\await;
use Async\TaskGroup;

$taskGroup = new TaskGroup();

$taskGroup->spawn(function() {
    return "Result 1";
});

$taskGroup->spawn(function() {
    return "Result 2";
});

$taskGroup->spawn(function() {
    return "Result 3";
});

// Obtenir un tableau de tous les résultats
$results = await($taskGroup);
print_r($results); // Array of results
?>
```

### Exemple #5 Plusieurs await sur la même coroutine

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\timeout(1000);
    return "Done";
});

// Le premier await attendra le résultat
$result1 = await($coroutine);
echo "$result1\n";

// Les await suivants retournent le résultat instantanément
$result2 = await($coroutine);
echo "$result2\n";

var_dump($result1 === $result2); // true
?>
```

### Exemple #6 await à l'intérieur d'une coroutine

```php
<?php
use function Async\spawn;
use function Async\await;

spawn(function() {
    echo "Parent coroutine started\n";

    $child = spawn(function() {
        echo "Child coroutine running\n";
        Async\sleep(1000);
        return "Result from child";
    });

    echo "Waiting for child...\n";
    $result = await($child);
    echo "Received: $result\n";
});

echo "Main code continues\n";
?>
```

## Journal des modifications

| Version  | Description                        |
|----------|------------------------------------|
| 1.0.0    | Ajout de la fonction `await()`    |

## Voir aussi

- [spawn()](/fr/docs/reference/spawn.html) - Lancement d'une coroutine
- [suspend()](/fr/docs/reference/suspend.html) - Suspension de l'exécution
