---
layout: docs
lang: de
path_key: "/docs/components/interfaces.html"
nav_active: docs
permalink: /de/docs/components/interfaces.html
page_title: "Interfaces"
description: "Basis-Interfaces von TrueAsync -- Awaitable, Completable, Timeout, ScopeProvider und SpawnStrategy."
---

# Basis-Interfaces

## Awaitable

```php
interface Async\Awaitable {}
```

Ein Marker-Interface für alle Objekte, auf die gewartet werden kann. Enthält keine Methoden -- dient zur Typprüfung.
Awaitable-Objekte können ihren Zustand mehrfach ändern, das heißt sie sind `multiple-shot`-Objekte.

Implementiert von: `Coroutine`, `Future`, `Channel`, `Timeout`.

## Completable

```php
interface Async\Completable extends Async\Awaitable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Erweitert `Awaitable`. `Async\Completable`-Objekte ändern ihren Zustand nur einmal (`one-shot`).

Implementiert von: `Coroutine`, `Future`, `Timeout`.

### cancel()

Bricht das Objekt ab. Der optionale Parameter `$cancellation` ermöglicht die Übergabe eines spezifischen Abbruchfehlers.

### isCompleted()

Gibt `true` zurück, wenn das Objekt bereits abgeschlossen wurde (erfolgreich oder mit einem Fehler).

### isCancelled()

Gibt `true` zurück, wenn das Objekt abgebrochen wurde.

## Timeout

```php
final class Async\Timeout implements Async\Completable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

Ein Timeout-Objekt. Wird über die Funktion `timeout()` erstellt:

```php
<?php
use function Async\timeout;
use function Async\await;

// Einen 5-Sekunden-Timeout erstellen
$timer = timeout(5000);

// Als Wartebegrenzung verwenden
$result = await($coroutine, $timer);
```

`Timeout` kann nicht über `new` erstellt werden -- nur über `timeout()`.

Wenn der Timeout ausgelöst wird, wird `Async\TimeoutException` geworfen.

### Timeout abbrechen

Wenn der Timeout nicht mehr benötigt wird, kann er abgebrochen werden:

```php
<?php
$timer = timeout(5000);

// ... Operation wurde schneller abgeschlossen
$timer->cancel(); // Timer freigeben
```

## ScopeProvider

```php
interface Async\ScopeProvider
{
    public function provideScope(): ?Scope;
}
```

Ein Interface, das die Bereitstellung eines `Scope` für die Erstellung von Koroutinen ermöglicht. Wird mit `spawn_with()` verwendet:

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class RequestScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }
}

$provider = new RequestScope();
$coroutine = spawn_with($provider, function() {
    echo "Arbeite im bereitgestellten Scope\n";
});
?>
```

Wenn `provideScope()` `null` zurückgibt, wird die Koroutine im aktuellen Scope erstellt.

## SpawnStrategy

```php
interface Async\SpawnStrategy extends Async\ScopeProvider
{
    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array;
    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void;
}
```

Erweitert `ScopeProvider` um Lebenszyklus-Hooks -- ermöglicht die Ausführung von Code vor und nach dem Einreihen einer Koroutine.

### beforeCoroutineEnqueue()

Wird **vor** dem Hinzufügen der Koroutine zur Scheduler-Warteschlange aufgerufen. Gibt ein Array von Parametern zurück.

### afterCoroutineEnqueue()

Wird **nach** dem Hinzufügen der Koroutine zur Warteschlange aufgerufen.

```php
<?php
use Async\SpawnStrategy;
use Async\Coroutine;
use Async\Scope;
use function Async\spawn_with;

class LoggingStrategy implements SpawnStrategy
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array
    {
        echo "Koroutine #{$coroutine->getId()} wird erstellt\n";
        return [];
    }

    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void
    {
        echo "Koroutine #{$coroutine->getId()} zur Warteschlange hinzugefügt\n";
    }
}

$strategy = new LoggingStrategy();
spawn_with($strategy, function() {
    echo "Wird ausgeführt\n";
});
?>
```

## CircuitBreaker und CircuitBreakerStrategy

Diese Interfaces werden in der Dokumentation zu [Async\Pool](/de/docs/components/pool.html) beschrieben.

## Siehe auch

- [Koroutinen](/de/docs/components/coroutines.html) -- die grundlegende Einheit der Nebenläufigkeit
- [Scope](/de/docs/components/scope.html) -- Verwaltung der Koroutinen-Lebensdauer
- [Future](/de/docs/components/future.html) -- ein Ergebnisversprechen
- [spawn_with()](/de/docs/reference/spawn-with.html) -- Starten einer Koroutine mit einem Provider
