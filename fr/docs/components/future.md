---
layout: docs
lang: fr
path_key: "/docs/components/future.html"
nav_active: docs
permalink: /fr/docs/components/future.html
page_title: "Future"
description: "Future dans TrueAsync -- une promesse de resultat, chaines de transformation map/catch/finally, FutureState et diagnostics."
---

# Future : une promesse de resultat

## Qu'est-ce que Future

`Async\Future` est un objet representant le resultat d'une operation qui peut ne pas etre encore pret.
Future vous permet de :

- Attendre le resultat via `await()` ou `$future->await()`
- Construire des chaines de transformation via `map()`, `catch()`, `finally()`
- Annuler l'operation via `cancel()`
- Creer des Futures deja completes via des methodes statiques de fabrique

Future est similaire a `Promise` en JavaScript, mais integre avec les coroutines TrueAsync.

## Future et FutureState

Future est divise en deux classes avec une separation claire des responsabilites :

- **`FutureState`** -- un conteneur mutable a travers lequel le resultat est ecrit
- **`Future`** -- un wrapper en lecture seule a travers lequel le resultat est lu et transforme

```php
<?php
use Async\Future;
use Async\FutureState;

// Creer FutureState -- il possede l'etat
$state = new FutureState();

// Creer Future -- il fournit l'acces au resultat
$future = new Future($state);

// Passer $future au consommateur
// Passer $state au producteur

// Le producteur complete l'operation
$state->complete(42);

// Le consommateur obtient le resultat
$result = $future->await(); // 42
?>
```

Cette separation garantit que le consommateur ne peut pas accidentellement completer le Future -- seul le detenteur de `FutureState` en a le droit.

## Creer un Future

### Via FutureState

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

$state = new FutureState();
$future = new Future($state);

// Completer dans une autre coroutine
spawn(function() use ($state) {
    $data = file_get_contents('https://api.example.com/data');
    $state->complete(json_decode($data, true));
});

$result = $future->await();
?>
```

### Methodes statiques de fabrique

Pour creer des Futures deja completes :

```php
<?php
use Async\Future;

// Future complete avec succes
$future = Future::completed(42);
$result = $future->await(); // 42

// Future avec une erreur
$future = Future::failed(new \RuntimeException('Une erreur est survenue'));
$result = $future->await(); // lance RuntimeException
?>
```

## Chaines de transformation

Future supporte trois methodes de transformation, fonctionnant de maniere similaire a Promise en JavaScript :

### map() -- Transformer le resultat

Appelee uniquement en cas de completion reussie. Retourne un nouveau Future avec le resultat transforme :

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$doubled = $future->map(fn($value) => $value * 2);
$asString = $doubled->map(fn($value) => "Resultat : $value");

$state->complete(21);

echo $asString->await(); // "Resultat : 42"
?>
```

### catch() -- Gestion des erreurs

Appelee uniquement en cas d'erreur. Permet la recuperation apres une exception :

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$safe = $future->catch(function(\Throwable $e) {
    return 'Valeur par defaut';
});

$state->error(new \RuntimeException('Erreur'));

echo $safe->await(); // "Valeur par defaut"
?>
```

### finally() -- Execution quel que soit le resultat

Toujours appelee -- en cas de succes comme d'erreur. Le resultat du Future parent est transmis tel quel au Future enfant :

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$withCleanup = $future->finally(function($resultOrException) {
    // Liberer les ressources
    echo "Operation terminee\n";
});

$state->complete('data');

echo $withCleanup->await(); // "data" (le resultat est transmis tel quel)
?>
```

### Chaines composites

```php
<?php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(fn($data) => json_decode($data, true))
    ->map(fn($parsed) => $parsed['name'] ?? 'Inconnu')
    ->catch(fn(\Throwable $e) => 'Erreur : ' . $e->getMessage())
    ->finally(function($value) {
        // Journalisation
    });

$state->complete('{"name": "PHP"}');
echo $result->await(); // "PHP"
?>
```

### Abonnes independants

Chaque appel a `map()` sur le meme Future cree une chaine **independante**. Les abonnes ne s'affectent pas mutuellement :

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

// Deux chaines independantes depuis le meme Future
$doubled = $future->map(fn($x) => $x * 2);
$tripled = $future->map(fn($x) => $x * 3);

$state->complete(10);

echo await($doubled) . "\n"; // 20
echo await($tripled) . "\n"; // 30
?>
```

### Propagation des erreurs dans les chaines

Si le Future source se complete avec une erreur, `map()` est **ignore**, et l'erreur est passee directement a `catch()` :

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($value) {
        echo "Ce code ne s'executera pas\n";
        return $value;
    })
    ->catch(function(\Throwable $e) {
        return 'Recupere : ' . $e->getMessage();
    });

$state->error(new \RuntimeException('Erreur source'));

echo await($result) . "\n"; // "Recupere : Erreur source"
?>
```

Si une exception survient **a l'interieur** de `map()`, elle est interceptee par le `catch()` suivant :

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\await;

$state = new FutureState();
$future = new Future($state);

$result = $future
    ->map(function($x) {
        throw new \RuntimeException('Erreur dans map');
    })
    ->catch(function(\Throwable $e) {
        return 'Intercepte : ' . $e->getMessage();
    });

$state->complete(42);

echo await($result) . "\n"; // "Intercepte : Erreur dans map"
?>
```

## Attendre le resultat

### Via la fonction await()

```php
<?php
use function Async\await;

$result = await($future);
```

### Via la methode $future->await()

```php
<?php
$result = $future->await();

// Avec un timeout d'annulation
$result = $future->await(Async\timeout(5000));
```

## Annuler un Future

```php
<?php
use Async\AsyncCancellation;

// Annuler avec le message par defaut
$future->cancel();

// Annuler avec une erreur personnalisee
$future->cancel(new AsyncCancellation('L\'operation n\'est plus necessaire'));
```

## Suppression des avertissements : ignore()

Si un Future n'est pas utilise (ni `await()`, `map()`, `catch()` ni `finally()` n'a ete appele), TrueAsync emettra un avertissement.
Pour supprimer explicitement cet avertissement :

```php
<?php
$future->ignore();
```

De plus, si un Future s'est complete avec une erreur et que cette erreur n'a pas ete geree, TrueAsync avertira a ce sujet. `ignore()` supprime egalement cet avertissement.

## FutureState : completer l'operation

### complete() -- Completion reussie

```php
<?php
$state->complete($result);
```

### error() -- Completion avec une erreur

```php
<?php
$state->error(new \RuntimeException('Erreur'));
```

### Contraintes

- `complete()` et `error()` ne peuvent etre appeles qu'**une seule fois**. Un appel repete lancera `AsyncException`.
- Apres l'appel de `complete()` ou `error()`, l'etat du Future est immuable.

```php
<?php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

## Diagnostics

Les deux classes (`Future` et `FutureState`) fournissent des methodes de diagnostic :

```php
<?php
// Verifier l'etat
$future->isCompleted(); // bool
$future->isCancelled(); // bool

// Ou le Future a ete cree
$future->getCreatedFileAndLine();  // [string $file, int $line]
$future->getCreatedLocation();     // "file.php:42"

// Ou le Future a ete complete
$future->getCompletedFileAndLine(); // [string|null $file, int $line]
$future->getCompletedLocation();    // "file.php:55" ou "unknown"

// Informations d'attente
$future->getAwaitingInfo(); // array
```

## Exemple pratique : client HTTP

```php
<?php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function httpGet(string $url): Future {
    $state = new FutureState();
    $future = new Future($state);

    spawn(function() use ($state, $url) {
        try {
            $response = file_get_contents($url);
            $state->complete($response);
        } catch (\Throwable $e) {
            $state->error($e);
        }
    });

    return $future;
}

// Utilisation
$userFuture = httpGet('https://api.example.com/user/1')
    ->map(fn($json) => json_decode($json, true))
    ->catch(fn($e) => ['error' => $e->getMessage()]);

$result = $userFuture->await();
?>
```

## Voir aussi

- [await()](/fr/docs/reference/await.html) -- attente de completion
- [Coroutines](/fr/docs/components/coroutines.html) -- l'unite de base de la concurrence
- [Annulation](/fr/docs/components/cancellation.html) -- le mecanisme d'annulation
