---
layout: docs
lang: fr
path_key: "/docs/components/exceptions.html"
nav_active: docs
permalink: /fr/docs/components/exceptions.html
page_title: "Exceptions"
description: "Hierarchie des exceptions TrueAsync -- AsyncCancellation, TimeoutException, DeadlockError et autres."
---

# Exceptions

## Hierarchie

TrueAsync definit une hierarchie d'exceptions specialisee pour differents types d'erreurs :

```
\Cancellation                              -- classe de base d'annulation (au meme rang que \Error et \Exception)
+-- Async\AsyncCancellation                -- annulation de coroutine

\Error
+-- Async\DeadlockError                    -- interblocage detecte

\Exception
+-- Async\AsyncException                   -- erreur generale d'operation asynchrone
|   +-- Async\ServiceUnavailableException  -- service indisponible (circuit breaker)
+-- Async\InputOutputException             -- erreur d'E/S
+-- Async\DnsException                     -- erreur de resolution DNS
+-- Async\TimeoutException                 -- timeout d'operation
+-- Async\PollException                    -- erreur d'operation poll
+-- Async\ChannelException                 -- erreur de channel
+-- Async\PoolException                    -- erreur de pool de ressources
+-- Async\CompositeException               -- conteneur pour exceptions multiples
```

## AsyncCancellation

```php
class Async\AsyncCancellation extends \Cancellation {}
```

Lancee lorsqu'une coroutine est annulee. `\Cancellation` est la troisieme classe racine `Throwable` au meme rang que `\Error` et `\Exception`, donc les blocs habituels `catch (\Exception $e)` et `catch (\Error $e)` n'interceptent **pas** accidentellement l'annulation.

```php
<?php
use Async\AsyncCancellation;
use function Async\spawn;
use function Async\await;
use function Async\delay;

$coroutine = spawn(function() {
    try {
        delay(10000);
    } catch (AsyncCancellation $e) {
        // Terminer gracieusement le travail
        echo "Annule : " . $e->getMessage() . "\n";
    }
});

delay(100);
$coroutine->cancel();
?>
```

**Important :** N'interceptez pas `AsyncCancellation` via `catch (\Throwable $e)` sans la relancer -- cela viole le mecanisme d'annulation cooperative.

## DeadlockError

```php
class Async\DeadlockError extends \Error {}
```

Lancee lorsque l'ordonnanceur detecte un interblocage -- une situation ou des coroutines s'attendent mutuellement et aucune ne peut progresser.

```php
<?php
use function Async\spawn;
use function Async\await;

// Interblocage classique : deux coroutines s'attendent mutuellement
$c1 = spawn(function() use (&$c2) {
    await($c2); // attend c2
});

$c2 = spawn(function() use (&$c1) {
    await($c1); // attend c1
});
// DeadlockError: A deadlock was detected
?>
```

Exemple ou une coroutine s'attend elle-meme :

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() use (&$coroutine) {
    await($coroutine); // s'attend elle-meme
});
// DeadlockError
?>
```

## AsyncException

```php
class Async\AsyncException extends \Exception {}
```

Exception de base pour les erreurs generales d'operations asynchrones. Utilisee pour les erreurs qui n'entrent pas dans les categories specialisees.

## TimeoutException

```php
class Async\TimeoutException extends \Exception {}
```

Lancee lorsqu'un timeout est depasse. Creee automatiquement lorsque `timeout()` se declenche :

```php
<?php
use Async\TimeoutException;
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use function Async\delay;

try {
    $coroutine = spawn(function() {
        delay(10000); // Operation longue
    });
    await($coroutine, timeout(1000)); // Timeout de 1 seconde
} catch (TimeoutException $e) {
    echo "L'operation ne s'est pas terminee a temps\n";
}
?>
```

## InputOutputException

```php
class Async\InputOutputException extends \Exception {}
```

Exception generale pour les erreurs d'E/S : sockets, fichiers, pipes et autres descripteurs d'E/S.

## DnsException

```php
class Async\DnsException extends \Exception {}
```

Lancee lors d'erreurs de resolution DNS (`gethostbyname`, `gethostbyaddr`, `gethostbynamel`).

## PollException

```php
class Async\PollException extends \Exception {}
```

Lancee lors d'erreurs d'operations poll sur les descripteurs.

## ServiceUnavailableException

```php
class Async\ServiceUnavailableException extends Async\AsyncException {}
```

Lancee lorsque le circuit breaker est dans l'etat `INACTIVE` et qu'une requete de service est rejetee sans tentative d'execution.

```php
<?php
use Async\ServiceUnavailableException;

try {
    $resource = $pool->acquire();
} catch (ServiceUnavailableException $e) {
    echo "Le service est temporairement indisponible\n";
}
?>
```

## ChannelException

```php
class Async\ChannelException extends Async\AsyncException {}
```

Lancee lors d'erreurs d'operation sur les channels : envoi vers un channel ferme, reception depuis un channel ferme, etc.

## PoolException

```php
class Async\PoolException extends Async\AsyncException {}
```

Lancee lors d'erreurs d'operation sur le pool de ressources.

## CompositeException

```php
final class Async\CompositeException extends \Exception
{
    public function addException(\Throwable $exception): void;
    public function getExceptions(): array;
}
```

Un conteneur pour exceptions multiples. Utilise lorsque plusieurs gestionnaires (par ex., `finally` dans Scope) lancent des exceptions lors de la completion :

```php
<?php
use Async\Scope;
use Async\CompositeException;

$scope = new Scope();

$scope->finally(function() {
    throw new \Exception('Erreur de nettoyage 1');
});

$scope->finally(function() {
    throw new \RuntimeException('Erreur de nettoyage 2');
});

$scope->setExceptionHandler(function($scope, $coroutine, $exception) {
    if ($exception instanceof CompositeException) {
        echo "Erreurs : " . count($exception->getExceptions()) . "\n";
        foreach ($exception->getExceptions() as $e) {
            echo "  - " . $e->getMessage() . "\n";
        }
    }
});

$scope->dispose();
// Erreurs : 2
//   - Erreur de nettoyage 1
//   - Erreur de nettoyage 2
?>
```

## Recommandations

### Gestion correcte de AsyncCancellation

```php
<?php
// Correct : intercepter les exceptions specifiques
try {
    await($coroutine);
} catch (\Exception $e) {
    // AsyncCancellation ne sera PAS interceptee ici -- c'est \Cancellation
    handleError($e);
}
```

```php
<?php
// Si vous devez tout intercepter -- toujours relancer AsyncCancellation
try {
    await($coroutine);
} catch (Async\AsyncCancellation $e) {
    throw $e; // Relancer
} catch (\Throwable $e) {
    handleError($e);
}
```

### Protection des sections critiques

Utilisez `protect()` pour les operations qui ne doivent pas etre interrompues par l'annulation :

```php
<?php
use function Async\protect;

$db->beginTransaction();

protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
});
```

## Voir aussi

- [Annulation](/fr/docs/components/cancellation.html) -- le mecanisme d'annulation des coroutines
- [protect()](/fr/docs/reference/protect.html) -- protection contre l'annulation
- [Scope](/fr/docs/components/scope.html) -- gestion des exceptions dans les scopes
