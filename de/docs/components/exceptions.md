---
layout: docs
lang: de
path_key: "/docs/components/exceptions.html"
nav_active: docs
permalink: /de/docs/components/exceptions.html
page_title: "Exceptions"
description: "TrueAsync Exception-Hierarchie -- AsyncCancellation, TimeoutException, DeadlockError und andere."
---

# Exceptions

## Hierarchie

TrueAsync definiert eine spezialisierte Exception-Hierarchie für verschiedene Fehlertypen:

```
\Cancellation                              -- Basis-Abbruchklasse (gleichrangig mit \Error und \Exception)
+-- Async\AsyncCancellation                -- Coroutine-Abbruch

\Error
+-- Async\DeadlockError                    -- Deadlock erkannt

\Exception
+-- Async\AsyncException                   -- allgemeiner Fehler bei asynchroner Operation
|   +-- Async\ServiceUnavailableException  -- Dienst nicht verfügbar (Circuit Breaker)
+-- Async\InputOutputException             -- I/O-Fehler
+-- Async\DnsException                     -- DNS-Auflösungsfehler
+-- Async\TimeoutException                 -- Zeitüberschreitung bei Operation
+-- Async\PollException                    -- Poll-Operationsfehler
+-- Async\ChannelException                 -- Channel-Fehler
+-- Async\PoolException                    -- Ressourcenpool-Fehler
+-- Async\CompositeException               -- Container für mehrere Exceptions
```

## AsyncCancellation

```php
class Async\AsyncCancellation extends \Cancellation {}
```

Wird geworfen, wenn eine Coroutine abgebrochen wird. `\Cancellation` ist die dritte Wurzel-`Throwable`-Klasse gleichrangig mit `\Error` und `\Exception`, sodass reguläre `catch (\Exception $e)`- und `catch (\Error $e)`-Blöcke den Abbruch **nicht** versehentlich abfangen.

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
        // Arbeit sauber beenden
        echo "Abgebrochen: " . $e->getMessage() . "\n";
    }
});

delay(100);
$coroutine->cancel();
?>
```

**Wichtig:** Fangen Sie `AsyncCancellation` nicht über `catch (\Throwable $e)` ab, ohne sie erneut zu werfen -- dies verletzt den kooperativen Abbruchmechanismus.

## DeadlockError

```php
class Async\DeadlockError extends \Error {}
```

Wird geworfen, wenn der Scheduler einen Deadlock erkennt -- eine Situation, in der Coroutinen aufeinander warten und keine fortfahren kann.

```php
<?php
use function Async\spawn;
use function Async\await;

// Klassischer Deadlock: Zwei Coroutinen warten aufeinander
$c1 = spawn(function() use (&$c2) {
    await($c2); // wartet auf c2
});

$c2 = spawn(function() use (&$c1) {
    await($c1); // wartet auf c1
});
// DeadlockError: A deadlock was detected
?>
```

Beispiel, bei dem eine Coroutine auf sich selbst wartet:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() use (&$coroutine) {
    await($coroutine); // wartet auf sich selbst
});
// DeadlockError
?>
```

## AsyncException

```php
class Async\AsyncException extends \Exception {}
```

Basis-Exception für allgemeine Fehler bei asynchronen Operationen. Wird für Fehler verwendet, die nicht in spezialisierte Kategorien fallen.

## TimeoutException

```php
class Async\TimeoutException extends \Exception {}
```

Wird geworfen, wenn eine Zeitüberschreitung überschritten wird. Wird automatisch erstellt, wenn `timeout()` auslöst:

```php
<?php
use Async\TimeoutException;
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use function Async\delay;

try {
    $coroutine = spawn(function() {
        delay(10000); // Lange Operation
    });
    await($coroutine, timeout(1000)); // 1 Sekunde Zeitlimit
} catch (TimeoutException $e) {
    echo "Operation wurde nicht rechtzeitig abgeschlossen\n";
}
?>
```

## InputOutputException

```php
class Async\InputOutputException extends \Exception {}
```

Allgemeine Exception für I/O-Fehler: Sockets, Dateien, Pipes und andere I/O-Deskriptoren.

## DnsException

```php
class Async\DnsException extends \Exception {}
```

Wird bei DNS-Auflösungsfehlern geworfen (`gethostbyname`, `gethostbyaddr`, `gethostbynamel`).

## PollException

```php
class Async\PollException extends \Exception {}
```

Wird bei Poll-Operationsfehlern auf Deskriptoren geworfen.

## ServiceUnavailableException

```php
class Async\ServiceUnavailableException extends Async\AsyncException {}
```

Wird geworfen, wenn der Circuit Breaker im Zustand `INACTIVE` ist und eine Dienstanfrage ohne Ausführungsversuch abgelehnt wird.

```php
<?php
use Async\ServiceUnavailableException;

try {
    $resource = $pool->acquire();
} catch (ServiceUnavailableException $e) {
    echo "Dienst ist vorübergehend nicht verfügbar\n";
}
?>
```

## ChannelException

```php
class Async\ChannelException extends Async\AsyncException {}
```

Wird bei Channel-Operationsfehlern geworfen: Senden an einen geschlossenen Channel, Empfangen von einem geschlossenen Channel usw.

## PoolException

```php
class Async\PoolException extends Async\AsyncException {}
```

Wird bei Fehlern bei Ressourcenpool-Operationen geworfen.

## CompositeException

```php
final class Async\CompositeException extends \Exception
{
    public function addException(\Throwable $exception): void;
    public function getExceptions(): array;
}
```

Ein Container für mehrere Exceptions. Wird verwendet, wenn mehrere Handler (z.B. `finally` im Scope) während der Fertigstellung Exceptions werfen:

```php
<?php
use Async\Scope;
use Async\CompositeException;

$scope = new Scope();

$scope->finally(function() {
    throw new \Exception('Aufräumfehler 1');
});

$scope->finally(function() {
    throw new \RuntimeException('Aufräumfehler 2');
});

$scope->setExceptionHandler(function($scope, $coroutine, $exception) {
    if ($exception instanceof CompositeException) {
        echo "Fehler: " . count($exception->getExceptions()) . "\n";
        foreach ($exception->getExceptions() as $e) {
            echo "  - " . $e->getMessage() . "\n";
        }
    }
});

$scope->dispose();
// Fehler: 2
//   - Aufräumfehler 1
//   - Aufräumfehler 2
?>
```

## Empfehlungen

### AsyncCancellation richtig behandeln

```php
<?php
// Korrekt: spezifische Exceptions abfangen
try {
    await($coroutine);
} catch (\Exception $e) {
    // AsyncCancellation wird hier NICHT abgefangen -- es ist \Cancellation
    handleError($e);
}
```

```php
<?php
// Wenn Sie alles abfangen müssen -- AsyncCancellation immer erneut werfen
try {
    await($coroutine);
} catch (Async\AsyncCancellation $e) {
    throw $e; // Erneut werfen
} catch (\Throwable $e) {
    handleError($e);
}
```

### Kritische Abschnitte schützen

Verwenden Sie `protect()` für Operationen, die nicht durch einen Abbruch unterbrochen werden dürfen:

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

## Siehe auch

- [Cancellation](/de/docs/components/cancellation.html) -- der Mechanismus zum Abbrechen von Coroutinen
- [protect()](/de/docs/reference/protect.html) -- Schutz vor Abbruch
- [Scope](/de/docs/components/scope.html) -- Fehlerbehandlung in Scopes
