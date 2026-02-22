---
layout: docs
lang: fr
path_key: "/docs/reference/timeout.html"
nav_active: docs
permalink: /fr/docs/reference/timeout.html
page_title: "timeout()"
description: "timeout() — créer un objet timeout pour limiter le temps d'attente."
---

# timeout

(PHP 8.6+, True Async 1.0)

`timeout()` — Crée un objet `Async\Timeout` qui se déclenche après le nombre de millisecondes spécifié.

## Description

```php
timeout(int $ms): Async\Awaitable
```

Crée un minuteur qui lève `Async\TimeoutException` après `$ms` millisecondes.
Utilisé comme limiteur de temps d'attente dans `await()` et d'autres fonctions.

## Paramètres

**`ms`**
Temps en millisecondes. Doit être supérieur à 0.

## Valeurs de retour

Retourne un objet `Async\Timeout` implémentant `Async\Completable`.

## Erreurs/Exceptions

- `ValueError` — si `$ms` <= 0.

## Exemples

### Exemple #1 Timeout sur await()

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use Async\TimeoutException;

$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com');
});

try {
    $result = await($coroutine, timeout(3000));
} catch (TimeoutException $e) {
    echo "Request did not complete within 3 seconds\n";
}
?>
```

### Exemple #2 Timeout sur un groupe de tâches

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail([
        spawn(file_get_contents(...), 'https://api/a'),
        spawn(file_get_contents(...), 'https://api/b'),
    ], timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Not all requests completed within 5 seconds\n";
}
?>
```

### Exemple #3 Annulation d'un timeout

```php
<?php
use function Async\timeout;

$timer = timeout(5000);

// L'opération s'est terminée plus vite — annuler le minuteur
$timer->cancel();
?>
```

## Voir aussi

- [delay()](/fr/docs/reference/delay.html) — Suspension d'une coroutine
- [await()](/fr/docs/reference/await.html) — Attente avec annulation
