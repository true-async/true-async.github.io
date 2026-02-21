---
layout: docs
lang: it
path_key: "/docs/components/exceptions.html"
nav_active: docs
permalink: /it/docs/components/exceptions.html
page_title: "Eccezioni"
description: "Gerarchia delle eccezioni di TrueAsync -- AsyncCancellation, TimeoutException, DeadlockError e altre."
---

# Eccezioni

## Gerarchia

TrueAsync definisce una gerarchia specializzata di eccezioni per diversi tipi di errori:

```
\Cancellation                              -- classe base di cancellazione (alla pari con \Error e \Exception)
+-- Async\AsyncCancellation                -- cancellazione della coroutine

\Error
+-- Async\DeadlockError                    -- deadlock rilevato

\Exception
+-- Async\AsyncException                   -- errore generico di operazione asincrona
|   +-- Async\ServiceUnavailableException  -- servizio non disponibile (circuit breaker)
+-- Async\InputOutputException             -- errore di I/O
+-- Async\DnsException                     -- errore di risoluzione DNS
+-- Async\TimeoutException                 -- timeout dell'operazione
+-- Async\PollException                    -- errore di operazione poll
+-- Async\ChannelException                 -- errore del canale
+-- Async\PoolException                    -- errore del pool di risorse
+-- Async\CompositeException               -- contenitore per eccezioni multiple
```

## AsyncCancellation

```php
class Async\AsyncCancellation extends \Cancellation {}
```

Lanciata quando una coroutine viene cancellata. `\Cancellation` è la terza classe root `Throwable` alla pari con `\Error` e `\Exception`, quindi i normali blocchi `catch (\Exception $e)` e `catch (\Error $e)` **non** intercettano accidentalmente la cancellazione.

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
        // Termina il lavoro in modo pulito
        echo "Cancellata: " . $e->getMessage() . "\n";
    }
});

delay(100);
$coroutine->cancel();
?>
```

**Importante:** Non catturare `AsyncCancellation` tramite `catch (\Throwable $e)` senza rilanciarla -- questo viola il meccanismo di cancellazione cooperativa.

## DeadlockError

```php
class Async\DeadlockError extends \Error {}
```

Lanciata quando lo scheduler rileva un deadlock -- una situazione in cui le coroutine si attendono a vicenda e nessuna può procedere.

```php
<?php
use function Async\spawn;
use function Async\await;

// Deadlock classico: due coroutine si attendono a vicenda
$c1 = spawn(function() use (&$c2) {
    await($c2); // attende c2
});

$c2 = spawn(function() use (&$c1) {
    await($c1); // attende c1
});
// DeadlockError: A deadlock was detected
?>
```

Esempio in cui una coroutine attende se stessa:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() use (&$coroutine) {
    await($coroutine); // attende se stessa
});
// DeadlockError
?>
```

## AsyncException

```php
class Async\AsyncException extends \Exception {}
```

Eccezione base per errori generici delle operazioni asincrone. Usata per errori che non rientrano nelle categorie specializzate.

## TimeoutException

```php
class Async\TimeoutException extends \Exception {}
```

Lanciata quando un timeout viene superato. Creata automaticamente quando `timeout()` scatta:

```php
<?php
use Async\TimeoutException;
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use function Async\delay;

try {
    $coroutine = spawn(function() {
        delay(10000); // Operazione lunga
    });
    await($coroutine, timeout(1000)); // Timeout di 1 secondo
} catch (TimeoutException $e) {
    echo "L'operazione non è stata completata in tempo\n";
}
?>
```

## InputOutputException

```php
class Async\InputOutputException extends \Exception {}
```

Eccezione generica per errori di I/O: socket, file, pipe e altri descrittori di I/O.

## DnsException

```php
class Async\DnsException extends \Exception {}
```

Lanciata in caso di errori di risoluzione DNS (`gethostbyname`, `gethostbyaddr`, `gethostbynamel`).

## PollException

```php
class Async\PollException extends \Exception {}
```

Lanciata in caso di errori nelle operazioni di poll sui descrittori.

## ServiceUnavailableException

```php
class Async\ServiceUnavailableException extends Async\AsyncException {}
```

Lanciata quando il circuit breaker è nello stato `INACTIVE` e una richiesta al servizio viene rifiutata senza tentare l'esecuzione.

```php
<?php
use Async\ServiceUnavailableException;

try {
    $resource = $pool->acquire();
} catch (ServiceUnavailableException $e) {
    echo "Il servizio è temporaneamente non disponibile\n";
}
?>
```

## ChannelException

```php
class Async\ChannelException extends Async\AsyncException {}
```

Lanciata in caso di errori nelle operazioni del canale: invio a un canale chiuso, ricezione da un canale chiuso, ecc.

## PoolException

```php
class Async\PoolException extends Async\AsyncException {}
```

Lanciata in caso di errori nelle operazioni del pool di risorse.

## CompositeException

```php
final class Async\CompositeException extends \Exception
{
    public function addException(\Throwable $exception): void;
    public function getExceptions(): array;
}
```

Un contenitore per eccezioni multiple. Usata quando diversi handler (es. `finally` nello Scope) lanciano eccezioni durante il completamento:

```php
<?php
use Async\Scope;
use Async\CompositeException;

$scope = new Scope();

$scope->finally(function() {
    throw new \Exception('Errore di pulizia 1');
});

$scope->finally(function() {
    throw new \RuntimeException('Errore di pulizia 2');
});

$scope->setExceptionHandler(function($scope, $coroutine, $exception) {
    if ($exception instanceof CompositeException) {
        echo "Errori: " . count($exception->getExceptions()) . "\n";
        foreach ($exception->getExceptions() as $e) {
            echo "  - " . $e->getMessage() . "\n";
        }
    }
});

$scope->dispose();
// Errori: 2
//   - Errore di pulizia 1
//   - Errore di pulizia 2
?>
```

## Raccomandazioni

### Gestire Correttamente AsyncCancellation

```php
<?php
// Corretto: catturare eccezioni specifiche
try {
    await($coroutine);
} catch (\Exception $e) {
    // AsyncCancellation NON verrà catturata qui -- è \Cancellation
    handleError($e);
}
```

```php
<?php
// Se devi catturare tutto -- rilancia sempre AsyncCancellation
try {
    await($coroutine);
} catch (Async\AsyncCancellation $e) {
    throw $e; // Rilancia
} catch (\Throwable $e) {
    handleError($e);
}
```

### Protezione delle Sezioni Critiche

Usa `protect()` per operazioni che non devono essere interrotte dalla cancellazione:

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

## Vedi Anche

- [Cancellazione](/it/docs/components/cancellation.html) -- il meccanismo di cancellazione delle coroutine
- [protect()](/it/docs/reference/protect.html) -- protezione dalla cancellazione
- [Scope](/it/docs/components/scope.html) -- gestione delle eccezioni negli scope
