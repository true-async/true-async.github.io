---
layout: docs
lang: de
path_key: "/docs/reference/spawn-with.html"
nav_active: docs
permalink: /de/docs/reference/spawn-with.html
page_title: "spawn_with()"
description: "spawn_with() — eine Coroutine in einem bestimmten Scope oder ueber einen ScopeProvider starten."
---

# spawn_with

(PHP 8.6+, True Async 1.0)

`spawn_with()` — Startet eine Funktion in einer neuen Coroutine, die an den angegebenen `Scope` oder `ScopeProvider` gebunden ist.

## Beschreibung

```php
spawn_with(Async\ScopeProvider $provider, callable $task, mixed ...$args): Async\Coroutine
```

Erstellt und startet eine neue Coroutine in dem von `$provider` bereitgestellten Scope. Dies ermoeglicht die explizite Steuerung, in welchem Scope die Coroutine ausgefuehrt wird.

## Parameter

**`provider`**
Ein Objekt, das das `Async\ScopeProvider`-Interface implementiert. Typischerweise ist dies:
- `Async\Scope` — direkt, da `Scope` `ScopeProvider` implementiert
- Eine benutzerdefinierte Klasse, die `ScopeProvider` implementiert
- Ein Objekt, das `SpawnStrategy` fuer Lebenszyklus-Verwaltung implementiert

**`task`**
Eine Funktion oder Closure, die in der Coroutine ausgefuehrt werden soll.

**`args`**
Optionale Parameter, die an `task` uebergeben werden.

## Rueckgabewerte

Gibt ein `Async\Coroutine`-Objekt zurueck, das die gestartete Coroutine repraesentiert.

## Fehler/Ausnahmen

- `Async\AsyncException` — wenn der Scope geschlossen oder abgebrochen ist
- `TypeError` — wenn `$provider` `ScopeProvider` nicht implementiert

## Beispiele

### Beispiel #1 Start in einem bestimmten Scope

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$c1 = spawn_with($scope, function() {
    return file_get_contents('https://php.net');
});

$c2 = spawn_with($scope, function() {
    return file_get_contents('https://github.com');
});

// Auf den Abschluss aller Coroutinen im Scope warten
$scope->awaitCompletion();
?>
```

### Beispiel #2 Vererbter Scope

```php
<?php
use Async\Scope;
use function Async\spawn_with;

$parentScope = new Scope();
$childScope = Scope::inherit($parentScope);

spawn_with($childScope, function() {
    echo "Arbeite im Kind-Scope\n";
});

// Abbruch des Eltern-Scope bricht auch den Kind-Scope ab
$parentScope->cancel();
?>
```

### Beispiel #3 Verwendung mit ScopeProvider

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class WorkerScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
        $this->scope->setExceptionHandler(function(\Throwable $e) {
            error_log("Worker-Fehler: " . $e->getMessage());
        });
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function shutdown(): void
    {
        $this->scope->disposeSafely();
    }
}

$worker = new WorkerScope();

spawn_with($worker, function() {
    // Arbeiten in einem verwalteten Scope
});

$worker->shutdown();
?>
```

### Beispiel #4 Argumente uebergeben

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$coroutine = spawn_with($scope, function(string $url, int $timeout) {
    // Die uebergebenen Argumente verwenden
    return file_get_contents($url);
}, 'https://php.net', 5000);

$result = await($coroutine);
?>
```

## Hinweise

> **Hinweis:** Wenn `ScopeProvider::provideScope()` `null` zurueckgibt, wird die Coroutine im aktuellen Scope erstellt.

> **Hinweis:** Sie koennen keine Coroutine in einem geschlossenen oder abgebrochenen Scope erstellen — es wird eine Ausnahme geworfen.

## Siehe auch

- [spawn()](/de/docs/reference/spawn.html) — eine Coroutine im aktuellen Scope starten
- [Scope](/de/docs/components/scope.html) — Verwaltung der Coroutine-Lebenszeiten
- [Interfaces](/de/docs/components/interfaces.html) — ScopeProvider und SpawnStrategy
